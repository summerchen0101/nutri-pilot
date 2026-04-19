/**
 * 建立 Stripe Checkout Session
 * Auth: 使用者的 Bearer JWT（anon + Authorization）
 * Secrets: SUPABASE_URL, SUPABASE_ANON_KEY, STRIPE_SECRET_KEY, APP_URL（success/cancel）
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

type Mode = "payment" | "subscription";

interface LineInput {
  variantId: string;
  qty: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const appUrl = Deno.env.get("APP_URL") ?? Deno.env.get("NEXT_PUBLIC_APP_URL") ??
    "http://localhost:3000";

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
    mode?: Mode;
    items?: LineInput[];
    frequency?: string;
  };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const mode = body.mode;
  const items = body.items;
  const frequency = body.frequency ?? "monthly";

  if (mode !== "payment" && mode !== "subscription") {
    return jsonResponse({ error: "mode must be payment or subscription" }, 400);
  }
  if (!items?.length) {
    return jsonResponse({ error: "items required" }, 400);
  }

  if (mode === "subscription") {
    const ok = ["weekly", "biweekly", "monthly"].includes(frequency);
    if (!ok) {
      return jsonResponse({ error: "invalid frequency" }, 400);
    }
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });

  const variantIds = items.map((i) => i.variantId);
  const { data: variants, error: vErr } = await supabase
    .from("product_variants")
    .select("id, stripe_price_id, stripe_sub_price_id, product_id, label")
    .in("id", variantIds);

  if (vErr || !variants?.length) {
    return jsonResponse({ error: vErr?.message ?? "variants not found" }, 400);
  }

  const byId = new Map(variants.map((v) => [v.id as string, v]));
  const productIds = [...new Set(variants.map((v) => v.product_id as string))];
  const { data: products } = await supabase
    .from("products")
    .select("id, is_active")
    .in("id", productIds);

  const activePid = new Set(
    (products ?? []).filter((p) => p.is_active === true).map((p) => p.id),
  );

  for (const id of variantIds) {
    const row = byId.get(id);
    if (!row || !activePid.has(row.product_id as string)) {
      return jsonResponse({ error: `invalid variant ${id}` }, 400);
    }
  }

  const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

  for (const line of items) {
    const v = byId.get(line.variantId)! as {
      stripe_price_id: string | null;
      stripe_sub_price_id: string | null;
    };
    const priceId = mode === "payment" ?
      v.stripe_price_id
    : v.stripe_sub_price_id;
    if (!priceId?.trim()) {
      return jsonResponse({
        error:
          "商品尚未設定對應的 Stripe Price（請在 Dashboard 建立 Product／Price 後填入 product_variants）",
        variantId: line.variantId,
      }, 422);
    }
    line_items.push({ price: priceId, quantity: Math.max(1, line.qty) });
  }

  const compactItems = JSON.stringify(
    items.map((i) => ({ v: i.variantId, q: Math.max(1, i.qty) })),
  );

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    payment_method_types: ["card"],
    line_items,
    client_reference_id: user.id,
    metadata: {
      user_id: user.id,
      mode,
      compact_items: compactItems,
    },
    success_url:
      `${appUrl.replace(/\/$/, "")}/shop/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl.replace(/\/$/, "")}/shop/cart`,
  };

  if (mode === "payment") {
    sessionParams.mode = "payment";
  } else {
    sessionParams.mode = "subscription";
    sessionParams.subscription_data = {
      metadata: {
        user_id: user.id,
        frequency,
        compact_items: compactItems,
      },
    };
  }

  try {
    const session = await stripe.checkout.sessions.create(sessionParams);
    return jsonResponse({ url: session.url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonResponse({ error: msg }, 502);
  }
});
