'use server';

import { revalidatePath } from 'next/cache';

import {
  ADMIN_AUDIT_ACTIONS,
  ADMIN_AUDIT_TARGET_TYPES,
} from '@/lib/admin/admin-audit-actions';
import { appendAdminAuditLog } from '@/lib/admin/append-admin-audit-log';
import { getAdminRole, staffCan } from '@/lib/admin';
import { createClient } from '@/lib/supabase/server';

function parseOptionalIso(s: string | undefined): string | null {
  const t = s?.trim();
  if (!t) return null;
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export async function createPromoCampaign(input: {
  title: string;
  description: string;
  discountKind: 'percent' | 'fixed_amount';
  discountValue: number;
  minOrderTotal: number;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  showInMemberApp: boolean;
}): Promise<{ ok: false; error: string } | { ok: true; id: string }> {
  const role = await getAdminRole();
  if (!staffCan(role, 'promo.manage')) {
    return { ok: false, error: '沒有權限' };
  }

  const title = input.title.trim();
  if (title.length < 1) {
    return { ok: false, error: '請填寫標題' };
  }

  if (
    input.discountKind === 'percent'
    && (input.discountValue <= 0 || input.discountValue > 100)
  ) {
    return { ok: false, error: '折扣百分比須介於 1–100' };
  }

  if (input.discountKind === 'fixed_amount' && input.discountValue <= 0) {
    return { ok: false, error: '折抵金額須大於 0' };
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('promo_campaigns')
    .insert({
      title,
      description: input.description.trim() || null,
      discount_kind: input.discountKind,
      discount_value: input.discountValue,
      min_order_total: input.minOrderTotal,
      starts_at: parseOptionalIso(input.startsAt),
      ends_at: parseOptionalIso(input.endsAt),
      is_active: input.isActive,
      show_in_member_app: input.showInMemberApp,
    })
    .select('id')
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  const audit = await appendAdminAuditLog({
    action: ADMIN_AUDIT_ACTIONS.PROMO_CAMPAIGN_SAVE,
    targetType: ADMIN_AUDIT_TARGET_TYPES.PROMO_CAMPAIGN,
    targetId: data.id,
    metadata: { mode: 'create', title },
  });
  if (!audit.ok) {
    console.error('appendAdminAuditLog promo.campaign_save:', audit.error);
  }

  revalidatePath('/admin/promotions');
  return { ok: true, id: data.id };
}

export async function updatePromoCampaign(input: {
  id: string;
  title: string;
  description: string;
  discountKind: 'percent' | 'fixed_amount';
  discountValue: number;
  minOrderTotal: number;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  showInMemberApp: boolean;
}): Promise<{ ok: false; error: string } | { ok: true }> {
  const role = await getAdminRole();
  if (!staffCan(role, 'promo.manage')) {
    return { ok: false, error: '沒有權限' };
  }

  const title = input.title.trim();
  if (title.length < 1) {
    return { ok: false, error: '請填寫標題' };
  }

  if (
    input.discountKind === 'percent'
    && (input.discountValue <= 0 || input.discountValue > 100)
  ) {
    return { ok: false, error: '折扣百分比須介於 1–100' };
  }

  if (input.discountKind === 'fixed_amount' && input.discountValue <= 0) {
    return { ok: false, error: '折抵金額須大於 0' };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from('promo_campaigns')
    .update({
      title,
      description: input.description.trim() || null,
      discount_kind: input.discountKind,
      discount_value: input.discountValue,
      min_order_total: input.minOrderTotal,
      starts_at: parseOptionalIso(input.startsAt),
      ends_at: parseOptionalIso(input.endsAt),
      is_active: input.isActive,
      show_in_member_app: input.showInMemberApp,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.id);

  if (error) {
    return { ok: false, error: error.message };
  }

  const audit = await appendAdminAuditLog({
    action: ADMIN_AUDIT_ACTIONS.PROMO_CAMPAIGN_SAVE,
    targetType: ADMIN_AUDIT_TARGET_TYPES.PROMO_CAMPAIGN,
    targetId: input.id,
    metadata: { mode: 'update', title },
  });
  if (!audit.ok) {
    console.error('appendAdminAuditLog promo.campaign_save:', audit.error);
  }

  revalidatePath('/admin/promotions');
  revalidatePath(`/admin/promotions/${input.id}`);
  return { ok: true };
}

export async function addPromoCode(input: {
  campaignId: string;
  code: string;
  maxUses: string;
}): Promise<{ ok: false; error: string } | { ok: true }> {
  const role = await getAdminRole();
  if (!staffCan(role, 'promo.manage')) {
    return { ok: false, error: '沒有權限' };
  }

  const code = input.code.trim();
  if (code.length < 2) {
    return { ok: false, error: '優惠碼至少 2 字元' };
  }

  let maxUses: number | null = null;
  const rawMax = input.maxUses.trim();
  if (rawMax.length > 0) {
    const n = Number(rawMax);
    if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) {
      return { ok: false, error: '可用次數須為正整數或留空（不限）' };
    }
    maxUses = n;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('promo_codes')
    .insert({
      campaign_id: input.campaignId,
      code,
      max_uses: maxUses,
    })
    .select('id')
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  const audit = await appendAdminAuditLog({
    action: ADMIN_AUDIT_ACTIONS.PROMO_CODE_SAVE,
    targetType: ADMIN_AUDIT_TARGET_TYPES.PROMO_CODE,
    targetId: data.id,
    metadata: { campaign_id: input.campaignId, code },
  });
  if (!audit.ok) {
    console.error('appendAdminAuditLog promo.code_save:', audit.error);
  }

  revalidatePath(`/admin/promotions/${input.campaignId}`);
  return { ok: true };
}

export async function deletePromoCode(input: {
  codeId: string;
  campaignId: string;
}): Promise<{ ok: false; error: string } | { ok: true }> {
  const role = await getAdminRole();
  if (role !== 'super_admin') {
    return { ok: false, error: '僅超級管理員可刪除優惠碼' };
  }

  const supabase = createClient();
  const { error } = await supabase.from('promo_codes').delete().eq('id', input.codeId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath(`/admin/promotions/${input.campaignId}`);
  return { ok: true };
}
