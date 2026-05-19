import { createClient } from '@/lib/supabase/client';

export const SIGNED_STORAGE_PREVIEW_TTL_SEC = 3600;

export type AnalysisPhotoBucket = 'food-photos' | 'label-guard-photos';

export async function createSignedStoragePreviewUrl(
  bucket: AnalysisPhotoBucket,
  storagePath: string,
): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(storagePath, SIGNED_STORAGE_PREVIEW_TTL_SEC);

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
