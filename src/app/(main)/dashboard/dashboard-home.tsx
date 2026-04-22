"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  BarChart3,
  Dumbbell,
  History,
  PlusCircle,
  Scale,
  UtensilsCrossed,
} from "lucide-react";
import { FiAward, FiBell, FiHeadphones } from "react-icons/fi";
import { createPortal } from "react-dom";

import { logWeightAction } from "@/app/(main)/dashboard/actions";
import { DashboardWaterGrid } from "@/app/(main)/dashboard/dashboard-water-grid";
import { HEADER_ACTION_ICON_CLASS } from "@/components/layout/header-action-icon-styles";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionCard } from "@/components/ui/section-card";
import { macroTargetsFromKcal } from "@/lib/dashboard/macro-targets";
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

/** 僅「首次操作」里程碑：不視為「達成紀錄」以顯示首屏提示 */
const FIRST_STEP_MILESTONE_KEYS = new Set([
  "first_meal",
  "first_activity",
  "first_weight",
]);

function shouldShowNoAchievementLine(
  streakDays: number,
  milestoneChips: { key: string }[],
): boolean {
  if (streakDays >= 1) return false;
  return !milestoneChips.some((m) => !FIRST_STEP_MILESTONE_KEYS.has(m.key));
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
    <div className="rounded-xl border-[0.5px] border-border bg-card p-3">
      <div className="flex items-center gap-3">
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

export type DashboardHomeProps = {
  dateLabel: string;
  /** 今日 ISO 日期（YYYY-MM-DD），用於紀錄頁連結 */
  todayIsoDate: string;
  userName: string | null;
  latestWeightKg: number | null;
  latestWeightDate: string | null;
  /** 最近兩筆 vital 體重差（kg）；僅在至少兩筆皆有體重時有值 */
  weightDeltaKg: number | null;
  profileBmi: number | null;
  streakDays: number;
  /** 今日 `food_log_items` 熱量加總 */
  todayKcal: number;
  targetKcal: number | null;
  carbG: number;
  proteinG: number;
  fatG: number;
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
  /** 今日 `vital_logs.water_ml` 加總（無紀錄為 0） */
  waterMlToday: number;
  /** 飲水目標（ml，僅 UI；日後可改為使用者設定） */
  waterTargetMl: number;
  /** 今日 `activity_logs` 分鐘合計 */
  activityMinutesToday: number;
  /** 今日 `activity_logs.calories_est` 合計（無估熱則為 0） */
  activityKcalEstToday: number;
  /** 今日運動類型彙總（去重、出現順序，以「、」串接） */
  activityTypesLabel: string | null;
};

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
    <section className="rounded-xl border-[0.5px] border-primary/20 bg-primary-light p-4">
      <p className="text-[15px] font-medium text-primary">今日建議</p>
      <ul className="mt-3 space-y-2">
        {bullets.map((text, idx) => (
          <li key={`${idx}-${text.slice(0, 8)}`} className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            <span className="text-[13px] leading-relaxed text-primary-foreground">
              {text}
            </span>
          </li>
        ))}
      </ul>
    </section>
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
  return (
    <section className="rounded-xl border-[0.5px] border-primary/20 bg-primary-light p-4">
      <div className="min-w-0">
        <p className="text-[15px] font-medium text-primary">{title}</p>
        <p className="mt-1 text-[13px] leading-relaxed text-primary-foreground">
          {description}
        </p>
        <Link
          href={href}
          className="mt-2 inline-flex rounded-full border-[0.5px] border-primary bg-background px-3 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary-light">
          {ctaLabel}
        </Link>
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
  todayIsoDate,
  userName,
  latestWeightKg,
  latestWeightDate,
  weightDeltaKg,
  profileBmi,
  streakDays,
  todayKcal,
  targetKcal,
  carbG,
  proteinG,
  fatG,
  meals,
  weeklyWeight,
  weeklyKcal,
  insightBullets,
  recommendProducts,
  promoBanner,
  popularBrands,
  hasUnreadAnnouncements,
  milestoneChips,
  waterMlToday,
  waterTargetMl,
  activityMinutesToday,
  activityKcalEstToday,
  activityTypesLabel,
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

  const quickActionClass =
    "flex h-[56px] min-w-0 flex-col items-center justify-center gap-1 rounded-xl border-[0.5px] border-border bg-card px-1 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-[#4C956C]/40 hover:text-foreground";

  const quickIconClass = "h-[18px] w-[18px] shrink-0 text-primary";

  const headerTitle = userName ? `Hi, ${userName}` : "Hi there";

  const mealsKcalTotal = meals.reduce((sum, m) => {
    if (m.kcal != null && Number.isFinite(m.kcal)) return sum + m.kcal;
    return sum;
  }, 0);
  const showMealsKcalTotal = meals.some(
    (m) => m.kcal != null && Number.isFinite(m.kcal),
  );

  return (
    <div className="space-y-3">
      <PageHeader
        title={headerTitle}
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

      <section className="flex items-center justify-between gap-2">
        {streakDays >= 1 ? (
          <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-primary-light px-2.5 py-1 text-[11px] font-medium leading-none text-primary-foreground">
            <FiAward className="h-3 w-3 shrink-0 opacity-90" aria-hidden />
            <span className="inline-flex items-center gap-0.5">
              <span>連續</span>
              <span className="font-bold tabular-nums">{streakDays}</span>
              <span>天達成！</span>
            </span>
          </span>
        ) : shouldShowNoAchievementLine(streakDays, milestoneChips) ? (
          <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-primary-light px-2.5 py-1 text-[11px] font-medium leading-none text-primary-foreground">
            <FiAward className="h-3 w-3 shrink-0 opacity-90" aria-hidden />
            <span className="inline-flex items-center gap-0.5">
              尚未有達成紀錄
            </span>
          </span>
        ) : (
          <div className="min-w-0 flex-1" />
        )}
        <p className="shrink-0 text-right text-[13px] text-muted-foreground">
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

      <div className="grid grid-cols-2 items-stretch gap-2.5">
        <button
          type="button"
          onClick={openWeightDialog}
          className="flex min-h-[112px] flex-col rounded-[10px] border-[0.5px] border-border bg-card p-2.5 text-left transition-colors hover:bg-muted">
          <p className="text-[15px] font-medium text-foreground">體重</p>
          <p className="mt-1 tabular-nums text-[20px] font-medium leading-tight text-foreground">
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
          {weightDeltaKg != null || profileBmi != null ? (
            <p className="mt-1 text-[11px] leading-snug">
              {weightDeltaKg != null ? (
                <span
                  className={cn(
                    "tabular-nums",
                    weightDeltaKg > 0 && "text-[#EF9F27]",
                    weightDeltaKg < 0 && "text-primary",
                    weightDeltaKg === 0 && "text-muted-foreground",
                  )}>
                  {weightDeltaKg > 0 ? "+" : ""}
                  {weightDeltaKg} kg
                </span>
              ) : null}
              {weightDeltaKg != null && profileBmi != null ? (
                <span className="text-muted-foreground">
                  {" "}
                  · BMI {profileBmi}
                </span>
              ) : profileBmi != null ? (
                <span className="text-muted-foreground">BMI {profileBmi}</span>
              ) : null}
            </p>
          ) : null}
        </button>

        <Link
          href="/log?tab=activity"
          className="flex min-h-[112px] flex-col rounded-[10px] border-[0.5px] border-border bg-card p-2.5 text-left transition-colors hover:bg-muted">
          <p className="text-[15px] font-medium text-foreground">運動消耗</p>
          <p className="mt-1 tabular-nums text-[20px] font-medium leading-tight text-primary">
            {activityKcalEstToday > 0 ? (
              <>
                −{activityKcalEstToday}
                <span className="text-[13px] font-normal text-primary">
                  {" "}
                  kcal
                </span>
              </>
            ) : (
              <span className="text-[13px] font-normal text-muted-foreground">
                —
              </span>
            )}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {activityMinutesToday > 0
              ? `${activityMinutesToday} 分鐘`
              : "尚無紀錄 · 點此前往記錄"}
          </p>
          {activityMinutesToday > 0 && activityTypesLabel ? (
            <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
              {activityTypesLabel}
            </p>
          ) : null}
        </Link>
      </div>

      <section className="rounded-xl border-[0.5px] border-border bg-card p-4">
        <DashboardWaterGrid
          initialWaterMl={waterMlToday}
          embedded
          waterTargetMl={waterTargetMl}
          showQuickAdds
        />
      </section>

      <section>
        <p className="text-[15px] font-medium text-foreground">快速操作</p>
        <div className="mt-3 grid grid-cols-5 gap-1.5">
          <Link href="/log" className={cn(quickActionClass)} title="記錄飲食">
            <UtensilsCrossed
              className={quickIconClass}
              strokeWidth={1.8}
              aria-hidden
            />
            <span className="text-center leading-tight">飲食</span>
          </Link>
          <button
            type="button"
            className={cn(quickActionClass)}
            onClick={openWeightDialog}>
            <Scale className={quickIconClass} strokeWidth={1.8} aria-hidden />
            <span className="text-center leading-tight">體重</span>
          </button>
          <Link
            href="/log?tab=activity"
            className={cn(quickActionClass)}
            title="記錄運動">
            <Dumbbell
              className={quickIconClass}
              strokeWidth={1.8}
              aria-hidden
            />
            <span className="text-center leading-tight">運動</span>
          </Link>
          <Link
            href="/analytics"
            className={cn(quickActionClass)}
            title="數據分析">
            <BarChart3
              className={quickIconClass}
              strokeWidth={1.8}
              aria-hidden
            />
            <span className="text-center leading-tight">數據</span>
          </Link>
          <Link
            href="/guard/records"
            className={cn(quickActionClass)}
            title="食品安全分析紀錄">
            <History className={quickIconClass} strokeWidth={1.8} aria-hidden />
            <span className="text-center leading-tight">標籤</span>
          </Link>
        </div>
      </section>

      <InsightCard bullets={insightBullets} />

      <SectionCard>
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-baseline gap-2">
            <p className="text-[15px] font-medium text-foreground">今日餐食</p>
            {showMealsKcalTotal ? (
              <span className="shrink-0 text-[11px] font-medium tabular-nums text-primary">
                共 {Math.round(mealsKcalTotal)} kcal
              </span>
            ) : null}
          </div>
          <Link
            href={`/log?date=${encodeURIComponent(todayIsoDate)}&tab=food`}
            aria-label="新增餐點紀錄"
            className={cn(HEADER_ACTION_ICON_CLASS)}>
            <PlusCircle
              className="h-[18px] w-[18px]"
              strokeWidth={1.8}
              aria-hidden
            />
          </Link>
        </div>
        <ul className="mt-3 space-y-1">
          {meals.map((m) => (
            <li key={m.key}>
              <Link
                href={m.recordHref}
                className="flex items-start gap-2 rounded-lg px-1 py-1.5 transition-colors hover:bg-muted/60">
                <MealStatusDot mealKey={m.key} isRecorded={m.kcal != null} />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-foreground">
                    {m.label}
                  </p>
                  {m.detailLine ? (
                    <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
                      {m.detailLine}
                    </p>
                  ) : null}
                </div>
                {m.kcal != null ? (
                  <span className="shrink-0 tabular-nums text-[13px] font-medium text-foreground">
                    {m.kcal}{" "}
                    <span className="font-normal text-muted-foreground">
                      kcal
                    </span>
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      </SectionCard>

      <WeeklyTrendCard weeklyWeight={weeklyWeight} weeklyKcal={weeklyKcal} />

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
