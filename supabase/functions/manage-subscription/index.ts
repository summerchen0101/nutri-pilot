/**
 * 訂閱：暫停／取消／改頻率（Stripe Billing）
 * Auth: 使用者 JWT
 * Secrets: SUPABASE_URL, SUPABASE_ANON_KEY, STRIPE_SECRET_KEY
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";
import Stripe from "https://esm.sh/stripe@14.25.0?target=deno";

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

type Action = "pause" | "cancel" | "resume" | "update_frequency";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) {
    return jsonResponse({ error: "Missing STRIPE_SECRET_KEY" }, 500);
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

  let body: {
    subscriptionRowId?: string;
    action?: Action;
    frequency?: string;
  };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const rowId = body.subscriptionRowId;
  const action = body.action;
  const frequency = body.frequency;

  if (!rowId || !action) {
    return jsonResponse({ error: "subscriptionRowId and action required" }, 400);
  }

  const { data: row, error: fetchErr } = await supabase
    .from("subscriptions")
    .select("stripe_subscription_id, user_id")
    .eq("id", rowId)
    .maybeSingle();

  if (fetchErr || !row || row.user_id !== user.id) {
    return jsonResponse({ error: "Subscription not found" }, 404);
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });
  const stripeSubId = row.stripe_subscription_id as string;

  try {
    if (action === "pause") {
      await stripe.subscriptions.update(stripeSubId, {
        pause_collection: { behavior: "void" },
      });
      await supabase.from("subscriptions").update({
        status: "paused",
        updated_at: new Date().toISOString(),
      }).eq("id", rowId);
    } else if (action === "resume") {
      await stripe.subscriptions.update(stripeSubId, {
        pause_collection: null as unknown as undefined,
      });
      await supabase.from("subscriptions").update({
        status: "active",
        updated_at: new Date().toISOString(),
      }).eq("id", rowId);
    } else if (action === "cancel") {
      await stripe.subscriptions.update(stripeSubId, {
        cancel_at_period_end: true,
      });
      await supabase.from("subscriptions").update({
        status: "cancelled",
        updated_at: new Date().toISOString(),
      }).eq("id", rowId);
    } else if (action === "update_frequency") {
      const ok = ["weekly", "biweekly", "monthly"].includes(frequency ?? "");
      if (!ok) return jsonResponse({ error: "invalid frequency" }, 400);

      const current = await stripe.subscriptions.retrieve(stripeSubId, {
        expand: ["items.data.price"],
      });
      const itemId = current.items.data[0]?.id;
      if (!itemId) return jsonResponse({ error: "No subscription item" }, 422);

      /** 改頻率僅更新 metadata（實際寄送由營運／外部排程）；Stripe Billing 仍以同一 Price */
      await stripe.subscriptions.update(stripeSubId, {
        metadata: {
          ...(current.metadata ?? {}),
          user_id: user.id,
          frequency: frequency!,
        },
      });

      await supabase.from("subscriptions").update({
        frequency,
        updated_at: new Date().toISOString(),
      }).eq("id", rowId);
    }

    return jsonResponse({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonResponse({ error: msg }, 502);
  }
});
