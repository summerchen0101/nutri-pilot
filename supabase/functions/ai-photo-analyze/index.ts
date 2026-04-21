/**
 * QStash → food-photos → Claude Vision → photo_analysis_jobs.result_json（餐桌餐點）
 * Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

import { anthropicVision } from "../_shared/anthropic-vision.ts";
import { PHOTO_ANALYZE_PROMPT } from "../_shared/photo-analyze-prompt.ts";
import { mediaTypeFromPath, toBase64 } from "../_shared/image-utils.ts";

interface PhotoItem {
  name: string;
  quantity_g: number;
  quantity_description: string;
  calories: number;
  carb_g: number;
  protein_g: number;
  fat_g: number;
  fiber_g: number | null;
  sodium_mg: number | null;
  confidence: "high" | "medium" | "low";
  note: string | null;
}

function normalizeConfidence(v: unknown): "high" | "medium" | "low" {
  if (v === "high" || v === "medium" || v === "low") return v;
  return "medium";
}

function normalizePhotoRow(o: Record<string, unknown>): PhotoItem | null {
  const name = String(o.name ?? "").trim();
  if (!name.length) return null;

  const quantity_g = Math.round(Number(o.quantity_g ?? 0));
  const qDesc = String(o.quantity_description ?? "").trim();
  const quantity_description =
    qDesc || (quantity_g > 0 ? `${quantity_g}g` : "1份");

  let fiberRaw = o.fiber_g;
  if (fiberRaw === undefined) fiberRaw = null;
  let sodiumRaw = o.sodium_mg;
  if (sodiumRaw === undefined) sodiumRaw = null;

  return {
    name,
    quantity_g: quantity_g > 0 ? quantity_g : 100,
    quantity_description,
    calories: Math.round(Number(o.calories ?? 0)),
    carb_g: Math.round(Number(o.carb_g ?? 0)),
    protein_g: Math.round(Number(o.protein_g ?? 0)),
    fat_g: Math.round(Number(o.fat_g ?? 0)),
    fiber_g:
      fiberRaw === null || fiberRaw === undefined || fiberRaw === ""
        ? null
        : Math.round(Number(fiberRaw)),
    sodium_mg:
      sodiumRaw === null || sodiumRaw === undefined || sodiumRaw === ""
        ? null
        : Math.round(Number(sodiumRaw)),
    confidence: normalizeConfidence(o.confidence),
    note:
      o.note === null || o.note === undefined || o.note === ""
        ? null
        : String(o.note).trim().slice(0, 500) || null,
  };
}

function parseItems(raw: string): PhotoItem[] {
  const cleaned = raw.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(cleaned) as unknown;
  const rows: Record<string, unknown>[] = [];
  if (Array.isArray(parsed)) {
    for (const row of parsed) {
      if (row && typeof row === "object") rows.push(row as Record<string, unknown>);
    }
  } else if (parsed && typeof parsed === "object") {
    rows.push(parsed as Record<string, unknown>);
  }

  return rows
    .map((row) => normalizePhotoRow(row))
    .filter((it): it is PhotoItem => it !== null);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const url = Deno.env.get("SUPABASE_URL")!;
  const svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, svc);

  let jobId = "";
  try {
    const body = await req.json();
    jobId =
      typeof body.jobId === "string"
        ? body.jobId
        : typeof body.record?.jobId === "string"
          ? body.record.jobId
          : "";
    if (!jobId) throw new Error("missing jobId");
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 422,
      headers: { "Content-Type": "application/json" },
    });
  }

  console.info(`[ai-photo-analyze] start jobId=${jobId}`);

  try {
    const { data: job, error: jobErr } = await admin
      .from("photo_analysis_jobs")
      .select("id, storage_path")
      .eq("id", jobId)
      .single();

    if (jobErr || !job) throw new Error("job not found");

    await admin
      .from("photo_analysis_jobs")
      .update({ status: "processing", error_message: null })
      .eq("id", jobId);

    const { data: fileBlob, error: dlErr } = await admin.storage
      .from("food-photos")
      .download(job.storage_path);

    if (dlErr || !fileBlob) {
      throw new Error(dlErr?.message ?? "無法下載照片");
    }

    const buf = new Uint8Array(await fileBlob.arrayBuffer());
    const mediaType = mediaTypeFromPath(job.storage_path);
    const base64 = toBase64(buf);

    const raw = await anthropicVision({
      mediaType,
      base64,
      prompt: PHOTO_ANALYZE_PROMPT,
    });

    const items = parseItems(raw);
    if (!items.length) {
      throw new Error("無法從 AI 回應解析食物列表");
    }

    await admin
      .from("photo_analysis_jobs")
      .update({
        status: "ready",
        result_json: items,
        error_message: null,
      })
      .eq("id", jobId);

    return new Response(JSON.stringify({ ok: true, jobId }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = String(e);
    await admin
      .from("photo_analysis_jobs")
      .update({
        status: "error",
        error_message: msg.slice(0, 2000),
      })
      .eq("id", jobId);

    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
