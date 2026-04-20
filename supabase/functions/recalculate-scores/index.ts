/**
 * 批次重算 user_product_scores（以 Service Role Bearer 呼叫）
 * Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * @see docs/07-api.md
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

interface ProductRow {
  id: string;
  diet_tags: string[] | null;
  allergen_free: string[] | null;
  ingredients: string | null;
  calories: number;
  sugar_g: number | null;
  protein_g: number;
  avg_rating: number | null;
}

interface ProfileRow {
  allergens: string[] | null;
  avoid_foods: string[] | null;
  diet_method: string | null;
}

interface GoalRow {
  type: string;
}

function calcRecommendScore(
  product: ProductRow,
  allergens: string[],
  avoidFoods: string[],
  dietMethod: string,
  goalType: string,
  purchaseHistory: Set<string>,
): number {
  let score = 0;

  const allergenFree = product.allergen_free ?? [];
  const hasAllergenConflict = allergens.some((a) => !allergenFree.includes(a));
  if (hasAllergenConflict) return -999;

  const tags = product.diet_tags ?? [];
  if (dietMethod && tags.includes(dietMethod)) score += 40;

  const ingredientSafe = !avoidFoods.some((food) =>
    product.ingredients?.includes(food) ?? false
  );
  if (ingredientSafe) score += 20;

  const cal = Number(product.calories);
  const sugar = product.sugar_g != null ? Number(product.sugar_g) : 0;
  const prot = Number(product.protein_g);

  if (goalType === "lose_weight" && cal < 200) score += 10;
  if (goalType === "lose_weight" && sugar < 5) score += 5;
  if (goalType === "gain_muscle" && prot > 15) score += 15;

  if (purchaseHistory.has(product.id)) score += 15;

  const rating = product.avg_rating != null ? Number(product.avg_rating) : 0;
  score += (rating / 5) * 10;

  return score;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) {
    return jsonResponse({ error: "Missing Supabase secrets" }, 500);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (token !== serviceKey) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  let body: { userId?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }
  const userId = body.userId;
  if (!userId || typeof userId !== "string") {
    return jsonResponse({ error: "userId required" }, 400);
  }

  const admin = createClient(url, serviceKey);

  const [{ data: profile }, { data: goal }] = await Promise.all([
    admin.from("user_profiles").select("allergens, avoid_foods, diet_method").eq(
      "user_id",
      userId,
    ).maybeSingle(),
    admin.from("user_goals").select("type").eq("user_id", userId).eq(
      "is_active",
      true,
    ).maybeSingle(),
  ]);

  if (!profile || !goal) {
    return jsonResponse({ error: "Profile or goal not found" }, 404);
  }

  const allergens = profile.allergens ?? [];
  const avoidFoods = profile.avoid_foods ?? [];
  const dietMethod = profile.diet_method ?? "";
  const goalType = goal.type ?? "maintain";

  const { data: orders } = await admin.from("orders").select("id").eq(
    "user_id",
    userId,
  ).eq("status", "paid");

  const orderIds = (orders ?? []).map((o) => o.id);
  let purchaseProductIds = new Set<string>();
  if (orderIds.length > 0) {
    const { data: oi } = await admin.from("order_items").select(
      "variant_id",
    ).in("order_id", orderIds);
    const variantIds = [...new Set((oi ?? []).map((r) => r.variant_id))];
    if (variantIds.length > 0) {
      const { data: variants } = await admin.from("product_variants").select(
        "product_id",
      ).in("id", variantIds);
      purchaseProductIds = new Set(
        (variants ?? []).map((v) => v.product_id as string),
      );
    }
  }

  const { data: products, error: pErr } = await admin.from("products").select(
    "id, diet_tags, allergen_free, ingredients, calories, sugar_g, protein_g, avg_rating",
  ).eq("is_active", true);

  if (pErr || !products?.length) {
    return jsonResponse(
      { error: pErr?.message ?? "No products" },
      pErr ? 500 : 200,
    );
  }

  const rows = (products as ProductRow[]).map((p) => ({
    user_id: userId,
    product_id: p.id,
    score: calcRecommendScore(
      p,
      allergens,
      avoidFoods,
      dietMethod,
      goalType,
      purchaseProductIds,
    ),
  }));

  const { error: upErr } = await admin.from("user_product_scores").upsert(
    rows,
    { onConflict: "user_id,product_id" },
  );

  if (upErr) {
    return jsonResponse({ error: upErr.message }, 500);
  }

  return jsonResponse({ ok: true, count: rows.length });
});
