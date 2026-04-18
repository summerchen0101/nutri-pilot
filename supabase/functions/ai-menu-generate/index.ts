/**
 * QStash → 呼叫 Claude 生成某日菜單 → 寫入 meals / meal_items → daily_menus.status = ready
 * @see docs/04-ai-engine.md
 *
 * Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY
 * Optional: ANTHROPIC_MODEL（預設 claude-sonnet-4-20250514）
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

interface GeneratedMealItem {
  name: string;
  quantity_g: number;
  calories: number;
  carb_g: number;
  protein_g: number;
  fat_g: number;
}

interface GeneratedMeal {
  type: string;
  scheduled_at: string;
  items: GeneratedMealItem[];
}

interface GeneratedMenuPayload {
  meals: GeneratedMeal[];
  total_calories: number;
}

async function anthropicGenerate(prompt: string): Promise<string> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY");

  const model =
    Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-4-20250514";

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content:
            prompt +
            "\n\n只回傳 JSON，不加 markdown code block 或任何說明文字。",
        },
      ],
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Anthropic HTTP ${res.status}: ${t.slice(0, 400)}`);
  }

  const data = (await res.json()) as {
    content?: { type: string; text?: string }[];
  };
  const block = data.content?.[0];
  return block?.type === "text" ? (block.text ?? "") : "";
}

function parseMenuJson(raw: string): GeneratedMenuPayload {
  const cleaned = raw.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(cleaned) as GeneratedMenuPayload;
  if (!parsed.meals?.length) throw new Error("Invalid menu JSON: no meals");
  return parsed;
}

function buildMenuPrompt(params: {
  dietMethod: string;
  dailyCalTarget: number;
  carbPct: number;
  proteinPct: number;
  fatPct: number;
  avoidFoods: string[];
  allergens: string[];
  mealFrequency: number;
}): string {
  const dietMethodLabel: Record<string, string> = {
    mediterranean: "地中海飲食",
    keto: "生酮飲食",
    high_protein: "高蛋白飲食",
    low_cal: "低熱量飲食",
    intermittent: "間歇性斷食",
    dash: "DASH 飲食",
    custom: "自訂飲食",
  };

  const label =
    dietMethodLabel[params.dietMethod] ?? params.dietMethod;

  const mealsDesc =
    params.mealFrequency === 3 ? "早餐、午餐、晚餐" : "早餐、午餐、晚餐、點心";

  return `
你是專業的台灣營養師，熟悉台灣在地食材與飲食習慣。

請為以下用戶生成今日菜單，以 JSON 格式回傳。

用戶資料：
- 飲食方式：${label}
- 每日熱量目標：${params.dailyCalTarget} kcal
- 巨量營養素比例：碳水 ${params.carbPct}%，蛋白質 ${params.proteinPct}%，脂肪 ${params.fatPct}%
- 忌食清單：${params.avoidFoods.length > 0 ? params.avoidFoods.join("、") : "無"}
- 過敏原：${params.allergens.length > 0 ? params.allergens.join("、") : "無"}
- 餐次：${params.mealFrequency} 餐（${mealsDesc}）

要求：
1. 使用台灣常見食材，食物名稱用繁體中文
2. 每道菜需包含：name, quantity_g, calories, carb_g, protein_g, fat_g
3. 絕對不能含忌食食材與過敏原
4. 符合${label}的飲食原則
5. 四捨五入到小數點第一位

回傳格式（JSON）：
{
  "meals": [
    {
      "type": "breakfast",
      "scheduled_at": "08:00",
      "items": [
        { "name": "燕麥粥", "quantity_g": 80, "calories": 290, "carb_g": 50, "protein_g": 10, "fat_g": 5 }
      ]
    }
  ],
  "total_calories": 1800
}
`.trim();
}

function normalizeTime(t: string): string {
  if (/^\d{2}:\d{2}$/.test(t)) return `${t}:00`;
  return t;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const url = Deno.env.get("SUPABASE_URL")!;
  const svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, svc);

  let menuId = "";
  try {
    const body = await req.json();
    menuId =
      typeof body.menuId === "string"
        ? body.menuId
        : typeof body.record?.menuId === "string"
          ? body.record.menuId
          : "";
    if (!menuId) throw new Error("missing menuId");
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 422,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { data: menuRow, error: menuErr } = await admin
      .from("daily_menus")
      .select("id, plan_id")
      .eq("id", menuId)
      .single();

    if (menuErr || !menuRow) throw new Error("daily_menu not found");

    const { data: plan, error: planErr } = await admin
      .from("diet_plans")
      .select("user_id, diet_method, carb_pct, protein_pct, fat_pct")
      .eq("id", menuRow.plan_id)
      .single();

    if (planErr || !plan) throw new Error("diet_plan not found");

    const userId = plan.user_id;

    await admin.from("daily_menus").update({ status: "generating" }).eq(
      "id",
      menuId,
    );

    const { data: profile } = await admin
      .from("user_profiles")
      .select(
        "avoid_foods, allergens, meal_frequency",
      )
      .eq("user_id", userId)
      .single();

    const { data: goal } = await admin
      .from("user_goals")
      .select("daily_cal_target")
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle();

    const dailyCalTarget = goal?.daily_cal_target ?? 2000;
    const mealFrequency = profile?.meal_frequency ?? 3;

    const prompt = buildMenuPrompt({
      dietMethod: plan.diet_method,
      dailyCalTarget: Number(dailyCalTarget),
      carbPct: Number(plan.carb_pct ?? 45),
      proteinPct: Number(plan.protein_pct ?? 30),
      fatPct: Number(plan.fat_pct ?? 25),
      avoidFoods: profile?.avoid_foods ?? [],
      allergens: profile?.allergens ?? [],
      mealFrequency,
    });

    const raw = await anthropicGenerate(prompt);
    const payload = parseMenuJson(raw);

    await admin.from("meals").delete().eq("menu_id", menuId);

    for (const m of payload.meals) {
      const mealTotal = m.items.reduce((s, it) => s + Number(it.calories), 0);

      const { data: mealIns, error: mealErr } = await admin
        .from("meals")
        .insert({
          menu_id: menuId,
          type: m.type,
          scheduled_at: normalizeTime(m.scheduled_at),
          total_calories: mealTotal,
          is_checked_in: false,
        })
        .select("id")
        .single();

      if (mealErr || !mealIns) throw mealErr ?? new Error("meal insert failed");

      const rows = m.items.map((it) => ({
        meal_id: mealIns.id,
        name: it.name,
        quantity_g: it.quantity_g,
        calories: it.calories,
        carb_g: it.carb_g,
        protein_g: it.protein_g,
        fat_g: it.fat_g,
      }));

      const { error: itemsErr } = await admin.from("meal_items").insert(rows);
      if (itemsErr) throw itemsErr;
    }

    await admin
      .from("daily_menus")
      .update({
        status: "ready",
        total_calories: payload.total_calories,
        completion_pct: 0,
        is_completed: false,
      })
      .eq("id", menuId);

    return new Response(JSON.stringify({ ok: true, menuId }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    await admin.from("daily_menus").update({ status: "error" }).eq(
      "id",
      menuId,
    );
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
