/** Shared image helpers for Vision Edge Functions (Deno). */

export function mediaTypeFromPath(
  path: string,
): "image/jpeg" | "image/png" | "image/webp" {
  const lower = path.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

export function toBase64(u8: Uint8Array): string {
  const CHUNK = 0x8000;
  let binary = "";
  for (let i = 0; i < u8.length; i += CHUNK) {
    binary += String.fromCharCode.apply(
      null,
      u8.subarray(i, i + CHUNK) as unknown as number[],
    );
  }
  return btoa(binary);
}
