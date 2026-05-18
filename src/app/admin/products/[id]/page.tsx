import { notFound } from 'next/navigation';

import { ProductEditor } from '@/app/admin/products/_components/product-editor';
import { getAdminRole, staffCan } from '@/lib/admin';
import { createClient } from '@/lib/supabase/server';

export default async function AdminEditProductPage({
  params,
}: Readonly<{ params: { id: string } }>) {
  const role = await getAdminRole();
  const supabase = createClient();

  const { data: product, error } = await supabase
    .from('products')
    .select(
      `
      id,
      slug,
      name,
      brand_id,
      category,
      description,
      image_url,
      serving_size_g,
      calories,
      carb_g,
      protein_g,
      fat_g,
      fiber_g,
      sugar_g,
      sodium_mg,
      diet_tags,
      cert_tags,
      allergen_free,
      ingredients,
      origin,
      is_active,
      variants:product_variants(id, label, weight_g, price, list_price, stock)
    `,
    )
    .eq('id', params.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!product) {
    notFound();
  }

  const { data: brands, error: bErr } = await supabase
    .from('brands')
    .select('id, name')
    .order('name');

  if (bErr) {
    throw new Error(bErr.message);
  }

  const variantsRaw = product.variants;
  const variants = Array.isArray(variantsRaw) ? variantsRaw : [];

  const initial = {
    id: product.id,
    slug: product.slug,
    name: product.name,
    brand_id: product.brand_id,
    category: product.category,
    description: product.description,
    image_url: product.image_url,
    serving_size_g: Number(product.serving_size_g),
    calories: Number(product.calories),
    carb_g: Number(product.carb_g),
    protein_g: Number(product.protein_g),
    fat_g: Number(product.fat_g),
    fiber_g: product.fiber_g != null ? Number(product.fiber_g) : null,
    sugar_g: product.sugar_g != null ? Number(product.sugar_g) : null,
    sodium_mg: product.sodium_mg != null ? Number(product.sodium_mg) : null,
    diet_tags: product.diet_tags,
    cert_tags: product.cert_tags,
    allergen_free: product.allergen_free,
    ingredients: product.ingredients,
    origin: product.origin,
    is_active: product.is_active,
    variants: variants.map((v) => ({
      id: v.id,
      label: v.label,
      weight_g: Number(v.weight_g),
      price: Number(v.price),
      list_price: v.list_price != null ? Number(v.list_price) : null,
      stock: v.stock ?? 0,
    })),
  };

  const canDelete = Boolean(role && staffCan(role, 'product.delete'));

  return (
    <ProductEditor
      brands={brands ?? []}
      initial={initial}
      canDelete={canDelete}
    />
  );
}
