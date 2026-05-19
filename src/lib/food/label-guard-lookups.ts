import {
  formatAdditiveCatalogBody,
  hasAdditiveCatalogEntry,
} from '@/lib/food/label-guard-additive-catalog';
import type { TwAllergenCategoryKey } from '@/lib/food/label-guard-report';

const FALLBACK_EXPLANATION_BODY =
  '此為 AI 依影像辨識所標示之重點詞，僅供一般性參考；實際成分與過敏資訊請以產品包裝、官方標示與醫師建議為準。';

/** 鍵為常見中文用語；內文為一般性食材／法規說明，非醫療建議。 */
const ALERT_KEYWORD_BODY: Record<string, string> = {
  高鈉:
    '鈉攝取與血壓、心血管負擔相關。高鈉產品建議搭配整體飲食評估；高血壓、腎臟疾病或醫囑限鈉者尤須留意份量與頻率。',
  高鈉含量:
    '鈉攝取與血壓、心血管負擔相關。建議對照營養標示上的鈉含量，並依個人健康狀況與醫師建議調整。',
  鈉含量偏高:
    '鈉攝取與血壓、心血管負擔相關。建議對照營養標示上的鈉含量，並依個人健康狀況與醫師建議調整份量。',
  鈉偏高:
    '鈉攝取與血壓、心血管負擔相關。高血壓、腎臟疾病或醫囑限鈉者尤須留意份量與頻率。',
  食品添加物:
    '加工食品常含多種合法添加物；建議詳讀成分表，敏感體質或幼童可依需求選擇添加物較單純之產品。',
  膨鬆劑:
    '用於使麵食、蛋糕等膨鬆；常見碳酸氫鈉等。一般合法限量內可食用，對鈉敏感者宜留意總攝取。',
  調味劑:
    '用於增強鮮味或風味；常見麩酸鈉（味精）或核苷酸類。少數人可能自覺不耐，可依感受調整。',
  增色劑:
    '用於調整食品外觀顏色；多為合成或天然色素。敏感體質或幼童家長可依需求選擇，實際種類以標示為準。',
  著色劑:
    '同增色劑，用於食品著色。請依標示辨識具體色素名稱，並遵循法規限量與個人需求。',
  防腐劑:
    '用於抑制微生物、延長保存；苯甲酸類、己二烯酸類等常見。法規有限量，對添加物較敏感者可留意頻率。',
  乳化劑:
    '幫助油水混合、改善口感；常見甘油酯、卵磷脂等。對大豆過敏者須留意卵磷脂來源。',
  增稠劑:
    '增加黏稠度與口感；關華豆膠、卡拉膠等常見。多數人可耐受，腸道敏感者可觀察自身反應。',
  酸度調節劑:
    '調整酸鹼值以穩定品質或風味；檸檬酸、乳酸等常見。一般用量下多數人可安心。',
  抗氧化劑:
    '減緩油脂氧化；BHA、BHT或抗壞血酸等。請依標示辨識種類，過量攝取仍宜避免。',
  漂白劑:
    '部分麵粉製品可能使用，以改善色澤。選購時可比對成分表，疑慮可選未漂白或標示單純之產品。',
  品質改良劑:
    '改善質地或保水性；磷酸鹽類常見。腎功能異常者磷負荷需特別留意，請依醫囑。',
  甜味劑:
    '提供甜味、降低糖含量；阿斯巴甜、蔗糖素等受法規規範。苯酮尿症等特定族群須依標示與醫囑避開。',
  碳酸氫鈉:
    '常見膨鬆劑，泡打粉、蘇打餅等可能含有；亦貢獻鈉離子，限鈉飲食宜留意總量。',
  小蘇打:
    '即碳酸氫鈉，用於膨鬆或調味。高鈉產品或限鈉者宜注意整體鈉攝取。',
  焦磷酸二鈉:
    '常作膨鬆劑或品質改良用劑；加工麵食、肉品可能含有，請依標示與整體飲食評估。',
  檸檬黃:
    '合成食用色素之一，用於黃色調。敏感體質或幼童可依需求選擇，實際使用以標示與法規為準。',
  日落黃:
    '合成食用色素之一，用於橙黃色調。請依標示與個人需求選擇，並遵循適量原則。',
  紅色40號:
    '合成食用色素（如 Allura Red），用於紅色調。敏感體質者可留意反應，以標示為準。',
  胭脂紅:
    '天然或半合成紅色色素，常見於糖果、飲品。對色素敏感者宜留意標示。',
  己二烯酸:
    '常見防腐劑，抑制霉菌與酵母。於合法限量內使用；對添加物較敏感者可留意。',
  己二烯酸鉀:
    '己二烯酸的鉀鹽，防腐用途。法規有限量，建議搭配整體加工食品攝取量評估。',
  去水醋酸:
    '防腐劑之一，部分起司、麵包可能使用。請依標示與醫囑調整攝取。',
  蔗糖素:
    '高倍甜味劑，熱量極低。一般於合法限量內可食用；疑慮請諮詢醫師或營養師。',
  糖精:
    '人工甜味劑，法規訂有每日容許攝取量。請勿過量，並依個人健康狀況選擇。',
  "5'-核苷酸":
    '調味劑類，常與味精併用增強鮮味。對鮮味添加物敏感者可留意成分表。',
  高熱量:
    '單份熱量較高時，需注意一日總熱量與體重管理；可依活動量與飲食目標調整份量或食用頻率。',
  高果糖玉米糖漿:
    '屬添加糖來源之一，過量可能與代謝負擔有關。建議適量，並留意整日其他含糖飲食與醫囑。',
  棕櫚油:
    '棕櫚油飽和脂肪比例相對較高，過量飽和脂肪可能與心血管風險相關；建議適量並搭配均衡飲食。',
  反式脂肪:
    '人工反式脂肪與心血管健康之關注較高。選購時可比對營養標示與成分來源，並遵循醫囑。',
  大豆卵磷脂:
    '常作為乳化劑使用，一般用量下多數人可安心；對大豆過敏者應避免含大豆來源之產品。',
  卵磷脂:
    '可能來自大豆、蛋黃等；對相關過敏原過敏者需詳讀標示。一般作為食品加工用途。',
  二氧化鈦:
    '可作為食品著色／白色色素使用；各國管理規範不一。若有疑慮可選擇標示較單純之產品並諮詢專業意見。',
  人工色素:
    '合成色素用於調色；敏感體質或幼童家長可依需求選擇。實際使用種類與限量以標示與法規為準。',
  人工甜味劑:
    '代糖種類與容許量受法規規範；特定族群（如苯酮尿症需避開阿斯巴甜等）請依標示與醫囑。',
  阿斯巴甜:
    '苯酮尿症（PKU）患者須嚴格避免。其他人一般於合法限量內使用；疑慮請諮詢醫師或營養師。',
  卡拉膠:
    '海藻抽取之多醣類，常用於增稠。多數人可耐受；若有腸道敏感史可觀察自身反應。',
  苯甲酸鈉:
    '常見防腐劑，法規有限量。少數人可能對含此類添加物產品較敏感，建議依自身狀況調整。',
  山梨酸鉀:
    '常見防腐劑，用於抑制微生物。於合法限量內使用；對添加物較敏感者可留意配料表。',
  亞硝酸鹽:
    '加工肉品有時使用，涉及法規限量與製程。高風險族群飲食選擇請依醫囑。',
  亞硝酸鈉:
    '屬加工肉品可能使用之成分，管理與限量依法規。相關風險與攝取建議請參考產品類別與醫師建議。',
  味精: '調味用途之麩酸鈉；少數人可能自覺不耐。可視個人感受與飲食習慣調整。',
  麩質:
    '麩質存在於小麥、大麥、裸麥等；乳糜瀉或麩質敏感者須嚴格避免含麩質來源。',
  麩質穀物:
    '含麩質之穀類及其製品為常見過敏／不耐受來源之一；相關疾病患者請依標示選購。',
  乳糖:
    '乳糖不耐者可能腹脹、腹瀉；可選擇低乳糖／無乳糖產品或依醫師、營養師建議調整。',
  乳清蛋白:
    '來自乳製品之蛋白質來源；對牛奶蛋白過敏者應避免。',
  分離乳清蛋白:
    '高度精製之乳蛋白；對牛奶蛋白過敏或不耐受者須留意。',
  咖啡因:
    '具提神作用；孕婦、哺乳期、兒童與對咖啡因敏感者宜控制總量並參考醫囑。',
  酒精:
    '含酒精飲品不適合特定族群（如孕婦、未成年人、服用特定藥物者）。請勿酒駕。',
  精製糖:
    '添加糖過量可能影響血糖與熱量平衡；建議適量並搭配整體飲食型態。',
  飽和脂肪:
    '過量飽和脂肪可能與心血管風險相關；建議搭配食材多樣化與適量原則。',
  磷酸鹽:
    '常用於加工食品；腎功能異常者磷負荷需特別留意，請依醫囑調整。',
  MSG: '即麩酸鈉調味；少數人可能自覺不耐，可依個人感受調整。',
  麩酸鈉:
    '即味精主成分，屬調味劑；少數人可能自覺不耐，可依感受與標示調整份量。',
  麥芽糊精:
    '澱粉水解物，常作填充或載體；控糖或糖尿病者宜留意對血糖之影響。',
  色素:
    '用於調色之食用色素，種類以標示為準；敏感體質或幼童可依需求選擇。',
  食用色素:
    '同色素，請依成分表辨識具體色素名稱並遵循適量原則。',
  香料:
    '調香用途，可能為天然或複合配方；過敏者宜詳讀標示。',
  人工香料:
    '合成調香物質，敏感體質可留意個人反應。',
  天然香料:
    '來源可能為植物萃取等，仍建議過敏者詳讀標示。',
  棕櫚:
    '棕櫚相關油脂飽和脂肪較高，建議適量並注意整體油脂型態與份量。',
};

export const ALLERGEN_GENERAL_ZH: Record<TwAllergenCategoryKey, string> = {
  mango:
    '芒果為常見水果過敏原之一；出現過敏症狀者應避免並依醫囑備藥。',
  peanut:
    '花生過敏可能導致嚴重反應；確診者須嚴格避免並注意交叉汙染與警語。',
  egg:
    '蛋與蛋製品見於烘焙、加工品；對蛋過敏者需詳讀成分與警語。',
  milk:
    '牛乳／乳製品包含多種乳蛋白與乳糖；乳蛋白過敏與乳糖不耐之處理方式不同，請依診斷調整。',
  nuts:
    '堅果類過敏部分可能為嚴重過敏；需避免含堅果成分並注意共用產線警語。',
  sesame:
    '芝麻及其製品常見於醬料、烘焙；過敏者應完全避免。',
  gluten_cereals:
    '含麩質之穀物（如小麥、大麥等）為乳糜瀉與麩質敏感族群須排除之項目。',
  soybean:
    '大豆及其製品用途廣泛；大豆過敏者須留意醬油、卵磷脂等來源。',
  fish:
    '魚類過敏通常為對特定魚種蛋白；須依個人病史避免相關製品。',
  shellfish:
    '軟體／貝類過敏症狀因人而異；嚴重者有呼吸道與休克風險，請依醫囑。',
  crustacean:
    '蝦蟹等甲殼類為常見過敏原；交叉反應因人而異，確診者須嚴格避免。',
  celery:
    '芹菜於歐盟等地列為標示過敏原；敏感者留意湯底、調理包與複合香料。',
  mustard:
    '芥末／芥子成分見於調味醬與加工肉品；過敏者須詳讀標示。',
  sulfite:
    '亞硫酸鹽／二氧化硫可用於防腐與漂白；對亞硫酸鹽敏感者（如部分氣喘族群）宜留意。',
};

function normalizeForMatch(s: string): string {
  return s
    .trim()
    .normalize('NFKC')
    .replace(/\s+/g, '')
    .replace(/／/g, '/');
}

function tryExplainByKeywordTable(raw: string): string | null {
  const n = normalizeForMatch(raw);
  if (!n) return null;

  for (const [key, body] of Object.entries(ALERT_KEYWORD_BODY)) {
    if (normalizeForMatch(key) === n) return body;
  }

  let best: { len: number; body: string } | null = null;
  for (const [key, body] of Object.entries(ALERT_KEYWORD_BODY)) {
    const nk = normalizeForMatch(key);
    if (!nk) continue;
    if (n.includes(nk) || nk.includes(n)) {
      const len = nk.length;
      if (!best || len > best.len) best = { len, body };
    }
  }

  return best?.body ?? null;
}

export function resolveAlertKeywordExplanation(kw: string): {
  title: string;
  body: string;
} {
  const title = kw.trim();
  const catalogBody = formatAdditiveCatalogBody(kw);
  if (catalogBody) return { title, body: catalogBody };
  const body = tryExplainByKeywordTable(kw) ?? FALLBACK_EXPLANATION_BODY;
  return { title, body };
}

export function canOpenAlertKeywordDetail(kw: string): boolean {
  return hasAdditiveCatalogEntry(kw) || tryExplainByKeywordTable(kw) !== null;
}

export function resolveRiskItemExplanation(
  name: string,
  plainLanguage: string,
): { title: string; body: string } {
  const title = name.trim();
  const catalogBody = formatAdditiveCatalogBody(name);
  if (catalogBody) return { title, body: catalogBody };
  const fromTable = tryExplainByKeywordTable(name);
  const trimmedPlain = plainLanguage.trim();
  if (fromTable) return { title, body: fromTable };
  if (trimmedPlain) return { title, body: trimmedPlain };
  return { title, body: FALLBACK_EXPLANATION_BODY };
}

export function allergenDetailSheetBody(
  key: TwAllergenCategoryKey,
  detail: string | null,
): string {
  const general = ALLERGEN_GENERAL_ZH[key];
  const d = detail?.trim();
  if (d) {
    return `${general}\n\n【本次判讀】\n${d}`;
  }
  return general;
}
