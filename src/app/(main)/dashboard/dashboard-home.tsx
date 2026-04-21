"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  FiActivity,
  FiAward,
  FiBarChart2,
  FiBell,
  FiCoffee,
  FiHeadphones,
  FiTag,
} from "react-icons/fi";
import { createPortal } from "react-dom";

import { logWeightAction } from "@/app/(main)/dashboard/actions";
import { HEADER_ACTION_ICON_CLASS } from "@/components/layout/header-action-icon-styles";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MetricTile } from "@/components/ui/metric-tile";
import { SectionCard } from "@/components/ui/section-card";
import { cn } from "@/lib/utils/cn";

export type DashboardMealVariant = "as_planned" | "adjusted" | "self_logged";

export type DashboardMealRow = {
  key: string;
  label: string;
  variant: DashboardMealVariant;
  /** 第二行：狀態說明或計畫摘要 */
  detailLine: string;
  kcal: number | null;
  recordHref: string;
};

export type DashboardHomeProps = {
  dateLabel: string;
  latestWeightKg: number | null;
  latestWeightDate: string | null;
  heightCm: number;
  profileBmi: number | null;
  todayKcal: number;
  targetKcal: number | null;
  carbG: number;
  proteinG: number;
  fatG: number;
  streakDays: number;
  meals: DashboardMealRow[];
  weeklyWeight: { label: string; kg: number | null }[];
  weeklyKcal: { label: string; kcal: number }[];
  insightBullets: string[];
  recommendProducts: {
    id: string;
    name: string;
    imageUrl: string | null;
    price: number;
    reason: string;
  }[];
  promoBanner: {
    title: string;
    description: string;
    ctaLabel: string;
    href: string;
  };
  popularBrands: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
  }[];
  hasUnreadAnnouncements: boolean;
  /** 最近解鎖的里程碑（已依時間倒序截斷） */
  milestoneChips: { key: string; label: string }[];
  /** 今日運動紀錄分鐘加總 */
  activityMinutesToday: number;
};

function macroTargetsFromKcal(kcal: number): {
  carb: number;
  protein: number;
  fat: number;
} {
  if (!Number.isFinite(kcal) || kcal <= 0) {
    return { carb: 0, protein: 0, fat: 0 };
  }
  return {
    carb: (kcal * 0.5) / 4,
    protein: (kcal * 0.25) / 4,
    fat: (kcal * 0.25) / 9,
  };
}

function CalorieRingBlock({
  todayKcal,
  targetKcal,
  carbG,
  proteinG,
  fatG,
}: {
  todayKcal: number;
  targetKcal: number | null;
  carbG: number;
  proteinG: number;
  fatG: number;
}) {
  const ringR = 36;
  const circumference = 2 * Math.PI * ringR;
  const target = targetKcal != null && targetKcal > 0 ? targetKcal : 0;
  const ratio =
    target > 0 && todayKcal > 0 ? Math.min(1, todayKcal / target) : 0;

  const t = targetKcal != null && targetKcal > 0 ? targetKcal : 0;
  const m = t > 0 ? macroTargetsFromKcal(t) : { carb: 0, protein: 0, fat: 0 };
  const bar = (v: number, cap: number) =>
    cap > 0 ? Math.min(100, (v / cap) * 100) : 0;

  return (
    <div className="rounded-xl border-[0.5px] border-border bg-card p-4">
      <div className="flex items-center gap-4">
        <div className="relative h-[120px] w-[120px] shrink-0">
          <svg
            className="h-full w-full -rotate-90"
            viewBox="0 0 100 100"
            aria-hidden>
            <circle
              cx="50"
              cy="50"
              r={ringR}
              fill="none"
              className="stroke-border"
              strokeWidth="6"
            />
            <circle
              cx="50"
              cy="50"
              r={ringR}
              fill="none"
              stroke="#4C956C"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - ratio)}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            {todayKcal <= 0 ? (
              <p className="px-2 text-center text-[11px] text-muted-foreground">
                尚未記錄
              </p>
            ) : (
              <>
                <p className="text-[20px] font-medium leading-tight text-foreground">
                  {Math.round(todayKcal)}
                </p>
                <p className="text-[9px] text-muted-foreground">kcal</p>
                {t > 0 ? (
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    目標 {Math.round(t)}
                  </p>
                ) : null}
              </>
            )}
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-2.5">
          {(
            [
              { label: "碳水", v: carbG, cap: m.carb, color: "#378ADD" },
              {
                label: "蛋白質",
                v: proteinG,
                cap: m.protein,
                color: "#4C956C",
              },
              { label: "脂肪", v: fatG, cap: m.fat, color: "#EF9F27" },
            ] as const
          ).map((row) => (
            <div key={row.label}>
              <div className="mb-0.5 flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">
                  {row.label}
                </span>
                <span className="text-[11px] tabular-nums text-muted-foreground">
                  {Math.round(row.v)}g
                </span>
              </div>
              <div className="h-[5px] w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full transition-all duration-200"
                  style={{
                    width: `${bar(row.v, row.cap)}%`,
                    backgroundColor: row.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MealStatusDot({
  mealKey,
  isRecorded,
}: {
  mealKey: string;
  isRecorded: boolean;
}) {
  const isSnack = mealKey === "snack";
  const bg = !isRecorded ? "#D1D5DB" : isSnack ? "#EF9F27" : "#4C956C";
  return (
    <span
      className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
      style={{ backgroundColor: bg }}
      aria-hidden
    />
  );
}

function WeeklyTrendCard({
  weeklyWeight,
  weeklyKcal,
}: {
  weeklyWeight: { label: string; kg: number | null }[];
  weeklyKcal: { label: string; kcal: number }[];
}) {
  const validWeights = weeklyWeight
    .map((row) => row.kg)
    .filter(
      (value): value is number => value != null && Number.isFinite(value),
    );
  const minW = validWeights.length ? Math.min(...validWeights) : 0;
  const maxW = validWeights.length ? Math.max(...validWeights) : 0;
  const weightRange = Math.max(0.1, maxW - minW);
  const weightPoints = weeklyWeight
    .map((row, idx) => {
      if (row.kg == null || !Number.isFinite(row.kg)) return null;
      const x =
        weeklyWeight.length <= 1 ? 50 : (idx / (weeklyWeight.length - 1)) * 100;
      const y = 32 - ((row.kg - minW) / weightRange) * 24;
      return `${x},${y}`;
    })
    .filter((point): point is string => point != null)
    .join(" ");
  const maxKcal = Math.max(1, ...weeklyKcal.map((row) => row.kcal));

  return (
    <SectionCard>
      <p className="text-[15px] font-medium text-foreground">本週趨勢</p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-[10px] border-[0.5px] border-border bg-secondary/40 p-3">
          <p className="text-[11px] text-muted-foreground">體重（7 日）</p>
          <div className="mt-2 h-14">
            {weightPoints ? (
              <svg viewBox="0 0 100 36" className="h-full w-full" aria-hidden>
                <polyline
                  points={weightPoints}
                  fill="none"
                  stroke="#4C956C"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <p className="text-[11px] text-muted-foreground">尚無資料</p>
            )}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {validWeights.length > 0
              ? `${validWeights[validWeights.length - 1]} kg`
              : "—"}
          </p>
        </div>
        <div className="rounded-[10px] border-[0.5px] border-border bg-secondary/40 p-3">
          <p className="text-[11px] text-muted-foreground">熱量（7 日）</p>
          <div className="mt-2 flex h-14 items-end gap-1">
            {weeklyKcal.map((row) => (
              <div
                key={row.label}
                className="flex min-w-0 flex-1 flex-col items-center gap-1">
                <div className="h-10 w-full overflow-hidden rounded-[4px] bg-muted">
                  <div
                    className="w-full rounded-[4px] bg-[#4C956C]"
                    style={{
                      height: `${Math.max(8, (row.kcal / maxKcal) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            平均{" "}
            {Math.round(
              weeklyKcal.reduce((sum, row) => sum + row.kcal, 0) /
                Math.max(1, weeklyKcal.length),
            )}{" "}
            kcal
          </p>
        </div>
      </div>
    </SectionCard>
  );
}

function InsightCard({ bullets }: { bullets: string[] }) {
  return (
    <SectionCard>
      <p className="text-[15px] font-medium text-foreground">今日建議</p>
      <ul className="mt-3 space-y-2">
        {bullets.map((text, idx) => (
          <li key={`${idx}-${text.slice(0, 8)}`} className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#4C956C]" />
            <span className="text-[13px] leading-relaxed text-foreground">
              {text}
            </span>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

function RecommendationRail({
  products,
}: {
  products: {
    id: string;
    name: string;
    imageUrl: string | null;
    price: number;
    reason: string;
  }[];
}) {
  return (
    <SectionCard>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[15px] font-medium text-foreground">為你推薦</p>
        <Link href="/shop" className="text-[11px] font-medium text-primary">
          看更多
        </Link>
      </div>
      <div className="hide-scrollbar mt-3 flex gap-2.5 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
        {products.map((product) => (
          <Link
            key={product.id}
            href={`/shop/${product.id}`}
            className="flex w-[146px] shrink-0 flex-col overflow-hidden rounded-xl border-[0.5px] border-border bg-card">
            <div className="relative aspect-square w-full shrink-0 overflow-hidden bg-muted">
              {product.imageUrl ? (
                <Image
                  src={product.imageUrl}
                  alt=""
                  fill
                  sizes="146px"
                  className="object-cover"
                  unoptimized
                />
              ) : null}
            </div>
            <div className="flex flex-1 flex-col p-2.5">
              <p className="line-clamp-2 text-[13px] font-medium leading-snug text-foreground">
                {product.name}
              </p>
              <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">
                {product.reason}
              </p>
              <p className="mt-1.5 text-[13px] font-medium text-foreground">
                NT$ {Math.round(product.price)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </SectionCard>
  );
}

function PromoBanner({
  title,
  description,
  ctaLabel,
  href,
}: {
  title: string;
  description: string;
  ctaLabel: string;
  href: string;
}) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <section className="rounded-xl border-[0.5px] border-[#F0C896] bg-[#FFF4E8] p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-[#C2410C]">{title}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            {description}
          </p>
          <Link
            href={href}
            className="mt-2 inline-flex rounded-full border-[0.5px] border-[#EF9F27] bg-[#FFFBF5] px-3 py-1 text-[11px] font-medium text-[#C2410C]">
            {ctaLabel}
          </Link>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-[11px] text-muted-foreground hover:text-foreground"
          aria-label="關閉橫幅">
          關閉
        </button>
      </div>
    </section>
  );
}

function WeeklyPopularBrandsRail({
  brands,
}: {
  brands: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
  }[];
}) {
  return (
    <SectionCard>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[15px] font-medium text-foreground">本週人氣</p>
        <Link href="/shop" className="text-[11px] font-medium text-primary">
          看更多
        </Link>
      </div>
      <div className="hide-scrollbar mt-3 flex gap-2.5 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
        {brands.map((brand) => (
          <Link
            key={brand.id}
            href={`/shop?brand=${encodeURIComponent(brand.slug)}`}
            className="flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-xl border-[0.5px] border-border bg-card p-2 transition-colors hover:bg-muted"
            aria-label={brand.name}>
            <div className="relative h-11 w-11 overflow-hidden rounded-full bg-secondary">
              {brand.logoUrl ? (
                <Image
                  src={brand.logoUrl}
                  alt=""
                  fill
                  sizes="44px"
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div
                  className="h-full w-full rounded-full bg-muted"
                  aria-hidden
                />
              )}
            </div>
          </Link>
        ))}
      </div>
    </SectionCard>
  );
}

export function DashboardHome({
  dateLabel,
  latestWeightKg,
  latestWeightDate,
  heightCm,
  profileBmi,
  todayKcal,
  targetKcal,
  carbG,
  proteinG,
  fatG,
  streakDays,
  meals,
  weeklyWeight,
  weeklyKcal,
  insightBullets,
  recommendProducts,
  promoBanner,
  popularBrands,
  hasUnreadAnnouncements,
  milestoneChips,
  activityMinutesToday,
}: DashboardHomeProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [weightInput, setWeightInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    const w = parseFloat(weightInput.replace(",", "."));
    startTransition(async () => {
      const res = await logWeightAction(w);
      if (res.error) {
        setError(res.error);
        return;
      }
      setOpen(false);
      setWeightInput("");
      router.refresh();
    });
  }

  function openWeightDialog() {
    setOpen(true);
    setError(null);
    if (latestWeightKg != null) {
      setWeightInput(String(latestWeightKg));
    }
  }

  const ghostQuick =
    "flex min-h-[72px] flex-1 flex-col items-center justify-center gap-1 rounded-xl border-[0.5px] border-border bg-card px-2 py-2 text-[13px] font-normal text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground";

  const goal = targetKcal != null && targetKcal > 0 ? targetKcal : null;
  let calorieRemainKcal: number | null = null;
  if (goal != null && todayKcal > 0) {
    const diff = goal - todayKcal;
    if (diff >= 0) {
      calorieRemainKcal = Math.round(diff);
    }
  }

  const mealSlots = [
    { key: "breakfast", label: "早餐" },
    { key: "lunch", label: "午餐" },
    { key: "dinner", label: "晚餐" },
    { key: "snack", label: "點心" },
  ] as const;
  const mealByKey = new Map(meals.map((meal) => [meal.key, meal]));
  const displayMeals = mealSlots.map((slot) => {
    const existing = mealByKey.get(slot.key);
    return {
      key: slot.key,
      label: slot.label,
      variant: existing?.variant ?? "self_logged",
      kcal: existing?.kcal ?? null,
      recordHref:
        existing?.recordHref ??
        `/log?meal_type=${encodeURIComponent(slot.key)}`,
    };
  });

  return (
    <div className="space-y-3">
      <PageHeader
        title="總覽"
        spacing="compact"
        action={
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/announcements"
              aria-label="公告"
              className={cn("relative", HEADER_ACTION_ICON_CLASS)}>
              <FiBell className="h-[18px] w-[18px]" aria-hidden />
              {hasUnreadAnnouncements ? (
                <span
                  className="absolute right-1 top-1 h-2 w-2 rounded-full bg-destructive"
                  aria-hidden
                />
              ) : null}
            </Link>
            <Link
              href="/support"
              aria-label="客服"
              className={HEADER_ACTION_ICON_CLASS}>
              <FiHeadphones className="h-[18px] w-[18px]" aria-hidden />
            </Link>
          </div>
        }
      />

      <section
        className={cn(
          "flex items-center gap-2",
          streakDays >= 1 ? "justify-between" : "justify-end",
        )}>
        {streakDays >= 1 ? (
          <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-primary-light px-2.5 py-1 text-[11px] font-medium leading-none text-primary-foreground">
            <FiAward className="h-3 w-3 shrink-0 opacity-90" aria-hidden />
            <span className="inline-flex items-center gap-0.5">
              <span>連續</span>
              <span className="font-bold tabular-nums">{streakDays}</span>
              <span>天達成！</span>
            </span>
          </span>
        ) : null}
        <p className="min-w-0 text-right text-[13px] text-muted-foreground">
          {dateLabel}
        </p>
      </section>

      <CalorieRingBlock
        todayKcal={todayKcal}
        targetKcal={targetKcal}
        carbG={carbG}
        proteinG={proteinG}
        fatG={fatG}
      />

      {activityMinutesToday > 0 ? (
        <p className="text-center text-[11px] text-muted-foreground">
          今日已記錄活動約{" "}
          <span className="tabular-nums font-medium text-foreground">
            {activityMinutesToday}
          </span>{" "}
          分鐘 ·{" "}
          <Link
            href="/log?tab=activity"
            className="text-primary underline-offset-2 hover:underline">
            紀錄更多
          </Link>
        </p>
      ) : null}

      <div className="grid grid-cols-2 items-stretch gap-2.5">
        <button
          type="button"
          onClick={openWeightDialog}
          className="flex min-h-[136px] flex-col rounded-[10px] border-[0.5px] border-border bg-card p-3 text-left transition-colors hover:bg-muted">
          <p className="text-[11px] text-muted-foreground">體重</p>
          <p className="mt-0.5 tabular-nums text-[20px] font-medium text-foreground">
            {latestWeightKg != null ? (
              <>
                {latestWeightKg}
                <span className="text-[13px] font-normal text-muted-foreground">
                  {" "}
                  kg
                </span>
              </>
            ) : (
              <span className="text-[13px] font-normal text-muted-foreground">
                —
              </span>
            )}
          </p>
          {latestWeightDate ? (
            <p className="mt-1 text-[11px] text-muted-foreground">
              最近 · {latestWeightDate}
            </p>
          ) : (
            <p className="mt-1 text-[11px] text-muted-foreground">
              尚無體重紀錄
            </p>
          )}
          {profileBmi != null ? (
            <p className="mt-1 text-[11px] text-primary">
              BMI {profileBmi}（身高 {heightCm} cm）
            </p>
          ) : null}
        </button>

        <MetricTile
          label="今日熱量"
          className="h-full min-h-[136px] border-[0.5px] border-border bg-card"
          value={
            <>
              {Math.round(todayKcal)}
              <span className="text-[13px] font-normal text-muted-foreground">
                {" "}
                kcal
              </span>
            </>
          }
          hint={
            goal != null ? (
              <>
                目標 {Math.round(goal)} kcal
                {calorieRemainKcal != null ? (
                  <>
                    {" · 尚可攝取約 "}
                    <span className="text-primary">
                      {calorieRemainKcal} kcal
                    </span>
                  </>
                ) : null}
              </>
            ) : (
              "尚未設定目標"
            )
          }
        />
      </div>

      <SectionCard>
        <p className="text-[15px] font-medium text-foreground">快速操作</p>
        <div className="mt-3 grid grid-cols-5 gap-2">
          <Link href="/log" className={cn(ghostQuick)} title="記錄飲食">
            <FiCoffee className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            <span className="text-center leading-tight">飲食</span>
          </Link>
          <button
            type="button"
            className={cn(ghostQuick)}
            onClick={openWeightDialog}>
            <FiActivity className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            <span className="text-center leading-tight">體重</span>
          </button>
          <Link
            href="/log?tab=activity"
            className={cn(ghostQuick)}
            title="記錄運動">
            <FiActivity className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            <span className="text-center leading-tight">運動</span>
          </Link>
          <Link href="/analytics" className={cn(ghostQuick)} title="數據分析">
            <FiBarChart2
              className="h-4 w-4 shrink-0 text-primary"
              aria-hidden
            />
            <span className="text-center leading-tight">數據</span>
          </Link>
          <Link
            href="/guard/records"
            className={cn(ghostQuick)}
            title="標籤紀錄">
            <FiTag className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            <span className="text-center leading-tight">標籤</span>
          </Link>
        </div>
      </SectionCard>

      {milestoneChips.length > 0 ? (
        <SectionCard>
          <p className="text-[15px] font-medium text-foreground">里程碑</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {milestoneChips.map((m) => (
              <span
                key={m.key}
                className="inline-flex items-center rounded-full bg-primary-light px-3 py-1.5 text-[12px] font-medium text-primary-foreground">
                {m.label}
              </span>
            ))}
          </div>
        </SectionCard>
      ) : null}

      <SectionCard>
        <p className="text-[15px] font-medium text-foreground">今日餐食</p>
        <ul className="mt-3 space-y-3">
          {displayMeals.map((m) => (
            <li key={m.key}>
              <div className="flex items-start gap-2">
                <MealStatusDot mealKey={m.key} isRecorded={m.kcal != null} />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-foreground">
                    {m.label}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {m.kcal != null ? (
                    <span className="tabular-nums text-[13px] font-medium text-foreground">
                      {m.kcal}{" "}
                      <span className="font-normal text-muted-foreground">
                        kcal
                      </span>
                    </span>
                  ) : null}
                  <Link
                    href={m.recordHref}
                    className="rounded-full border-[0.5px] border-border bg-secondary px-2.5 py-1 text-[11px] font-medium text-foreground transition-colors hover:bg-muted">
                    記錄
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </SectionCard>

      <WeeklyTrendCard weeklyWeight={weeklyWeight} weeklyKcal={weeklyKcal} />

      <InsightCard bullets={insightBullets} />

      {recommendProducts.length > 0 ? (
        <RecommendationRail products={recommendProducts} />
      ) : null}

      <PromoBanner
        title={promoBanner.title}
        description={promoBanner.description}
        ctaLabel={promoBanner.ctaLabel}
        href={promoBanner.href}
      />

      {popularBrands.length > 0 ? (
        <WeeklyPopularBrandsRail brands={popularBrands} />
      ) : null}

      {open
        ? createPortal(
            <div
              className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/35 p-4 sm:items-center"
              role="presentation"
              onClick={() => !pending && setOpen(false)}>
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="weight-dialog-title"
                className="w-full max-w-sm rounded-2xl border-[0.5px] border-border bg-card p-5"
                onClick={(e) => e.stopPropagation()}>
                <h2
                  id="weight-dialog-title"
                  className="text-[15px] font-medium text-foreground">
                  記錄今日體重
                </h2>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  將寫入今日紀錄並更新個人資料與熱量目標（如有）。
                </p>
                <div className="mt-4">
                  <label htmlFor="weight-kg" className="sr-only">
                    體重（公斤）
                  </label>
                  <Input
                    id="weight-kg"
                    type="text"
                    inputMode="decimal"
                    placeholder="例如 65.5"
                    value={weightInput}
                    onChange={(e) => setWeightInput(e.target.value)}
                    autoFocus
                    disabled={pending}
                  />
                </div>
                {error ? (
                  <p className="mt-2 text-[11px] text-destructive">{error}</p>
                ) : null}
                <div className="mt-5 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => setOpen(false)}>
                    取消
                  </Button>
                  <Button type="button" disabled={pending} onClick={submit}>
                    {pending ? "儲存中…" : "儲存"}
                  </Button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
