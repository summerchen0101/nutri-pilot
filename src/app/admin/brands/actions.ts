'use server';

import { revalidatePath } from 'next/cache';

import {
  ADMIN_AUDIT_ACTIONS,
  ADMIN_AUDIT_TARGET_TYPES,
} from '@/lib/admin/admin-audit-actions';
import { appendAdminAuditLog } from '@/lib/admin/append-admin-audit-log';
import { getAdminRole, staffCan } from '@/lib/admin';
import { createClient } from '@/lib/supabase/server';
import { makeBrandSlugBase } from '@/utils/admin-slug';

export async function saveBrand(input: {
  id?: string;
  name: string;
  slug?: string;
  vendor_id: string;
  is_active: boolean;
  description?: string | null;
  country?: string | null;
}): Promise<{ ok: false; error: string } | { ok: true; id: string }> {
  const role = await getAdminRole();
  if (!role || !staffCan(role, 'brand.manage')) {
    return { ok: false, error: '沒有權限' };
  }

  const supabase = createClient();
  const name = input.name.trim();
  if (!name) {
    return { ok: false, error: '請填品牌名稱' };
  }

  const slug = input.slug?.trim() || makeBrandSlugBase(name);

  const row = {
    name,
    slug,
    vendor_id: input.vendor_id,
    is_active: input.is_active,
    description: input.description?.trim() || null,
    country: input.country?.trim() || null,
  };

  if (input.id) {
    const { error } = await supabase.from('brands').update(row).eq('id', input.id);
    if (error) {
      return { ok: false, error: error.message };
    }
    const audit = await appendAdminAuditLog({
      action: ADMIN_AUDIT_ACTIONS.BRAND_SAVE,
      targetType: ADMIN_AUDIT_TARGET_TYPES.BRAND,
      targetId: input.id,
      metadata: { was_create: false },
    });
    if (!audit.ok) {
      console.error('appendAdminAuditLog brand.save:', audit.error);
    }
    revalidatePath('/admin/brands');
    revalidatePath(`/admin/brands/${input.id}`);
    return { ok: true, id: input.id };
  }

  const { data: inserted, error } = await supabase
    .from('brands')
    .insert(row)
    .select('id')
    .single();

  if (error || !inserted?.id) {
    return { ok: false, error: error?.message ?? '建立失敗' };
  }

  const newBrandId = inserted.id as string;
  const audit = await appendAdminAuditLog({
    action: ADMIN_AUDIT_ACTIONS.BRAND_SAVE,
    targetType: ADMIN_AUDIT_TARGET_TYPES.BRAND,
    targetId: newBrandId,
    metadata: { was_create: true },
  });
  if (!audit.ok) {
    console.error('appendAdminAuditLog brand.save:', audit.error);
  }

  revalidatePath('/admin/brands');
  return { ok: true, id: newBrandId };
}
