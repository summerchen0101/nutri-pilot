export type VariantSaveLine = {
  id?: string;
  label: string;
  weight_g: number;
  price: number;
  list_price: number | null;
  stock: number;
};

export type ProductSavePayload = {
  id?: string;
  name: string;
  brand_id: string;
  category: string;
  description: string | null;
  image_url: string | null;
  serving_size_g: number;
  calories: number;
  carb_g: number;
  protein_g: number;
  fat_g: number;
  fiber_g: number | null;
  sugar_g: number | null;
  sodium_mg: number | null;
  diet_tags: string[];
  cert_tags: string[];
  allergen_free: string[];
  ingredients: string | null;
  origin: string | null;
  is_active: boolean;
  variants: VariantSaveLine[];
};
