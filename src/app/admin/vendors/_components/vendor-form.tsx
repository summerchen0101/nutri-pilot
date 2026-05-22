'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';

import { saveVendorProfile } from '@/app/admin/vendors/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';

interface VendorFormInitial {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  banner_url: string | null;
  logo_url: string | null;
  shipping_fee: number;
  free_shipping_threshold: number | null;
  lead_time_days: number;
  is_active: boolean;
}

interface VendorFormProps {
  initial: VendorFormInitial;
  canEdit: boolean;
}

async function uploadVendorImage(
  vendorId: string,
  kind: 'banner' | 'logo',
  file: File,
): Promise<string> {
  const supabase = createClient();
  const path = `vendors/${vendorId}/${kind}`;
  const { error: upErr } = await supabase.storage
    .from('product-images')
    .upload(path, file, {
      upsert: true,
      contentType: file.type || 'image/jpeg',
    });
  if (upErr) {
    throw new Error(upErr.message);
  }
  const { data: pub } = supabase.storage.from('product-images').getPublicUrl(path);
  return pub.publicUrl;
}

export function VendorForm({ initial, canEdit }: VendorFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [name, setName] = useState(initial.name);
  const [slug, setSlug] = useState(initial.slug);
  const [description, setDescription] = useState(initial.description ?? '');
  const [bannerUrl, setBannerUrl] = useState(initial.banner_url ?? '');
  const [logoUrl, setLogoUrl] = useState(initial.logo_url ?? '');
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [shippingFee, setShippingFee] = useState(String(initial.shipping_fee));
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(
    initial.free_shipping_threshold == null ?
      ''
    : String(initial.free_shipping_threshold),
  );
  const [leadTimeDays, setLeadTimeDays] = useState(String(initial.lead_time_days));
  const [isActive, setIsActive] = useState(initial.is_active);

  const bannerPreview = useMemo(() => {
    if (bannerFile) return URL.createObjectURL(bannerFile);
    return bannerUrl.trim() || null;
  }, [bannerFile, bannerUrl]);

  const logoPreview = useMemo(() => {
    if (logoFile) return URL.createObjectURL(logoFile);
    return logoUrl.trim() || null;
  }, [logoFile, logoUrl]);

  function parseNum(raw: string): number | null {
    if (raw.trim() === '') return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canEdit) return;

    setError(null);
    setMessage(null);

    const fee = parseNum(shippingFee);
    const lead = parseNum(leadTimeDays);
    const thresholdRaw = freeShippingThreshold.trim();
    const threshold = thresholdRaw === '' ? null : parseNum(thresholdRaw);

    if (fee == null || fee < 0) {
      setError('運費請填有效數字');
      return;
    }
    if (lead == null || lead < 0) {
      setError('備貨天數請填有效數字');
      return;
    }
    if (thresholdRaw !== '' && threshold == null) {
      setError('免運門檻格式不正確');
      return;
    }

    startTransition(() => {
      void (async () => {
        try {
          let nextBannerUrl = bannerUrl.trim() || null;
          let nextLogoUrl = logoUrl.trim() || null;

          if (bannerFile) {
            nextBannerUrl = await uploadVendorImage(initial.id, 'banner', bannerFile);
            setBannerUrl(nextBannerUrl);
            setBannerFile(null);
          }
          if (logoFile) {
            nextLogoUrl = await uploadVendorImage(initial.id, 'logo', logoFile);
            setLogoUrl(nextLogoUrl);
            setLogoFile(null);
          }

          const res = await saveVendorProfile({
            id: initial.id,
            name,
            slug,
            description,
            banner_url: nextBannerUrl,
            logo_url: nextLogoUrl,
            shipping_fee: fee,
            free_shipping_threshold: threshold,
            lead_time_days: Math.floor(lead),
            is_active: isActive,
          });

          if (!res.ok) {
            setError(res.error);
            return;
          }

          setMessage('已儲存');
          router.refresh();
        } catch (err) {
          setError(err instanceof Error ? err.message : '儲存失敗');
        }
      })();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-lg space-y-6">
      <div>
        <Link
          href="/admin/vendors"
          className="text-caption text-[#4C956C] hover:underline"
        >
          ← 廠商列表
        </Link>
        <h1 className="mt-2 text-heading-screen text-foreground">編輯廠商</h1>
        {!canEdit ?
          <p className="mt-2 text-caption text-muted-foreground">
            你目前為唯讀權限；儲存需超級管理員。
          </p>
        : null}
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-body font-medium">名稱</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!canEdit || pending}
            className="mt-1"
          />
        </div>

        <div>
          <label className="text-body font-medium">slug</label>
          <Input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            disabled={!canEdit || pending}
            className="mt-1 font-mono"
          />
          <p className="mt-1 text-caption text-muted-foreground">
            前台路徑：/shop/vendors/{slug || '…'}
          </p>
        </div>

        <div>
          <label className="text-body font-medium">簡介</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={!canEdit || pending}
            rows={4}
            className="mt-1 w-full rounded-[10px] border-hairline border-border bg-background px-3 py-2 text-body"
          />
        </div>

        <div>
          <label className="text-body font-medium">Banner 圖</label>
          {bannerPreview ?
            <div className="relative mt-2 aspect-[3/1] w-full overflow-hidden rounded-xl bg-muted">
              <Image
                src={bannerPreview}
                alt=""
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          : null}
          {canEdit ?
            <Input
              type="file"
              accept="image/*"
              disabled={pending}
              className="mt-2"
              onChange={(e) => {
                setBannerFile(e.target.files?.[0] ?? null);
              }}
            />
          : null}
        </div>

        <div>
          <label className="text-body font-medium">Logo</label>
          {logoPreview ?
            <div className="relative mt-2 h-16 w-16 overflow-hidden rounded-xl bg-muted">
              <Image src={logoPreview} alt="" fill className="object-cover" unoptimized />
            </div>
          : null}
          {canEdit ?
            <Input
              type="file"
              accept="image/*"
              disabled={pending}
              className="mt-2"
              onChange={(e) => {
                setLogoFile(e.target.files?.[0] ?? null);
              }}
            />
          : null}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-body font-medium">運費（NT$）</label>
            <Input
              value={shippingFee}
              onChange={(e) => setShippingFee(e.target.value)}
              disabled={!canEdit || pending}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-body font-medium">免運門檻</label>
            <Input
              value={freeShippingThreshold}
              onChange={(e) => setFreeShippingThreshold(e.target.value)}
              disabled={!canEdit || pending}
              placeholder="留空表示無"
              className="mt-1"
            />
          </div>
        </div>

        <div>
          <label className="text-body font-medium">備貨天數</label>
          <Input
            value={leadTimeDays}
            onChange={(e) => setLeadTimeDays(e.target.value)}
            disabled={!canEdit || pending}
            className="mt-1"
          />
        </div>

        <label className="flex items-center gap-2 text-body">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            disabled={!canEdit || pending}
          />
          上架中
        </label>
      </div>

      {error ?
        <p className="text-caption text-[#E24B4A]" role="alert">
          {error}
        </p>
      : null}
      {message ?
        <p className="text-caption text-[#2D6B4A]" role="status">
          {message}
        </p>
      : null}

      {canEdit ?
        <Button type="submit" disabled={pending}>
          {pending ? '儲存中…' : '儲存'}
        </Button>
      : null}
    </form>
  );
}
