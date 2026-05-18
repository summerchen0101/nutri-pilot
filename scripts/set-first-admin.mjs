#!/usr/bin/env node
/**
 * 以 Service Role 將第一位使用者設為 super_admin（僅本機／CI 一次性使用）。
 * 用法：SUPABASE_SERVICE_ROLE_KEY=… NEXT_PUBLIC_SUPABASE_URL=… node scripts/set-first-admin.mjs you@example.com
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.argv[2]?.trim().toLowerCase();

if (!url || !serviceKey) {
  console.error(
    '缺少 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY（請先 export 或於指令前帶入）。',
  );
  process.exit(1);
}

if (!email) {
  console.error('用法: node scripts/set-first-admin.mjs <email>');
  process.exit(1);
}

const admin = createClient(url, serviceKey);

const { data: listData, error: listErr } = await admin.auth.admin.listUsers({
  page: 1,
  perPage: 1000,
});

if (listErr) {
  console.error(listErr.message);
  process.exit(1);
}

const user = listData.users.find(
  (u) => u.email?.toLowerCase() === email,
);

if (!user) {
  console.error(`找不到 email：${email}`);
  process.exit(1);
}

const { error: updErr } = await admin.auth.admin.updateUserById(user.id, {
  app_metadata: {
    ...user.app_metadata,
    admin_role: 'super_admin',
  },
});

if (updErr) {
  console.error(updErr.message);
  process.exit(1);
}

console.log(`已設定 ${email}（${user.id}）為 super_admin。`);
