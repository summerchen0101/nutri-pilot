/**
 * 僅 super_admin 可指派／移除後台角色。
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

const VALID_ROLES = ["super_admin", "editor", "cs"] as const;

function parseRole(raw: unknown): (typeof VALID_ROLES)[number] | null | undefined {
  if (raw === null) return null;
  if (raw === "") return null;
  if (typeof raw !== "string") return undefined;
  if (VALID_ROLES.includes(raw as (typeof VALID_ROLES)[number])) {
    return raw as (typeof VALID_ROLES)[number];
  }
  return undefined;
}

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

  let body: { targetUserId?: unknown; role?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const targetUserId =
    typeof body.targetUserId === "string" ? body.targetUserId.trim() : "";

  if (!targetUserId) {
    return jsonResponse({ error: "targetUserId required" }, 422);
  }

  const nextRole = parseRole(body.role);
  if (nextRole === undefined) {
    return jsonResponse({ error: "Invalid role" }, 422);
  }

  const serviceClient = createClient(url, serviceKey);

  const { data: targetData, error: getErr } = await serviceClient.auth.admin
    .getUserById(targetUserId);

  if (getErr || !targetData?.user) {
    return jsonResponse({ error: "User not found" }, 404);
  }

  const prevMeta = { ...(targetData.user.app_metadata ?? {}) } as Record<
    string,
    unknown
  >;

  if (nextRole === null) {
    delete prevMeta.admin_role;
  } else {
    prevMeta.admin_role = nextRole;
  }

  const { error: updErr } = await serviceClient.auth.admin.updateUserById(
    targetUserId,
    { app_metadata: prevMeta },
  );

  if (updErr) {
    return jsonResponse({ error: updErr.message }, 500);
  }

  return jsonResponse({ ok: true });
});
