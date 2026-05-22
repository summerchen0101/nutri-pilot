'use server';

import { revalidatePath } from 'next/cache';

import {
  ADMIN_AUDIT_ACTIONS,
  ADMIN_AUDIT_TARGET_TYPES,
} from '@/lib/admin/admin-audit-actions';
import { appendAdminAuditLog } from '@/lib/admin/append-admin-audit-log';
import { getAdminRole, staffCan } from '@/lib/admin';
import { createClient } from '@/lib/supabase/server';

export async function saveVendorProfile(input: {
  id: string;
  name: string;
  slug?: string;
  description?: string | null;
  banner_url?: string | null;
  logo_url?: string | null;
  shipping_fee: number;
  free_shipping_threshold?: number | null;
  lead_time_days: number;
  is_active: boolean;
}): Promise<{ ok: false; error: string } | { ok: true; slug: string }> {
  const role = await getAdminRole();
  if (!role || !staffCan(role, 'vendor.write')) {
    return { ok: false, error: '沒有權限' };
  }

  const supabase = createClient();
  const name = input.name.trim();
  if (!name) {
    return { ok: false, error: '請填廠商名稱' };
  }

  const slug = input.slug?.trim();
  if (!slug) {
    return { ok: false, error: '請填 slug' };
  }

  const row = {
    name,
    slug,
    description: input.description?.trim() || null,
    banner_url: input.banner_url?.trim() || null,
    logo_url: input.logo_url?.trim() || null,
    shipping_fee: input.shipping_fee,
    free_shipping_threshold: input.free_shipping_threshold ?? null,
    lead_time_days: input.lead_time_days,
    is_active: input.is_active,
  };

  const { error } = await supabase.from('vendors').update(row).eq('id', input.id);
  if (error) {
    return { ok: false, error: error.message };
  }

  const { error: shipErr } = await supabase
    .from('vendor_shipping_methods')
    .update({
      shipping_fee: input.shipping_fee,
      free_shipping_threshold: input.free_shipping_threshold ?? null,
    })
    .eq('vendor_id', input.id)
    .eq('code', 'home_delivery');
  if (shipErr) {
    return { ok: false, error: shipErr.message };
  }

  const audit = await appendAdminAuditLog({
    action: ADMIN_AUDIT_ACTIONS.VENDOR_SAVE,
    targetType: ADMIN_AUDIT_TARGET_TYPES.VENDOR,
    targetId: input.id,
    metadata: { slug },
  });
  if (!audit.ok) {
    console.error('appendAdminAuditLog vendor.save:', audit.error);
  }

  revalidatePath('/admin/vendors');
  revalidatePath(`/admin/vendors/${input.id}`);
  revalidatePath(`/shop/vendors/${slug}`);

  return { ok: true, slug };
}
