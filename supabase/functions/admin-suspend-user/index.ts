/**
 * super_admin：停用／解禁一般使用者（auth ban_duration）
 * Secrets: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** ~100 年的暫時性「長期停用」；解禁時改為 ban_duration:none */
const LONG_SUSPEND_DURATION = "876000h";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !anonKey || !serviceKey) {
    return jsonResponse({ error: "Missing Supabase secrets" }, 500);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResponse({ error: "Missing Authorization" }, 401);
  }

  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userErr,
  } = await userClient.auth.getUser();

  if (userErr || !user) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  if (user.app_metadata?.admin_role !== "super_admin") {
    return jsonResponse({ error: "Forbidden" }, 403);
  }

  let body: { targetUserId?: unknown; suspend?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const targetUserId =
    typeof body.targetUserId === "string" ? body.targetUserId.trim() : "";
  const suspend =
    typeof body.suspend === "boolean"
      ? body.suspend
      : undefined;

  if (!targetUserId) {
    return jsonResponse({ error: "targetUserId required" }, 422);
  }
  if (suspend === undefined) {
    return jsonResponse({ error: "suspend (boolean) required" }, 422);
  }

  if (targetUserId === user.id) {
    return jsonResponse({ error: "無法對自己的帳號執行停用" }, 422);
  }

  const serviceClient = createClient(url, serviceKey);

  const { data: targetData, error: getErr } = await serviceClient.auth.admin
    .getUserById(targetUserId);

  if (getErr || !targetData?.user) {
    return jsonResponse({ error: "User not found" }, 404);
  }

  if (targetData.user.app_metadata?.admin_role === "super_admin") {
    return jsonResponse(
      {
        error:
          "無法對其他 super_admin 帳號套用停用／解禁動作（請改由身分存取控管另行處理）",
      },
      422,
    );
  }

  const { error: updErr } = await serviceClient.auth.admin.updateUserById(
    targetUserId,
    {
      ban_duration: suspend ? LONG_SUSPEND_DURATION : "none",
    },
  );

  if (updErr) {
    return jsonResponse({ error: updErr.message }, 500);
  }

  const { error: auditErr } = await userClient.rpc("admin_append_audit_log", {
    p_action: "user.suspend",
    p_target_type: "user",
    p_target_id: targetUserId,
    p_metadata: { suspend },
  });
  if (auditErr) {
    console.error("admin_append_audit_log:", auditErr.message);
  }

  return jsonResponse({
    ok: true,
    suspended: suspend,
  });
});
