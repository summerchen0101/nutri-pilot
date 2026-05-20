'use client';

import { ImagePlus, X } from 'lucide-react';
import { useCallback, useEffect, useRef } from 'react';

import type { ClaudeImagePayload } from '@/lib/ai/image-file-to-claude-payload';
import { imageFileToClaudePayload } from '@/lib/ai/image-file-to-claude-payload';
import { cn } from '@/lib/utils/cn';

export interface DashboardAiSpriteInputProps {
  message: string;
  onMessageChange: (value: string) => void;
  disabled: boolean;
  previewUrl: string | null;
  onPreviewUrlChange: (url: string | null) => void;
  imagePayload: ClaudeImagePayload | null;
  onImagePayloadChange: (payload: ClaudeImagePayload | null) => void;
  imageProcessing: boolean;
  onImageProcessingChange: (busy: boolean) => void;
  imageError: string | null;
  onImageErrorChange: (error: string | null) => void;
}

export function DashboardAiSpriteInput({
  message,
  onMessageChange,
  disabled,
  previewUrl,
  onPreviewUrlChange,
  imagePayload,
  onImagePayloadChange,
  imageProcessing,
  onImageProcessingChange,
  imageError,
  onImageErrorChange,
}: DashboardAiSpriteInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const clearAttachedImage = useCallback(() => {
    if (previewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    onPreviewUrlChange(null);
    onImagePayloadChange(null);
    onImageErrorChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [
    onImageErrorChange,
    onImagePayloadChange,
    onPreviewUrlChange,
    previewUrl,
  ]);

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileChange = useCallback(
    async (ev: React.ChangeEvent<HTMLInputElement>) => {
      const file = ev.target.files?.[0] ?? null;
      ev.target.value = '';
      if (!file) return;

      if (previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
      onPreviewUrlChange(null);
      onImagePayloadChange(null);
      onImageProcessingChange(true);
      onImageErrorChange(null);

      try {
        const payload = await imageFileToClaudePayload(file);
        const objectUrl = URL.createObjectURL(file);
        onPreviewUrlChange(objectUrl);
        onImagePayloadChange(payload);
      } catch (e) {
        onImageErrorChange(
          e instanceof Error ? e.message : '圖片處理失敗',
        );
      } finally {
        onImageProcessingChange(false);
      }
    },
    [
      onImageErrorChange,
      onImagePayloadChange,
      onImageProcessingChange,
      onPreviewUrlChange,
      previewUrl,
    ],
  );

  const hasImage = imagePayload != null && previewUrl != null;

  return (
    <div className="space-y-2">
      {previewUrl ?
        <div className="relative overflow-hidden rounded-[10px] border-hairline border-[#378ADD]/50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="已選擇的餐點照片"
            className="h-28 w-full object-cover"
          />
          <button
            type="button"
            disabled={disabled || imageProcessing}
            onClick={clearAttachedImage}
            aria-label="移除照片"
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-foreground/70 text-background">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      : null}

      <div className="relative">
        <label htmlFor="ai-sprite-input" className="sr-only">
          快速紀錄內容
        </label>
        <textarea
          id="ai-sprite-input"
          rows={4}
          value={message}
          onChange={(ev) => onMessageChange(ev.target.value)}
          disabled={disabled || imageProcessing}
          placeholder="例：早餐吃這些；午餐雞腿便當；跑步 40 分鐘"
          className={cn(
            'w-full resize-none rounded-[10px] border-hairline border-[#378ADD]/50 bg-[#F5FAFF] p-3 pr-10 pb-10 text-body leading-relaxed text-foreground outline-none placeholder:text-muted-foreground focus:border-primary',
          )}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(ev) => void handleFileChange(ev)}
        />
        <button
          type="button"
          disabled={disabled || imageProcessing}
          onClick={() => fileInputRef.current?.click()}
          aria-label="附加照片"
          className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-lg text-[#378ADD] transition-colors hover:bg-[#E6F1FB] disabled:opacity-40">
          <ImagePlus className="h-[18px] w-[18px]" aria-hidden />
        </button>
      </div>

      {imageError ?
        <p className="text-caption text-[#E24B4A]" role="alert">
          {imageError}
        </p>
      : null}
      {imageProcessing ?
        <p className="text-caption text-muted-foreground">圖片處理中…</p>
      : null}
      {!imageProcessing && hasImage ?
        <p className="text-caption text-muted-foreground">
          已附加照片，可搭配文字或直接解析
        </p>
      : null}
    </div>
  );
}
