/**
 * Server-only: calls `recalculate-scores` Edge Function when env is configured.
 * Safe to no-op when the function is not deployed or secrets are missing.
 */
export async function triggerRecalculateScores(userId: string): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!baseUrl || !key) return;

  try {
    await fetch(`${baseUrl}/functions/v1/recalculate-scores`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    });
  } catch {
    /* non-fatal — worker may not exist yet */
  }
}
