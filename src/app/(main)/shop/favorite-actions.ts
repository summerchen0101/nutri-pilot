'use server';

import { createClient } from '@/lib/supabase/server';

export async function toggleProductFavorite(productId: string): Promise<{
  ok: boolean;
  isFavorite: boolean;
  error?: string;
}> {
  const supabase = createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return { ok: false, isFavorite: false, error: '請先登入' };
  }

  const { data: existing, error: selectErr } = await supabase
    .from('user_product_favorites')
    .select('product_id')
    .eq('user_id', user.id)
    .eq('product_id', productId)
    .maybeSingle();

  if (selectErr) {
    return { ok: false, isFavorite: false, error: selectErr.message };
  }

  if (existing) {
    const { error: delErr } = await supabase
      .from('user_product_favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('product_id', productId);

    if (delErr) {
      return { ok: false, isFavorite: true, error: delErr.message };
    }
    return { ok: true, isFavorite: false };
  }

  const { error: insErr } = await supabase
    .from('user_product_favorites')
    .insert({ user_id: user.id, product_id: productId });

  if (insErr) {
    return { ok: false, isFavorite: false, error: insErr.message };
  }

  return { ok: true, isFavorite: true };
}
