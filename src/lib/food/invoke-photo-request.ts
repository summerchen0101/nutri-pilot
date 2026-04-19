import {
  FunctionsFetchError,
  FunctionsHttpError,
} from '@supabase/supabase-js';

import { createClient } from '@/lib/supabase/client';

/**
 * 必須在瀏覽器呼叫：Server Action 內 `getSession()` 可能拿不到完整 `access_token`，
 * Edge `ai-photo-request` 會回 401 Unauthorized。
 *
 * 使用 `functions.invoke`，由 SDK 組裝與閘道一致的標頭；避免手動 fetch 出現 Failed to fetch。
 */
export async function invokeAiPhotoRequestFromBrowser(
  storagePath: string,
): Promise<{
  jobId?: string;
  hint?: string;
  queued?: boolean;
  error?: string;
}> {
  const supabase = createClient();
  const {
    data: { session },
    error: sessErr,
  } = await supabase.auth.getSession();

  if (sessErr || !session?.access_token) {
    return { error: '無法取得登入憑證，請重新整理頁面或重新登入' };
  }

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return { error: '缺少 Supabase 環境變數' };
  }

  const { data, error } = await supabase.functions.invoke<{
    jobId?: string;
    queued?: boolean;
    hint?: string;
    error?: string;
  }>('ai-photo-request', {
    body: { storagePath },
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (error) {
    if (error instanceof FunctionsHttpError) {
      try {
        const ctx = await error.context.json();
        const j = ctx as { error?: string };
        if (typeof j.error === 'string' && j.error.length > 0) {
          return { error: j.error };
        }
      } catch {
        /* ignore parse */
      }
      return {
        error:
          error.message ||
          `Edge Function 回應異常（HTTP）。請確認已部署 ai-photo-request。`,
      };
    }

    if (error instanceof FunctionsFetchError) {
      return {
        error:
          '無法連線到 Edge Function。請確認瀏覽器可連到 Supabase、`NEXT_PUBLIC_SUPABASE_URL` 為目前專案網址，並已部署 `ai-photo-request`。',
      };
    }

    return { error: error.message ?? '無法呼叫 Edge Function' };
  }

  const j = data;
  if (!j?.jobId) {
    return { error: j?.error ?? '未回傳 jobId' };
  }

  let hint = j.hint;
  if (j.queued === false && hint == null) {
    hint =
      'QStash 排隊失敗（queued=false）。請確認 Edge secrets：QSTASH_TOKEN 為 Upstash「QStash Token」（不是 Signing Key）；EDGE_FUNCTIONS_URL=https://<專案>.supabase.co/functions/v1。重新部署 ai-photo-request 後，Response 會帶 hint 顯示 QStash HTTP 錯誤。';
  }

  return { jobId: j.jobId, hint, queued: j.queued };
}
