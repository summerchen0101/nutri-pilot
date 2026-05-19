#!/usr/bin/env node
/**
 * Renders HTML mocks and slide masters to PNG via Playwright (local to ppt/.render-tmp).
 * Usage: node scripts/ppt-render-screenshots.mjs
 */
import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tmpDir = join(root, 'ppt/.render-tmp');

const jobs = [
  {
    dir: join(root, 'ppt/assets/mocks'),
    out: join(root, 'ppt/assets'),
    width: 390,
    height: 844,
    files: [
      '01-dashboard.html',
      '02-log.html',
      '03-food-recognition.html',
      '04-analytics.html',
      '05-shop.html',
      '06-product-detail.html',
    ],
  },
  {
    dir: join(root, 'ppt/slide-masters'),
    out: join(root, 'ppt/slide-masters/export'),
    width: 1920,
    height: 1080,
    files: ['cover.html', 'content.html', 'data.html'],
  },
];

mkdirSync(tmpDir, { recursive: true });
mkdirSync(join(root, 'ppt/assets'), { recursive: true });
mkdirSync(join(root, 'ppt/slide-masters/export'), { recursive: true });

const runnerPath = join(tmpDir, 'render.cjs');
writeFileSync(
  runnerPath,
  `
const { chromium } = require('playwright');
const path = require('path');
const jobs = JSON.parse(process.env.PPT_RENDER_JOBS);

(async () => {
  const browser = await chromium.launch();
  for (const job of jobs) {
    for (const file of job.files) {
      const htmlPath = path.join(job.dir, file);
      const page = await browser.newPage({
        viewport: { width: job.width, height: job.height },
      });
      await page.goto('file://' + htmlPath);
      await page.waitForTimeout(250);
      const outName = file.replace(/\\.html$/, '.png');
      const outPath = path.join(job.out, outName);
      await page.screenshot({ path: outPath, type: 'png' });
      await page.close();
      console.log('Wrote', outPath);
    }
  }
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
`,
);

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', cwd: tmpDir, ...opts });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

run('npm', ['install', 'playwright@1.49.1', '--no-save', '--silent']);
run('npx', ['playwright', 'install', 'chromium']);

const payload = jobs.map((j) => ({
  dir: j.dir,
  out: j.out,
  width: j.width,
  height: j.height,
  files: j.files.filter((f) => existsSync(join(j.dir, f))),
}));

run('node', [runnerPath], {
  env: {
    ...process.env,
    PPT_RENDER_JOBS: JSON.stringify(payload),
  },
});
