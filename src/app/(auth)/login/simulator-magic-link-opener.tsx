'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { isCapacitorNativePlatform } from '@/lib/capacitor';

/**
 * Simulator 用：Magic Link 須在同一 WebView 開啟（PKCE cookie）。
 * xcrun openurl 常改開 Safari，會導致「無法完成登入」。
 */
export function SimulatorMagicLinkOpener() {
  const [link, setLink] = useState('');

  if (!isCapacitorNativePlatform()) {
    return null;
  }

  function handleOpen() {
    const url = link.trim();
    if (!url) {
      return;
    }
    window.location.assign(url);
  }

  return (
    <div className="space-y-2 rounded-lg border-hairline border-border bg-slate-50/80 p-3">
      <p className="text-caption text-slate-600">
        Simulator：請貼上信箱裡的 Magic Link，在 App 內開啟。勿用 xcrun
        openurl。若畫面底部出現 Safari 網址列（返回／分頁），代表開在瀏覽器，Nutri
        Guard App 仍不會登入——請回到 App 用此欄位重試（需重新寄信）。
      </p>
      <Input
        type="url"
        placeholder="https://....supabase.co/auth/v1/verify?..."
        value={link}
        onChange={(e) => setLink(e.target.value)}
        autoComplete="off"
      />
      <Button type="button" variant="outline" className="w-full" onClick={handleOpen}>
        在 App 內開啟連結
      </Button>
    </div>
  );
}
