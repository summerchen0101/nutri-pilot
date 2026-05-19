/**
 * 添加物條列說明目錄；供 lookups 彈窗與 enrich 別名對齊。
 */

export type AdditiveCatalogItem = {
  name: string;
  note: string;
};

export type AdditiveCatalogEntry = {
  matchKeys: string[];
  intro: string;
  items: AdditiveCatalogItem[];
};

const ADDITIVE_CATALOG: AdditiveCatalogEntry[] = [
  {
    matchKeys: ['調味劑', '鮮味劑'],
    intro: '調味劑用於增強鮮味或風味，常見包括：',
    items: [
      {
        name: '味精（麩酸鈉）',
        note: '常見鮮味來源；少數人可能自覺不耐，可依感受調整份量。',
      },
      {
        name: "5'-次黃嘌呤核苷酸二鈉",
        note: '核苷酸類調味，常與味精併用增強鮮味。',
      },
      {
        name: "5'-鳥嘌呤核苷酸二鈉",
        note: '核苷酸類調味，常見於調味粉、湯料包。',
      },
      {
        name: '琥珀酸二鈉',
        note: '調味／緩衝用途，請依標示與整體攝取評估。',
      },
    ],
  },
  {
    matchKeys: ['味精', 'MSG', '麩酸鈉'],
    intro: '味精通常指麩酸鈉，屬調味劑：',
    items: [
      {
        name: '麩酸鈉',
        note: '增強鮮味；少數人可能自覺不耐，非典型過敏原。',
      },
    ],
  },
  {
    matchKeys: ['抗氧化劑'],
    intro: '抗氧化劑用於減緩油脂氧化、延長品質，常見包括：',
    items: [
      {
        name: 'BHA（丁基羥基茴香醚）',
        note: '合成抗氧化劑，多用於油脂與含油加工品。',
      },
      {
        name: 'BHT（二丁基羥基甲苯）',
        note: '合成抗氧化劑，請依標示辨識並適量。',
      },
      {
        name: '抗壞血酸（維生素C）',
        note: '亦作抗氧化用途；一般用量下多數人可安心。',
      },
      {
        name: '抗壞血酸酯類',
        note: '脂溶性抗氧化衍生物，常見於油脂食品。',
      },
    ],
  },
  {
    matchKeys: ['色素', '增色劑', '著色劑', '人工色素', '食用色素'],
    intro: '色素／著色劑用於調整食品外觀，常見包括：',
    items: [
      {
        name: '檸檬黃',
        note: '合成黃色色素；敏感體質或幼童可依需求選擇。',
      },
      {
        name: '日落黃',
        note: '合成橙黃色素；請依標示與法規限量。',
      },
      {
        name: '紅色40號',
        note: '合成紅色色素（如 Allura Red）；留意個人反應。',
      },
      {
        name: '胭脂紅',
        note: '紅色色素，常見於糖果、飲品。',
      },
      {
        name: '二氧化鈦',
        note: '白色色素；各國管理規範不一，可依需求選擇。',
      },
    ],
  },
  {
    matchKeys: ['防腐劑'],
    intro: '防腐劑用於抑制微生物，常見包括：',
    items: [
      {
        name: '苯甲酸鈉',
        note: '常見防腐劑，法規有限量。',
      },
      {
        name: '己二烯酸／己二烯酸鉀',
        note: '抑制霉菌與酵母，常見於飲料、醬料。',
      },
      {
        name: '山梨酸鉀',
        note: '常見防腐劑，於合法限量內使用。',
      },
      {
        name: '去水醋酸',
        note: '部分起司、麵包可能使用，請依標示。',
      },
    ],
  },
  {
    matchKeys: ['乳化劑'],
    intro: '乳化劑幫助油水混合，常見包括：',
    items: [
      {
        name: '脂肪酸甘油酯',
        note: '改善口感與質地，加工食品常見。',
      },
      {
        name: '單／雙甘油酯',
        note: '乳化用途，請依整體飲食評估。',
      },
      {
        name: '大豆卵磷脂',
        note: '對大豆過敏者須留意來源。',
      },
    ],
  },
  {
    matchKeys: ['增稠劑'],
    intro: '增稠劑增加黏稠度，常見包括：',
    items: [
      {
        name: '關華豆膠',
        note: '植物膠體，多數人可耐受。',
      },
      {
        name: '刺槐豆膠',
        note: '增稠用途，腸道敏感者可觀察反應。',
      },
      {
        name: '卡拉膠',
        note: '海藻抽取，常見於乳飲、果凍。',
      },
      {
        name: '玉米糖膠',
        note: '增稠／穩定，請依標示辨識。',
      },
    ],
  },
  {
    matchKeys: ['甜味劑', '人工甜味劑'],
    intro: '甜味劑提供甜味、降低糖含量，常見包括：',
    items: [
      {
        name: '阿斯巴甜',
        note: '苯酮尿症患者須嚴格避免。',
      },
      {
        name: '蔗糖素',
        note: '高倍甜味劑，法規訂有容許量。',
      },
      {
        name: '糖精',
        note: '人工甜味劑，請勿過量。',
      },
      {
        name: '醋磺內酯鉀',
        note: '常與其他代糖併用，請依標示。',
      },
    ],
  },
  {
    matchKeys: ['膨鬆劑'],
    intro: '膨鬆劑使麵食等產品膨鬆，常見包括：',
    items: [
      {
        name: '碳酸氫鈉（小蘇打）',
        note: '亦貢獻鈉，限鈉飲食宜留意。',
      },
      {
        name: '焦磷酸二鈉',
        note: '泡打粉、加工麵食可能含有。',
      },
      {
        name: '磷酸二氫鈣',
        note: '膨鬆或品質改良用途。',
      },
    ],
  },
  {
    matchKeys: ['酸度調節劑'],
    intro: '酸度調節劑穩定酸鹼與風味，常見包括：',
    items: [
      { name: '檸檬酸', note: '常見於飲料、果凍。' },
      { name: '乳酸', note: '發酵食品、乳製品可能含有。' },
      { name: '磷酸', note: '碳酸飲料等，腎病患者請依醫囑。' },
    ],
  },
  {
    matchKeys: ['香料', '人工香料', '天然香料'],
    intro: '香料用於調香，標示可能為複合配方，常見包括：',
    items: [
      {
        name: '香料／天然香料',
        note: '可能為多種揮發成分組成，過敏者宜詳讀標示。',
      },
      {
        name: '人工香料',
        note: '合成調香物質，敏感體質可留意反應。',
      },
      {
        name: '乙基香蘭素等',
        note: '若成分表有列具名香料，請以原文為準。',
      },
    ],
  },
  {
    matchKeys: ['麥芽糊精'],
    intro: '麥芽糊精為澱粉水解物，常作填充或載體：',
    items: [
      {
        name: '麥芽糊精',
        note: '升糖指數可能較高，糖尿病或控糖者宜留意份量與整體碳水。',
      },
    ],
  },
  {
    matchKeys: ['品質改良劑', '磷酸鹽'],
    intro: '品質改良劑改善質地或保水性，常見包括：',
    items: [
      {
        name: '焦磷酸鹽等磷酸鹽',
        note: '腎功能異常者磷負荷需留意，請依醫囑。',
      },
    ],
  },
  {
    matchKeys: ['漂白劑'],
    intro: '漂白劑改善色澤，常見包括：',
    items: [
      {
        name: '過氧化苯甲醯',
        note: '部分麵粉製品可能使用，可依需求選購。',
      },
    ],
  },
  {
    matchKeys: ['卡拉膠'],
    intro: '卡拉膠為增稠劑：',
    items: [
      {
        name: '卡拉膠',
        note: '海藻抽取；多數人可耐受，腸道敏感者可觀察反應。',
      },
    ],
  },
  {
    matchKeys: ['玉米糖膠'],
    intro: '玉米糖膠為增稠劑：',
    items: [
      {
        name: '玉米糖膠',
        note: '增稠／穩定用途，一般用量下多數人可安心。',
      },
    ],
  },
];

function normalizeMatchKey(s: string): string {
  return s
    .trim()
    .normalize('NFKC')
    .replace(/\s+/g, '')
    .replace(/／/g, '/');
}

export function findAdditiveCatalogEntry(
  matchKey: string,
): AdditiveCatalogEntry | null {
  const n = normalizeMatchKey(matchKey);
  if (!n) return null;

  for (const entry of ADDITIVE_CATALOG) {
    for (const key of entry.matchKeys) {
      if (normalizeMatchKey(key) === n) return entry;
    }
  }

  let best: AdditiveCatalogEntry | null = null;
  let bestLen = 0;
  for (const entry of ADDITIVE_CATALOG) {
    for (const key of entry.matchKeys) {
      const nk = normalizeMatchKey(key);
      if (!nk) continue;
      if (n.includes(nk) || nk.includes(n)) {
        if (nk.length > bestLen) {
          bestLen = nk.length;
          best = entry;
        }
      }
    }
  }

  return best;
}

export function formatAdditiveCatalogBody(matchKey: string): string | null {
  const entry = findAdditiveCatalogEntry(matchKey);
  if (!entry) return null;

  const lines = [entry.intro];
  for (const item of entry.items) {
    lines.push(`・${item.name}：${item.note}`);
  }
  return lines.join('\n');
}

export function hasAdditiveCatalogEntry(matchKey: string): boolean {
  return findAdditiveCatalogEntry(matchKey) !== null;
}

export function getAdditiveCatalogAliases(): string[] {
  const set = new Set<string>();
  for (const entry of ADDITIVE_CATALOG) {
    for (const key of entry.matchKeys) {
      set.add(key);
    }
    for (const item of entry.items) {
      const short = item.name.split('（')[0]?.trim();
      if (short) set.add(short);
    }
  }
  return Array.from(set);
}
