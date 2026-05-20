import { compressImageForUpload } from '@/lib/food/compress-image-for-upload';

export type ClaudeImageMediaType = 'image/jpeg' | 'image/png' | 'image/webp';

export type ClaudeImagePayload = {
  imageBase64: string;
  imageMediaType: ClaudeImageMediaType;
};

function mediaTypeFromMime(mime: string): ClaudeImageMediaType | null {
  if (mime === 'image/jpeg' || mime === 'image/jpg') return 'image/jpeg';
  if (mime === 'image/png') return 'image/png';
  if (mime === 'image/webp') return 'image/webp';
  return null;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('無法讀取圖片'));
      }
    };
    reader.onerror = () => reject(new Error('無法讀取圖片'));
    reader.readAsDataURL(file);
  });
}

function base64FromDataUrl(dataUrl: string): string {
  const comma = dataUrl.indexOf(',');
  if (comma < 0) {
    throw new Error('圖片格式異常');
  }
  return dataUrl.slice(comma + 1);
}

/**
 * 壓縮後轉成 Claude Vision 所需的 base64 payload。
 */
export async function imageFileToClaudePayload(
  file: File,
): Promise<ClaudeImagePayload> {
  const compressed = await compressImageForUpload(file);
  const dataUrl = await readFileAsDataUrl(compressed);
  const mediaType =
    mediaTypeFromMime(compressed.type) ??
    mediaTypeFromMime(dataUrl.slice(5, dataUrl.indexOf(';'))) ??
    'image/jpeg';

  return {
    imageBase64: base64FromDataUrl(dataUrl),
    imageMediaType: mediaType,
  };
}
