import Link from "next/link";
import { redirect } from "next/navigation";

import type { ShopProductRow } from './shop-home-client';
import { ShopHomeClient } from './shop-home-client';
import { ensureShopScores } from "@/app/(main)/shop/actions";
import { PageHeader } from "@/components/layout/page-header";
import {
  DIET_METHOD_OPTIONS,
  DIET_TYPE_OPTIONS,
} from "@/lib/onboarding/constants";
import { createClient } from "@/lib/supabase/server";

export default async function ShopPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  await ensureShopScores(user.id);

  const [
    { data: profile },
    { data: goal },
    { data: scores },
    { data: catalog },
    { data: brandCounts },
  ] = await Promise.all([
    supabase
      .from("user_profiles")
      .select("diet_type, allergens, diet_method")
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("user_goals")
      .select("type")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle(),
    supabase
      .from("user_product_scores")
      .select("product_id, score")
      .eq("user_id", user.id),
    supabase
      .from("products")
      .select(
        `
      id,
      name,
      slug,
      image_url,
      category,
      calories,
      protein_g,
      sugar_g,
      diet_tags,
      cert_tags,
      avg_rating,
      brand:brands ( id, name, slug, logo_url ),
      variants:product_variants ( id, label, price, sub_price, stock )
    `,
      )
      .eq("is_active", true),
    supabase.from("products").select("brand_id").eq("is_active", true),
  ]);

  if (!profile || !goal || !profile.diet_method) redirect("/onboarding");

  const scoreMap = new Map(
    (scores ?? []).map((s) => [s.product_id as string, Number(s.score)]),
  );

  const brandCountMap = new Map<string, number>();
  for (const row of brandCounts ?? []) {
    const bid = row.brand_id as string;
    brandCountMap.set(bid, (brandCountMap.get(bid) ?? 0) + 1);
  }

  const { data: brands } = await supabase
    .from("brands")
    .select("id, name, slug, logo_url")
    .eq("is_active", true)
    .order("name");

  const dietTypeLabel =
    DIET_TYPE_OPTIONS.find((o) => o.value === profile.diet_type)?.label ??
    profile.diet_type;
  const dietMethodLabel =
    DIET_METHOD_OPTIONS.find((o) => o.value === profile.diet_method)?.label ??
    profile.diet_method;

  const allergenLabels = profile.allergens ?? [];

  return (
    <div className="space-y-4">
      <PageHeader
        title="健康商城"
        description={`依你的「${dietMethodLabel}」偏好篩選；已依過敏原（${
          allergenLabels.length ? allergenLabels.join("、") : "無"
        }）排除不適合商品。飲食習慣：${dietTypeLabel}`}
        action={
          <Link
            href="/shop/cart"
            className="rounded-[10px] border-[1.5px] border-primary px-3 py-2 text-[13px] font-medium text-primary hover:bg-primary-light">
            購物車
          </Link>
        }
      />

      <ShopHomeClient
        initialProducts={(catalog ?? []).map((p) => ({
          ...(p as unknown as Omit<ShopProductRow, "score">),
          score: scoreMap.get(p.id as string) ?? 0,
        }))}
        brands={(brands ?? []).map((b) => ({
          ...b,
          productCount: brandCountMap.get(b.id as string) ?? 0,
        }))}
        dietMethod={profile.diet_method}
      />
    </div>
  );
}
