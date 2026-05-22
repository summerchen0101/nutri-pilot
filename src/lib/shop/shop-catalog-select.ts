/** Supabase products select for shop catalog rows（含 brand、vendor、variants） */
export const SHOP_CATALOG_PRODUCT_SELECT = `
  id,
  name,
  slug,
  image_url,
  sort_order,
  category,
  calories,
  protein_g,
  sugar_g,
  diet_tags,
  cert_tags,
  avg_rating,
  brand:brands (
    id, name, slug, logo_url,
    vendor:vendors!inner (
      id,
      name,
      shipping_fee,
      free_shipping_threshold,
      lead_time_days
    )
  ),
  variants:product_variants ( id, label, price, stock, list_price )
`;
