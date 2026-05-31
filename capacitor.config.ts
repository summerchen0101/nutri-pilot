import type { CapacitorConfig } from '@capacitor/cli';

import { loadEnvLocalForCapacitorConfig } from './src/lib/capacitor/load-env-local-for-config';

loadEnvLocalForCapacitorConfig();

const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');
const prodServerUrl =
  process.env.CAPACITOR_SERVER_URL?.replace(/\/$/, '') ?? appUrl ?? '';
const devServerUrl = process.env.CAPACITOR_DEV_SERVER_URL?.replace(/\/$/, '');
const isDev = process.env.CAPACITOR_DEV === '1' && Boolean(devServerUrl);

function addNavigationHost(hosts: Set<string>, raw: string | undefined): void {
  if (!raw) {
    return;
  }
  try {
    hosts.add(new URL(raw).hostname);
  } catch {
    // ignore invalid URL
  }
}

/** 未列出的外部網址會由 iOS 改開 Safari（Magic Link 會因此登入失敗） */
function buildAllowNavigation(): string[] {
  const hosts = new Set<string>(['127.0.0.1', 'localhost', '*.supabase.co']);
  addNavigationHost(hosts, process.env.NEXT_PUBLIC_SUPABASE_URL);
  addNavigationHost(hosts, process.env.NEXT_PUBLIC_APP_URL);
  addNavigationHost(hosts, process.env.CAPACITOR_DEV_SERVER_URL);
  return Array.from(hosts);
}

const allowNavigation = buildAllowNavigation();

const config: CapacitorConfig = {
  appId: 'com.nuts.nutriguard',
  appName: 'Nutri Guard',
  webDir: 'public',
  server: isDev && devServerUrl
    ? {
        url: devServerUrl,
        cleartext: devServerUrl.startsWith('http://'),
        allowNavigation,
      }
    : prodServerUrl
      ? {
          url: prodServerUrl,
          androidScheme: 'https',
          allowNavigation,
        }
      : undefined,
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
    },
  },
};

export default config;
