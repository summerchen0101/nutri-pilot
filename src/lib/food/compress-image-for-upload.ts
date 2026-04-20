/** 瀏覽器端：將餐點照片上傳前壓縮（供 Log 客戶端呼叫）。 */

const DEFAULT_MAX_BYTES = 2 * 1024 * 1024;
const MAX_EDGE_PX = 2048;
const MIN_EDGE_PX = 360;

function baseName(file: File): string {
  const n = file.name.trim();
  const noExt = n.replace(/\.[^.]+$/, '');
  return noExt.length > 0 ? noExt : 'photo';
}

/**
 * 若檔案已小於等於上限則原樣回傳；否則重新編碼為 JPEG 並縮放／降品質直到 ≤ maxBytes。
 */
export async function compressImageForUpload(
  file: File,
  maxBytes: number = DEFAULT_MAX_BYTES,
): Promise<File> {
  if (file.size <= maxBytes) {
    return file;
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, {
      imageOrientation: 'from-image',
    });
  } catch {
    throw new Error('無法讀取圖片，請改用 JPG／PNG／WebP');
  }

  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('無法處理圖片');
    }

    let w = bitmap.width;
    let h = bitmap.height;
    const fit = Math.min(1, MAX_EDGE_PX / Math.max(w, h));
    w = Math.max(1, Math.round(w * fit));
    h = Math.max(1, Math.round(h * fit));

    let quality = 0.88;

    for (let i = 0; i < 48; i++) {
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(bitmap, 0, 0, w, h);

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/jpeg', quality);
      });

      if (!blob) {
        throw new Error('圖片壓縮失敗');
      }

      if (blob.size <= maxBytes) {
        return new File([blob], `${baseName(file)}.jpg`, {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });
      }

      if (quality > 0.42) {
        quality = Math.max(0.42, quality - 0.06);
        continue;
      }

      const nw = Math.max(MIN_EDGE_PX, Math.round(w * 0.85));
      const nh = Math.max(MIN_EDGE_PX, Math.round(h * 0.85));
      const cannotShrink = nw >= w && nh >= h;

      if (cannotShrink) {
        if (quality <= 0.2) {
          break;
        }
        quality = Math.max(0.2, quality - 0.06);
        continue;
      }

      w = nw;
      h = nh;
      quality = 0.82;
    }

    throw new Error('無法將照片壓縮至 2MB 以下，請改選較小的圖片');
  } finally {
    bitmap.close();
  }
}
