'use server';

import { revalidatePath } from 'next/cache';

import {
  ADMIN_AUDIT_ACTIONS,
  ADMIN_AUDIT_TARGET_TYPES,
} from '@/lib/admin/admin-audit-actions';
import { appendAdminAuditLog } from '@/lib/admin/append-admin-audit-log';
import { getAdminRole, staffCan } from '@/lib/admin';
import { createClient } from '@/lib/supabase/server';

export async function saveAnnouncement(input: {
  id?: string;
  title: string;
  body: string;
  publishedAtIso: string;
  isActive: boolean;
}): Promise<{ ok: false; error: string } | { ok: true; id: string }> {
  const role = await getAdminRole();
  if (!role || !staffCan(role, 'announcement.manage')) {
    return { ok: false, error: '沒有權限' };
  }

  const title = input.title.trim();
  const body = input.body.trim();
  if (!title) {
    return { ok: false, error: '請填標題' };
  }
  if (!body) {
    return { ok: false, error: '請填內文' };
  }

  const publishedRaw = input.publishedAtIso.trim();
  if (!publishedRaw) {
    return { ok: false, error: '請選擇發布時間' };
  }
  const parsed = Date.parse(publishedRaw);
  if (Number.isNaN(parsed)) {
    return { ok: false, error: '發布時間格式無效' };
  }
  const published_at = new Date(parsed).toISOString();

  const supabase = createClient();
  const row = {
    title,
    body,
    published_at,
    is_active: input.isActive,
  };

  if (input.id) {
    const { error } = await supabase.from('announcements').update(row).eq('id', input.id);
    if (error) {
      return { ok: false, error: error.message };
    }
    const audit = await appendAdminAuditLog({
      action: ADMIN_AUDIT_ACTIONS.ANNOUNCEMENT_SAVE,
      targetType: ADMIN_AUDIT_TARGET_TYPES.ANNOUNCEMENT,
      targetId: input.id,
      metadata: { was_create: false },
    });
    if (!audit.ok) {
      console.error('appendAdminAuditLog announcement.save:', audit.error);
    }
    revalidatePath('/admin/announcements');
    revalidatePath(`/admin/announcements/${input.id}`);
    revalidatePath('/announcements');
    return { ok: true, id: input.id };
  }

  const { data: inserted, error } = await supabase
    .from('announcements')
    .insert(row)
    .select('id')
    .single();

  if (error || !inserted?.id) {
    return { ok: false, error: error?.message ?? '建立失敗' };
  }

  const newId = inserted.id as string;
  const audit = await appendAdminAuditLog({
    action: ADMIN_AUDIT_ACTIONS.ANNOUNCEMENT_SAVE,
    targetType: ADMIN_AUDIT_TARGET_TYPES.ANNOUNCEMENT,
    targetId: newId,
    metadata: { was_create: true },
  });
  if (!audit.ok) {
    console.error('appendAdminAuditLog announcement.save:', audit.error);
  }

  revalidatePath('/admin/announcements');
  revalidatePath(`/admin/announcements/${newId}`);
  revalidatePath('/announcements');

  return { ok: true, id: newId };
}

export async function deleteAnnouncement(input: {
  id: string;
}): Promise<{ ok: false; error: string } | { ok: true }> {
  const role = await getAdminRole();
  if (!role || !staffCan(role, 'announcement.delete')) {
    return { ok: false, error: '沒有權限' };
  }

  const supabase = createClient();
  const announcementId = input.id;
  const { error } = await supabase
    .from('announcements')
    .delete()
    .eq('id', announcementId);

  if (error) {
    return { ok: false, error: error.message };
  }

  const audit = await appendAdminAuditLog({
    action: ADMIN_AUDIT_ACTIONS.ANNOUNCEMENT_DELETE,
    targetType: ADMIN_AUDIT_TARGET_TYPES.ANNOUNCEMENT,
    targetId: announcementId,
    metadata: {},
  });
  if (!audit.ok) {
    console.error('appendAdminAuditLog announcement.delete:', audit.error);
  }

  revalidatePath('/admin/announcements');
  revalidatePath('/announcements');

  return { ok: true };
}
