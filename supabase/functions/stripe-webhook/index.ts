/**
 * Stripe Webhook：orders / subscriptions 入庫
 * Secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";
import Stripe from "https://esm.sh/stripe@14.25.0?target=deno";

function mapStripeSubStatus(
  s: Stripe.Subscription.Status,
): "active" | "paused" | "cancelled" | "past_due" {
  if (s === "active" || s === "trialing") return "active";
  if (s === "past_due" || s === "unpaid") return "past_due";
  if (s === "paused") return "paused";
  return "cancelled";
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const whSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!stripeKey || !whSecret || !url || !serviceKey) {
    return new Response("Missing secrets", { status: 500 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });
  const admin = createClient(url, serviceKey);

  const sig = req.headers.get("stripe-signature");
  const raw = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(raw, sig!, whSecret);
  } catch {
    return new Response("Bad signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutComplete(stripe, admin, session);
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        await syncSubscription(stripe, admin, sub);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await admin.from("subscriptions").update({
          status: "cancelled",
          updated_at: new Date().toISOString(),
        }).eq("stripe_subscription_id", sub.id);
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error("[stripe-webhook]", e);
    return new Response("handler error", { status: 500 });
  }

  return new Response("ok", { status: 200 });
});

async function handleCheckoutComplete(
  stripe: Stripe,
  admin: ReturnType<typeof createClient>,
  session: Stripe.Checkout.Session,
) {
  if (session.mode !== "payment") return;

  const userId =
    session.metadata?.user_id ??
      session.client_reference_id ??
      "";
  if (!userId) return;

  const expanded = await stripe.checkout.sessions.retrieve(session.id, {
    expand: ["line_items", "payment_intent"],
  });

  let piId: string | undefined;
  const pi = expanded.payment_intent;
  if (typeof pi === "string") piId = pi;
  else if (pi && typeof pi === "object" && "id" in pi) piId = pi.id;

  if (!piId) return;

  const lines = expanded.line_items?.data ?? [];
  const amountTotal = expanded.amount_total != null ?
    expanded.amount_total / 100
    : 0;

  const priceIds = lines.map((li) =>
    typeof li.price === "string" ? li.price : li.price?.id
  ).filter(Boolean) as string[];

  const { data: variants } = await admin.from("product_variants").select(
    "id, stripe_price_id, price",
  ).in("stripe_price_id", priceIds);

  const priceToVariant = new Map(
    (variants ?? []).map((v) => [v.stripe_price_id as string, v]),
  );

  await admin.from("orders").upsert(
    {
      id: piId,
      user_id: userId,
      status: "paid",
      total: amountTotal,
      stripe_session_id: session.id,
    },
    { onConflict: "id" },
  );

  await admin.from("order_items").delete().eq("order_id", piId);

  const orderItems = lines.flatMap((li) => {
    const priceId =
      typeof li.price === "string" ? li.price : li.price?.id;
    if (!priceId) return [];
    const variant = priceToVariant.get(priceId);
    if (!variant) return [];
    const qty = li.quantity ?? 1;
    const unit = typeof variant.price === "number" ?
      variant.price
      : Number(variant.price);
    return [{
      order_id: piId,
      variant_id: variant.id as string,
      qty,
      unit_price: unit,
    }];
  });

  if (orderItems.length > 0) {
    await admin.from("order_items").insert(orderItems);
  }
}

async function syncSubscription(
  stripe: Stripe,
  admin: ReturnType<typeof createClient>,
  sub: Stripe.Subscription,
) {
  const meta = sub.metadata ?? {};
  const userId = meta.user_id as string | undefined;
  if (!userId) return;

  const frequencyRaw = meta.frequency as string | undefined;
  const frequency = ["weekly", "biweekly", "monthly"].includes(frequencyRaw ?? "") ?
      frequencyRaw!
    : "monthly";

  let compact = meta.compact_items as string | undefined;
  if (!compact && sub.metadata && typeof sub.metadata.compact_items === "string") {
    compact = sub.metadata.compact_items;
  }

  let items: { v: string; q: number }[] = [];
  try {
    items = compact ? JSON.parse(compact) : [];
  } catch {
    items = [];
  }

  const status = mapStripeSubStatus(sub.status);
  const customerId = typeof sub.customer === "string" ?
    sub.customer
    : sub.customer?.id;

  const nextShip =
    typeof sub.current_period_end === "number"
      ? new Date(sub.current_period_end * 1000).toISOString()
      : null;

  const row = {
    stripe_subscription_id: sub.id,
    stripe_customer_id: customerId ?? "",
    user_id: userId,
    status,
    frequency,
    next_ship_at: nextShip,
    updated_at: new Date().toISOString(),
  };

  const { data: existing } = await admin.from("subscriptions").select("id").eq(
    "stripe_subscription_id",
    sub.id,
  ).maybeSingle();

  let subPk: string;

  if (existing?.id) {
    await admin.from("subscriptions").update(row).eq("id", existing.id);
    subPk = existing.id as string;
    await admin.from("subscription_items").delete().eq(
      "subscription_id",
      subPk,
    );
  } else {
    const ins = await admin.from("subscriptions").insert(row).select("id").single();
    if (ins.error || !ins.data) throw ins.error ?? new Error("insert subscription");
    subPk = ins.data.id as string;
  }

  if (!items.length) return;

  const variantIds = items.map((i) => i.v);
  const { data: vars } = await admin.from("product_variants").select(
    "id",
  ).in("id", variantIds);

  const ok = new Set((vars ?? []).map((v) => v.id));
  const siRows = items
    .filter((i) => ok.has(i.v))
    .map((i) => ({
      subscription_id: subPk,
      variant_id: i.v,
      qty: i.q,
      stripe_item_id: null as string | null,
    }));

  if (siRows.length > 0) {
    await admin.from("subscription_items").insert(siRows);
  }
}
