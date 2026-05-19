#!/usr/bin/env node
/**
 * Generates ppt/assets/mocks/*.html (brand-accurate UI reference frames).
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const mocksDir = join(root, 'ppt/assets/mocks');
mkdirSync(mocksDir, { recursive: true });

const sharedCss = [
  '/* App mock — 390x844 */',
  '* { box-sizing: border-box; margin: 0; padding: 0; }',
  'body {',
  '  width: 390px; height: 844px;',
  '  font-family: "PingFang TC", "Noto Sans TC", sans-serif;',
  '  font-size: 13px; color: #1e212b; background: #f7f8f6;',
  '  overflow: hidden; position: relative;',
  '}',
  '.header { padding: 52px 16px 12px; font-size: 18px; font-weight: 500; }',
  '.content { padding: 0 16px 72px; }',
  '.card {',
  '  background: rgba(255,255,255,0.92); border: 1px solid #dde0e6;',
  '  border-radius: 12px; padding: 14px; margin-bottom: 10px;',
  '}',
  '.pill { background: #e8f5ee; color: #2d6b4a; font-size: 11px; font-weight: 500;',
  '  padding: 4px 10px; border-radius: 9999px; display: inline-block; }',
  '.nav {',
  '  position: absolute; bottom: 0; left: 0; right: 0; height: 56px;',
  '  background: #fff; border-top: 1px solid #dde0e6;',
  '  display: flex; justify-content: space-around; align-items: center;',
  '  font-size: 10px; color: #9298a8;',
  '}',
  '.nav-active { color: #4c956c; background: #e8f5ee; padding: 6px 12px; border-radius: 9999px; }',
  '.muted { color: #4a4f63; }',
  '.caption { color: #9298a8; font-size: 11px; }',
  '.btn-dark { background: #1e212b; color: #fff; text-align: center; padding: 11px;',
  '  border-radius: 10px; font-weight: 500; margin-top: 10px; }',
  '.ring {',
  '  width: 110px; height: 110px; border-radius: 50%; margin: 0 auto 6px;',
  '  border: 8px solid #e8eae6; border-top-color: #4c956c;',
  '  display: flex; align-items: center; justify-content: center;',
  '  font-size: 20px; font-weight: 500;',
  '}',
  '.ai-card { background: #e6f1fb; border: 1px solid #b5d4f4; border-radius: 12px;',
  '  padding: 12px; color: #185fa5; font-size: 12px; line-height: 1.45; }',
  '.bar { height: 6px; border-radius: 4px; margin-top: 6px; }',
  '.bar-green { background: #4c956c; width: 70%; }',
  '.bar-blue { background: #378add; width: 55%; }',
  '.bar-amber { background: #ef9f27; width: 40%; }',
  '.product { display: flex; gap: 10px; align-items: center; }',
  '.thumb { width: 56px; height: 56px; background: #e8eae6; border-radius: 8px; }',
  '.fit-card { background: #e8f5ee; border-radius: 12px; padding: 14px; margin-bottom: 10px; }',
  '.fit-title { font-weight: 500; color: #2d6b4a; margin-bottom: 6px; }',
  '.fit-body { color: #2d6b4a; font-size: 12px; line-height: 1.45; }',
].join('\n');

writeFileSync(join(mocksDir, 'shared-mock.css'), `${sharedCss}\n`);

function page(title, body, activeNav) {
  const items = ['總覽', '記錄', '商城', '設定'];
  const nav = items
    .map((n) => {
      const cls = n === activeNav ? ' class="nav-active"' : '';
      return `<span${cls}>${n}</span>`;
    })
    .join('');
  return [
    '<!DOCTYPE html>',
    '<html lang="zh-Hant">',
    '<head><meta charset="UTF-8"/>',
    '<link rel="stylesheet" href="shared-mock.css"/>',
    `<title>${title}</title></head>`,
    '<body>',
    `<div class="header">${title}</div>`,
    `<motion></motion><div class="content">${body}</motion></motion></div>`,
    `<nav class="nav">${nav}</nav>`,
    '</body></html>',
  ].join('\n').replace(/<\/?motion>/g, '');
}

const mocks = {
  '01-dashboard.html': page(
    '今日概覽',
  [
    '<div class="card" style="text-align:center;padding:18px">',
    '<div class="ring">1,420</div>',
    '<p class="caption">/ 1,800 kcal</p>',
    '</div>',
    '<div class="card">',
    '<p style="font-weight:500;margin-bottom:8px">今日餐食</p>',
    '<p class="muted">早餐 · 燕麥碗 <span style="float:right">420</span></p>',
    '<p class="muted" style="margin-top:6px">午餐 · 雞胸沙拉 <span style="float:right">580</span></p>',
    '</motion></motion></div>',
    '<div class="ai-card">AI 建議：晚餐可補充優質蛋白。</div>',
  ].join(''),
    '總覽',
  ),
  '02-log.html': page(
    '飲食記錄',
    [
      '<div class="card">',
      '<p style="font-weight:500">＋ 拍照記錄</p>',
      '<p class="caption" style="margin-top:4px">AI 辨識熱量與營養素</p>',
      '</div>',
      '<div class="card">',
      '<p style="font-weight:500;margin-bottom:8px">晚餐</p>',
      '<p class="muted">鮭魚定食</p>',
      '<p class="caption">520 kcal</p>',
      '</div>',
      '<div class="btn-dark">手動新增食物</div>',
    ].join(''),
    '記錄',
  ),
  '03-food-recognition.html': page(
    '辨識結果',
    [
      '<div class="card">',
      '<p style="font-weight:500">鮭魚定食</p>',
      '<p class="caption">信心度 92%</p>',
      '<p style="margin-top:10px;font-size:20px;font-weight:500">520 <span class="caption">kcal</span></p>',
      '</div>',
      '<div class="card">',
      '<p class="muted">蛋白質</p><div class="bar bar-green"></motion></motion></div>',
      '<p class="muted" style="margin-top:8px">碳水</p><div class="bar bar-blue"></div>',
      '<p class="muted" style="margin-top:8px">脂肪</p><motion></motion><div class="bar bar-amber"></div>',
      '</div>',
      '<div class="btn-dark">加入紀錄</div>',
    ].join('').replace(/<\/?motion>/g, ''),
    '記錄',
  ),
  '04-analytics.html': page(
    '分析',
    [
      '<div class="card">',
      '<p style="font-weight:500;margin-bottom:10px">7 日熱量趨勢</p>',
      '<div style="display:flex;align-items:flex-end;gap:6px;height:80px">',
      '<div style="flex:1;background:#4c956c;height:45%;border-radius:3px"></div>',
      '<div style="flex:1;background:#4c956c;height:60%;border-radius:3px"></div>',
      '<motion></motion><div style="flex:1;background:#4c956c;height:55%;border-radius:3px"></div>',
      '<div style="flex:1;background:#4c956c;height:75%;border-radius:3px"></div>',
      '</div></div>',
      '<div class="card">',
      '<p class="muted">蛋白</p><motion></motion><div class="bar bar-green"></div>',
      '<p class="muted" style="margin-top:8px">碳水</p><div class="bar bar-blue"></div>',
      '<p class="muted" style="margin-top:8px">脂肪</p><div class="bar bar-amber"></div>',
      '</div>',
    ].join('').replace(/<\/?motion>/g, ''),
    '總覽',
  ),
  '05-shop.html': page(
    '健康商城',
    [
      '<p class="pill" style="margin-bottom:10px">為你推薦</p>',
      '<div class="card product">',
      '<div class="thumb"></div>',
      '<div><p style="font-weight:500">有機雞胸肉</p><p class="caption">符合低碳水飲食</p></div>',
      '</div>',
      '<div class="card product">',
      '<div class="thumb"></div>',
      '<div><p style="font-weight:500">堅果燕麥棒</p><p class="caption">無麩質 · 高纖</p></div>',
      '</div>',
    ].join(''),
    '商城',
  ),
  '06-product-detail.html': page(
    '商品詳情',
    [
      '<div class="card" style="height:120px;background:#e8eae6;border:none"></div>',
      '<div class="fit-card">',
      '<p class="fit-title">為什麼適合你</p>',
      '<p class="fit-body">符合低碳水飲食法，且無花生過敏風險。</p>',
      '</div>',
      '<div class="btn-dark">加入購物車</div>',
    ].join(''),
    '商城',
  ),
};

for (const [file, html] of Object.entries(mocks)) {
  writeFileSync(join(mocksDir, file), html.replace(/<\/?motion>/g, ''));
}

console.log(`Generated ${Object.keys(mocks).length} mocks in ppt/assets/mocks/`);
