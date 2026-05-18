import { createClient } from '@/lib/supabase/server';
import type { Json } from '@/types/supabase';

import type { AdminAuditAction } from './admin-audit-actions';

function toJsonMetadata(metadata: Record<string, unknown> | undefined): Json {
  return (metadata ?? {}) as Json;
}

/**
 * 呼叫 `admin_append_audit_log`（RLS + staff JWT）；供 Server Actions 於業務寫入成功後使用。
 * 失敗時請由呼叫端決定是否繼續回傳業務成功並另行記錄。
 */
export async function appendAdminAuditLog(input: {
  action: AdminAuditAction;
  targetType: string | null;
  targetId: string | null;
  metadata?: Record<string, unknown>;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createClient();

  const { error } = await supabase.rpc('admin_append_audit_log', {
    p_action: input.action,
    p_target_type: input.targetType,
    p_target_id: input.targetId,
    p_metadata: toJsonMetadata(input.metadata),
  });

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
