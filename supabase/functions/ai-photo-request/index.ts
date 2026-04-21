/**
 * 使用者上傳後呼叫：建立 photo_analysis_jobs → QStash → ai-photo-analyze
 * Secrets: SUPABASE_URL, SUPABASE_ANON_KEY
 * Optional: QSTASH_TOKEN, QSTASH_URL, EDGE_FUNCTIONS_URL（不可用 SUPABASE_ 開頭：CLI secrets 會拒絕）
 * 上述三項須以 `supabase secrets set --project-ref …` 設在**專案上**，本機 Next `.env.local` 不會帶入 Edge。
 *
 * config.toml `verify_jwt = false`：避免閘道僅支援 HS256 時與 ES256 使用者 JWT 衝突；
 * 授權改為本函式內 `Authorization` + `auth.getUser()`。
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

/** 瀏覽器從 localhost／正式網域 fetch 需 CORS，否則會出現 `TypeError: Failed to fetch`。 */
const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-api-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** QStash 要求 destination 含 scheme；secrets 常漏 `https://`、夾引號 */
function normalizeEdgeFunctionsBaseUrl(raw: string): string {
  let s = raw
    .replace(/^\uFEFF/, "")
    .trim()
    .replace(/^["']+|["']+$/g, "")
    .trim()
    .replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(s)) {
    s = `https://${s.replace(/^\/+/, "")}`;
  }
  const u = new URL(s);
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new Error(`EDGE_FUNCTIONS_URL 必須為 http(s)`);
  }
  if (!u.hostname) throw new Error("EDGE_FUNCTIONS_URL 缺少主機名");
  const path = u.pathname.replace(/\/+$/, "");
  return `${u.origin}${path}`;
}

/**
 * 僅基底 `https://qstash.upstash.io`，勿含 `/v2/publish`（否則 path 重複會導致 QStash 400 invalid scheme）
 */
function normalizeQstashApiBaseUrl(raw: string | undefined): string {
  const fallback = "https://qstash.upstash.io";
  if (raw == null || !String(raw).trim()) return fallback;
  let s = String(raw)
    .replace(/^\uFEFF/, "")
    .trim()
    .replace(/^["']+|["']+$/g, "")
    .trim();
  if (!/^https?:\/\//i.test(s)) {
    s = `https://${s.replace(/^\/+/, "")}`;
  }
  try {
    const u = new URL(s);
    if (u.pathname.includes("/v2/publish")) return u.origin;
    const path = u.pathname.replace(/\/+$/, "");
    return path ? `${u.origin}${path}` : u.origin;
  } catch {
    return fallback;
  }
}

type PublishOutcome =
  | { ok: true }
  | {
    ok: false;
    reason: "missing_secrets" | "qstash_error";
    detail?: string;
    /** 實際當作 QStash destination 的 URL，除錯用 */
    destinationTried?: string;
  };

async function publishPhotoJob(jobId: string): Promise<PublishOutcome> {
  const token = Deno.env.get("QSTASH_TOKEN")?.trim();
  const qstashUrl = normalizeQstashApiBaseUrl(Deno.env.get("QSTASH_URL"));
  const functionsUrlRaw = Deno.env.get("EDGE_FUNCTIONS_URL")?.trim();
  if (!token || !functionsUrlRaw) {
    return { ok: false, reason: "missing_secrets" };
  }

  let base: string;
  try {
    base = normalizeEdgeFunctionsBaseUrl(functionsUrlRaw);
  } catch (e) {
    return {
      ok: false,
      reason: "qstash_error",
      detail: `EDGE_FUNCTIONS_URL 無效：${String(e)}`,
    };
  }

  const destination = `${base}/ai-photo-analyze`;
  /** 與 @upstash/qstash 相同：勿對 destination 整段 encodeURIComponent */
  const publishUrl = [qstashUrl.replace(/\/$/, ""), "v2", "publish", destination].join(
    "/",
  );

  const res = await fetch(publishUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ jobId }),
  });
  if (!res.ok) {
    const t = await res.text();
    return {
      ok: false,
      reason: "qstash_error",
      detail: `QStash HTTP ${res.status}: ${t.slice(0, 500)}`,
      destinationTried: destination,
    };
  }
  return { ok: true };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse({ error: "Missing Authorization" }, 401);
  }

  const supabase = createClient(supabaseUrl, anon, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  let storagePath = "";
  let jobKind: "meal" | "label" = "meal";
  try {
    const body = await req.json();
    storagePath = typeof body.storagePath === "string" ? body.storagePath : "";
    const rawKind = body.jobKind ?? body.job_kind;
    if (rawKind === "label" || rawKind === "meal") {
      jobKind = rawKind;
    }
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const prefix = `${user.id}/`;
  if (!storagePath || !storagePath.startsWith(prefix)) {
    return jsonResponse({ error: "storagePath 必須為 {userId}/..." }, 422);
  }

  const { data: job, error: insErr } = await supabase
    .from("photo_analysis_jobs")
    .insert({
      user_id: user.id,
      storage_path: storagePath,
      status: "pending",
      job_kind: jobKind,
    })
    .select("id")
    .single();

  if (insErr || !job) {
    return jsonResponse(
      { error: insErr?.message ?? "無法建立 job" },
      500,
    );
  }

  const pub = await publishPhotoJob(job.id);
  const queued = pub.ok;

  let hint: string | undefined;
  if (!queued) {
    if (pub.reason === "missing_secrets") {
      hint =
        "Edge 環境未設定 QSTASH_TOKEN 或 EDGE_FUNCTIONS_URL（請用 supabase secrets 設在專案上，本機 .env 無效）；未呼叫 QStash，分析將維持 pending。";
    } else {
      hint = pub.detail ?? "發佈至 QStash 失敗";
    }
  }

  return jsonResponse({
    jobId: job.id,
    queued,
    hint,
    ...("destinationTried" in pub && pub.destinationTried
      ? { destination: pub.destinationTried }
      : {}),
  });
});
