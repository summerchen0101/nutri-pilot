/**
 * QStash → label-guard-photos → Claude Vision → label_guard_jobs.result_json
 * Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

import { anthropicVision } from "../_shared/anthropic-vision.ts";
import {
  buildLabelGuardReportPrompt,
  TW_ALLERGEN_CATEGORY_KEYS,
  type TwAllergenCategoryKey,
} from "../_shared/label-guard-report-prompt.ts";
import { mediaTypeFromPath, toBase64 } from "../_shared/image-utils.ts";

function ageFromBirthIso(birthIso: string): number {
  const bd = new Date(birthIso);
  if (Number.isNaN(bd.getTime())) return 30;
  const now = new Date();
  let age = now.getFullYear() - bd.getFullYear();
  const m = now.getMonth() - bd.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < bd.getDate())) age--;
  return Math.max(0, Math.min(120, age));
}

function parseReportJson(raw: string): Record<string, unknown> {
  const cleaned = raw.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(cleaned) as unknown;
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    return parsed as Record<string, unknown>;
  }
  throw new Error("標示分析必須回傳單一 JSON 物件");
}

function normalizeAllergensTw14(
  raw: unknown,
): { category_key: string; detected: boolean; detail: string | null }[] {
  const byKey = new Map<
    string,
    { category_key: string; detected: boolean; detail: string | null }
  >();
  if (Array.isArray(raw)) {
    for (const row of raw) {
      if (!row || typeof row !== "object") continue;
      const r = row as Record<string, unknown>;
      const key = String(r.category_key ?? "").trim();
      if (!TW_ALLERGEN_CATEGORY_KEYS.includes(key as TwAllergenCategoryKey)) {
        continue;
      }
      const detected = r.detected === true;
      const detail =
        r.detail === null || r.detail === undefined
          ? null
          : String(r.detail).trim().slice(0, 200) || null;
      byKey.set(key, { category_key: key, detected, detail });
    }
  }
  const out: { category_key: string; detected: boolean; detail: string | null }[] =
    [];
  for (const k of TW_ALLERGEN_CATEGORY_KEYS) {
    out.push(
      byKey.get(k) ?? { category_key: k, detected: false, detail: null },
    );
  }
  return out;
}

function clampScore(n: unknown): number {
  const v = Math.round(Number(n));
  if (Number.isNaN(v)) return 70;
  return Math.max(0, Math.min(100, v));
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

  console.info(`[label-guard-analyze] start jobId=${jobId}`);

  try {
    const { data: job, error: jobErr } = await admin
      .from("label_guard_jobs")
      .select("id, user_id, storage_path")
      .eq("id", jobId)
      .single();

    if (jobErr || !job) throw new Error("job not found");

    await admin
      .from("label_guard_jobs")
      .update({ status: "processing", error_message: null })
      .eq("id", jobId);

    const { data: fileBlob, error: dlErr } = await admin.storage
      .from("label-guard-photos")
      .download(job.storage_path);

    if (dlErr || !fileBlob) {
      throw new Error(dlErr?.message ?? "無法下載照片");
    }

    const buf = new Uint8Array(await fileBlob.arrayBuffer());
    const mediaType = mediaTypeFromPath(job.storage_path);
    const base64 = toBase64(buf);

    const { data: profile } = await admin
      .from("user_profiles")
      .select("birth_date, allergens, avoid_foods, tracks_glycemic_concern")
      .eq("user_id", job.user_id)
      .maybeSingle();

    const birth = profile?.birth_date
      ? String(profile.birth_date).slice(0, 10)
      : "1990-01-01";
    const userAgeYears = ageFromBirthIso(birth);
    const allergens = Array.isArray(profile?.allergens)
      ? (profile!.allergens as string[])
      : [];
    const avoidFoods = Array.isArray(profile?.avoid_foods)
      ? (profile!.avoid_foods as string[])
      : [];
    const tracksGlycemicConcern = profile?.tracks_glycemic_concern === true;

    const prompt = buildLabelGuardReportPrompt({
      userAgeYears,
      allergens,
      avoidFoods,
      tracksGlycemicConcern,
    });

    const raw = await anthropicVision({
      mediaType,
      base64,
      prompt,
      maxTokens: 4096,
    });

    const obj = parseReportJson(raw);
    if (obj._kind !== "label_guard_report") {
      obj._kind = "label_guard_report";
    }
    obj.disclaimer_required = true;
    obj.safety_score = clampScore(obj.safety_score);
    obj.allergens_tw14 = normalizeAllergensTw14(obj.allergens_tw14);

    await admin
      .from("label_guard_jobs")
      .update({
        status: "ready",
        result_json: obj as unknown as Record<string, unknown>,
        error_message: null,
      })
      .eq("id", jobId);

    return new Response(JSON.stringify({ ok: true, jobId }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = String(e);
    await admin
      .from("label_guard_jobs")
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
