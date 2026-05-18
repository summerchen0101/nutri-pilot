'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';

import {
  deleteProduct,
  saveProduct,
  updateProductImageUrl,
} from '@/app/admin/products/actions';
import type { ProductSavePayload, VariantSaveLine } from '@/app/admin/products/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ALLERGEN_FREE_OPTIONS,
  CERT_TAG_OPTIONS,
  DIET_TAG_OPTIONS,
  PRODUCT_CATEGORIES,
} from '@/lib/admin/product-taxonomy';
import { createClient } from '@/lib/supabase/client';

type VariantRow = VariantSaveLine & { clientKey: string };

export type ProductEditorInitial = {
  id: string;
  slug: string;
  name: string;
  brand_id: string;
  category: string;
  description: string | null;
  image_url: string | null;
  serving_size_g: number;
  calories: number;
  carb_g: number;
  protein_g: number;
  fat_g: number;
  fiber_g: number | null;
  sugar_g: number | null;
  sodium_mg: number | null;
  diet_tags: string[] | null;
  cert_tags: string[] | null;
  allergen_free: string[] | null;
  ingredients: string | null;
  origin: string | null;
  is_active: boolean | null;
  variants: {
    id: string;
    label: string;
    weight_g: number;
    price: number;
    list_price: number | null;
    stock: number | null;
  }[];
};

function newClientKey(): string {
  return crypto.randomUUID();
}

function buildVariantRows(
  initial?: ProductEditorInitial | null,
): VariantRow[] {
  if (!initial?.variants?.length) {
    return [
      {
        clientKey: newClientKey(),
        label: '預設規格',
        weight_g: 100,
        price: 0,
        list_price: null,
        stock: 0,
      },
    ];
  }
  return initial.variants.map((v) => ({
    clientKey: v.id,
    id: v.id,
    label: v.label,
    weight_g: v.weight_g,
    price: v.price,
    list_price: v.list_price,
    stock: v.stock ?? 0,
  }));
}

export function ProductEditor({
  brands,
  initial,
  canDelete,
}: Readonly<{
  brands: { id: string; name: string }[];
  initial?: ProductEditorInitial | null;
  canDelete: boolean;
}>) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [name, setName] = useState(initial?.name ?? '');
  const [brandId, setBrandId] = useState(initial?.brand_id ?? brands[0]?.id ?? '');
  const [category, setCategory] = useState(
    initial?.category ?? PRODUCT_CATEGORIES[0],
  );
  const [description, setDescription] = useState(initial?.description ?? '');
  const [imageUrl, setImageUrl] = useState(initial?.image_url ?? '');
  const [servingG, setServingG] = useState(String(initial?.serving_size_g ?? ''));
  const [calories, setCalories] = useState(String(initial?.calories ?? ''));
  const [carbG, setCarbG] = useState(String(initial?.carb_g ?? ''));
  const [proteinG, setProteinG] = useState(String(initial?.protein_g ?? ''));
  const [fatG, setFatG] = useState(String(initial?.fat_g ?? ''));
  const [fiberG, setFiberG] = useState(
    initial?.fiber_g != null ? String(initial.fiber_g) : '',
  );
  const [sugarG, setSugarG] = useState(
    initial?.sugar_g != null ? String(initial.sugar_g) : '',
  );
  const [sodiumMg, setSodiumMg] = useState(
    initial?.sodium_mg != null ? String(initial.sodium_mg) : '',
  );
  const [ingredients, setIngredients] = useState(initial?.ingredients ?? '');
  const [origin, setOrigin] = useState(initial?.origin ?? '');
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);

  const [dietTags, setDietTags] = useState<string[]>(initial?.diet_tags ?? []);
  const [certTags, setCertTags] = useState<string[]>(initial?.cert_tags ?? []);
  const [allergenFree, setAllergenFree] = useState<string[]>(
    initial?.allergen_free ?? [],
  );

  const [variants, setVariants] = useState<VariantRow[]>(() =>
    buildVariantRows(initial),
  );

  const previewSrc = useMemo(() => {
    if (imageFile) {
      return URL.createObjectURL(imageFile);
    }
    return imageUrl || null;
  }, [imageFile, imageUrl]);

  function toggleTag(
    list: string[],
    setList: (v: string[]) => void,
    value: string,
  ) {
    if (list.includes(value)) {
      setList(list.filter((x) => x !== value));
    } else {
      setList([...list, value]);
    }
  }

  function parseNum(raw: string): number | null {
    if (raw.trim() === '') {
      return null;
    }
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }

  async function uploadCover(productId: string): Promise<void> {
    if (!imageFile) {
      return;
    }
    const supabase = createClient();
    const path = `products/${productId}/cover`;
    const { error: upErr } = await supabase.storage
      .from('product-images')
      .upload(path, imageFile, {
        upsert: true,
        contentType: imageFile.type || 'image/jpeg',
      });
    if (upErr) {
      throw new Error(upErr.message);
    }
    const { data: pub } = supabase.storage
      .from('product-images')
      .getPublicUrl(path);
    const res = await updateProductImageUrl(productId, pub.publicUrl);
    if (!res.ok) {
      throw new Error(res.error);
    }
    setImageUrl(pub.publicUrl);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const serving = parseNum(servingG);
    const cal = parseNum(calories);
    const carb = parseNum(carbG);
    const prot = parseNum(proteinG);
    const fat = parseNum(fatG);
    if (
      serving === null ||
      cal === null ||
      carb === null ||
      prot === null ||
      fat === null
    ) {
      setError('營養欄位請填有效數字');
      return;
    }

    const fiber = fiberG.trim() === '' ? null : parseNum(fiberG);
    const sugar = sugarG.trim() === '' ? null : parseNum(sugarG);
    const sodium = sodiumMg.trim() === '' ? null : parseNum(sodiumMg);
    if (fiber === null && fiberG.trim() !== '') {
      setError('纖維格式不正確');
      return;
    }
    if (sugar === null && sugarG.trim() !== '') {
      setError('糖格式不正確');
      return;
    }
    if (sodium === null && sodiumMg.trim() !== '') {
      setError('鈉格式不正確');
      return;
    }

    const lines: VariantSaveLine[] = [];
    for (const row of variants) {
      const wg = parseNum(String(row.weight_g));
      const pr = parseNum(String(row.price));
      const st = parseNum(String(row.stock));
      const lpRaw = row.list_price;
      const lp =
        lpRaw === null || lpRaw === undefined || String(lpRaw) === ''
          ? null
          : parseNum(String(lpRaw));
      if (wg === null || pr === null || st === null) {
        setError('規格的重量、售價、庫存需為有效數字');
        return;
      }
      if (lp === null && lpRaw !== null && String(lpRaw) !== '') {
        setError('規格定價格式不正確');
        return;
      }
      lines.push({
        id: row.id,
        label: row.label.trim(),
        weight_g: wg,
        price: pr,
        list_price: lp,
        stock: st,
      });
    }

    if (!name.trim()) {
      setError('請填商品名稱');
      return;
    }

    if (!brandId) {
      setError('請選擇品牌');
      return;
    }

    const payload: ProductSavePayload = {
      id: initial?.id,
      name: name.trim(),
      brand_id: brandId,
      category,
      description: description.trim() || null,
      image_url: imageUrl.trim() || null,
      serving_size_g: serving,
      calories: cal,
      carb_g: carb,
      protein_g: prot,
      fat_g: fat,
      fiber_g: fiber,
      sugar_g: sugar,
      sodium_mg: sodium,
      diet_tags: dietTags,
      cert_tags: certTags,
      allergen_free: allergenFree,
      ingredients: ingredients.trim() || null,
      origin: origin.trim() || null,
      is_active: isActive,
      variants: lines,
    };

    startTransition(() => {
      void (async () => {
        const saved = await saveProduct(payload);
        if (!saved.ok) {
          setError(saved.error);
          return;
        }
        try {
          await uploadCover(saved.id);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : '圖片上傳失敗';
          setError(msg);
          return;
        }
        router.push(`/admin/products/${saved.id}`);
        router.refresh();
      })();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link
            href="/admin/products"
            className="text-caption text-[#4C956C] hover:underline"
          >
            ← 返回列表
          </Link>
          <h1 className="mt-2 text-heading-screen text-foreground">
            {initial ? '編輯商品' : '新增商品'}
          </h1>
          {initial ? (
            <p className="text-caption text-slate-600">slug：{initial.slug}</p>
          ) : null}
        </div>
        <Button type="submit" variant="default" disabled={pending}>
          {pending ? '儲存中…' : '儲存'}
        </Button>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-body text-red-700">
          {error}
        </p>
      ) : null}

      <section className="space-y-4 rounded-xl border border-border bg-background p-4">
        <h2 className="text-heading-section text-foreground">基本</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <label className="text-body font-medium">名稱</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <label className="text-body font-medium">品牌</label>
            <select
              className="flex h-11 w-full rounded-[10px] border border-border bg-background px-3 text-body"
              value={brandId}
              onChange={(e) => setBrandId(e.target.value)}
              required
            >
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-body font-medium">分類</label>
            <select
              className="flex h-11 w-full rounded-[10px] border border-border bg-background px-3 text-body"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {PRODUCT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-body sm:col-span-2">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            上架中
          </label>
          <div className="space-y-2 sm:col-span-2">
            <label className="text-body font-medium">描述</label>
            <textarea
              className="min-h-[88px] w-full rounded-[10px] border border-border bg-background px-3 py-2 text-body"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-background p-4">
        <h2 className="text-heading-section text-foreground">商品圖</h2>
        <Input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
        />
        {previewSrc ? (
          <div className="h-40 w-40 overflow-hidden rounded-xl border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewSrc}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
        ) : null}
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-background p-4">
        <h2 className="text-heading-section text-foreground">營養（每份）</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-body font-medium">份量（g）</label>
            <Input
              inputMode="decimal"
              value={servingG}
              onChange={(e) => setServingG(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-body font-medium">熱量（kcal）</label>
            <Input
              inputMode="decimal"
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-body font-medium">碳水（g）</label>
            <Input
              inputMode="decimal"
              value={carbG}
              onChange={(e) => setCarbG(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-body font-medium">蛋白質（g）</label>
            <Input
              inputMode="decimal"
              value={proteinG}
              onChange={(e) => setProteinG(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-body font-medium">脂肪（g）</label>
            <Input
              inputMode="decimal"
              value={fatG}
              onChange={(e) => setFatG(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-body font-medium">纖維（g，選填）</label>
            <Input
              inputMode="decimal"
              value={fiberG}
              onChange={(e) => setFiberG(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-body font-medium">糖（g，選填）</label>
            <Input
              inputMode="decimal"
              value={sugarG}
              onChange={(e) => setSugarG(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-body font-medium">鈉（mg，選填）</label>
            <Input
              inputMode="decimal"
              value={sodiumMg}
              onChange={(e) => setSodiumMg(e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-background p-4">
        <h2 className="text-heading-section text-foreground">推薦標籤</h2>
        <fieldset className="space-y-2">
          <legend className="text-heading-card text-foreground">飲食法</legend>
          <div className="flex flex-wrap gap-3">
            {DIET_TAG_OPTIONS.map((t) => (
              <label key={t.value} className="flex items-center gap-2 text-body">
                <input
                  type="checkbox"
                  checked={dietTags.includes(t.value)}
                  onChange={() => toggleTag(dietTags, setDietTags, t.value)}
                />
                {t.label}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="space-y-2">
          <legend className="text-heading-card text-foreground">認證</legend>
          <div className="flex flex-wrap gap-3">
            {CERT_TAG_OPTIONS.map((t) => (
              <label key={t.value} className="flex items-center gap-2 text-body">
                <input
                  type="checkbox"
                  checked={certTags.includes(t.value)}
                  onChange={() => toggleTag(certTags, setCertTags, t.value)}
                />
                {t.label}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="space-y-2">
          <legend className="text-heading-card text-foreground">不含過敏原</legend>
          <div className="flex flex-wrap gap-3">
            {ALLERGEN_FREE_OPTIONS.map((t) => (
              <label key={t.value} className="flex items-center gap-2 text-body">
                <input
                  type="checkbox"
                  checked={allergenFree.includes(t.value)}
                  onChange={() =>
                    toggleTag(allergenFree, setAllergenFree, t.value)
                  }
                />
                {t.label}
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-background p-4">
        <h2 className="text-heading-section text-foreground">成分與產地</h2>
        <div className="space-y-2">
          <label className="text-body font-medium">成分</label>
          <textarea
            className="min-h-[72px] w-full rounded-[10px] border border-border bg-background px-3 py-2 text-body"
            value={ingredients}
            onChange={(e) => setIngredients(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <label className="text-body font-medium">產地</label>
          <Input value={origin} onChange={(e) => setOrigin(e.target.value)} />
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-background p-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-heading-section text-foreground">規格</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setVariants((vs) => [
                ...vs,
                {
                  clientKey: newClientKey(),
                  label: '',
                  weight_g: 100,
                  price: 0,
                  list_price: null,
                  stock: 0,
                },
              ])
            }
          >
            新增規格
          </Button>
        </div>
        <div className="space-y-4">
          {variants.map((row, idx) => (
            <div
              key={row.clientKey}
              className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-5"
            >
              <div className="space-y-1 sm:col-span-2">
                <label className="text-caption text-slate-600">名稱</label>
                <Input
                  value={row.label}
                  onChange={(e) =>
                    setVariants((vs) =>
                      vs.map((r, i) =>
                        i === idx ? { ...r, label: e.target.value } : r,
                      ),
                    )
                  }
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-caption text-slate-600">重量（g）</label>
                <Input
                  inputMode="decimal"
                  value={String(row.weight_g)}
                  onChange={(e) =>
                    setVariants((vs) =>
                      vs.map((r, i) =>
                        i === idx
                          ? { ...r, weight_g: Number(e.target.value) || 0 }
                          : r,
                      ),
                    )
                  }
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-caption text-slate-600">售價</label>
                <Input
                  inputMode="decimal"
                  value={String(row.price)}
                  onChange={(e) =>
                    setVariants((vs) =>
                      vs.map((r, i) =>
                        i === idx
                          ? { ...r, price: Number(e.target.value) || 0 }
                          : r,
                      ),
                    )
                  }
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-caption text-slate-600">定價（選填）</label>
                <Input
                  inputMode="decimal"
                  value={
                    row.list_price === null || row.list_price === undefined
                      ? ''
                      : String(row.list_price)
                  }
                  onChange={(e) =>
                    setVariants((vs) =>
                      vs.map((r, i) =>
                        i === idx
                          ? {
                              ...r,
                              list_price:
                                e.target.value.trim() === ''
                                  ? null
                                  : Number(e.target.value),
                            }
                          : r,
                      ),
                    )
                  }
                />
              </div>
              <div className="space-y-1">
                <label className="text-caption text-slate-600">庫存</label>
                <Input
                  inputMode="numeric"
                  value={String(row.stock)}
                  onChange={(e) =>
                    setVariants((vs) =>
                      vs.map((r, i) =>
                        i === idx
                          ? { ...r, stock: Number(e.target.value) || 0 }
                          : r,
                      ),
                    )
                  }
                  required
                />
              </div>
              {variants.length > 1 ? (
                <div className="sm:col-span-5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setVariants((vs) => vs.filter((_, i) => i !== idx))
                    }
                  >
                    移除此列
                  </Button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <div className="flex justify-end gap-3">
        <Button type="submit" variant="default" disabled={pending}>
          {pending ? '儲存中…' : '儲存'}
        </Button>
      </div>

      {initial && canDelete ? (
        <DeleteProductSection productId={initial.id} />
      ) : null}
    </form>
  );
}

function DeleteProductSection({ productId }: Readonly<{ productId: string }>) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <section className="rounded-xl border border-red-200 bg-red-50/40 p-4">
      <h2 className="text-heading-section text-red-800">危險區域</h2>
      <p className="mt-2 text-body text-red-900">
        刪除後無法復原；若訂單仍引用規格可能失敗。
      </p>
      {msg ? <p className="mt-2 text-body text-red-800">{msg}</p> : null}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-3 border-red-300 text-red-800"
        disabled={pending}
        onClick={() => {
          setMsg(null);
          startTransition(() => {
            void (async () => {
              const res = await deleteProduct(productId);
              if (!res.ok) {
                setMsg(res.error);
                return;
              }
              router.replace('/admin/products');
              router.refresh();
            })();
          });
        }}
      >
        {pending ? '刪除中…' : '刪除此商品'}
      </Button>
    </section>
  );
}
