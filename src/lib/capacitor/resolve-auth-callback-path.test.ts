import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveAuthCallbackPath } from '@/lib/capacitor/resolve-auth-callback-path';

test('resolveAuthCallbackPath accepts nutriguard scheme when NEXT_PUBLIC_APP_URL is set', () => {
  const prev = process.env.NEXT_PUBLIC_APP_URL;
  process.env.NEXT_PUBLIC_APP_URL = 'http://192.168.50.173:3000';
  try {
    assert.equal(
      resolveAuthCallbackPath('nutriguard://auth/callback?code=pkce-code'),
      '/auth/callback?code=pkce-code',
    );
  } finally {
    if (prev === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL;
    } else {
      process.env.NEXT_PUBLIC_APP_URL = prev;
    }
  }
});

test('resolveAuthCallbackPath accepts same-origin https callback', () => {
  const prev = process.env.NEXT_PUBLIC_APP_URL;
  process.env.NEXT_PUBLIC_APP_URL = 'http://192.168.50.173:3000';
  try {
    assert.equal(
      resolveAuthCallbackPath(
        'http://192.168.50.173:3000/auth/callback?code=abc',
      ),
      '/auth/callback?code=abc',
    );
  } finally {
    if (prev === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL;
    } else {
      process.env.NEXT_PUBLIC_APP_URL = prev;
    }
  }
});

test('resolveAuthCallbackPath rejects foreign https origin', () => {
  const prev = process.env.NEXT_PUBLIC_APP_URL;
  process.env.NEXT_PUBLIC_APP_URL = 'http://192.168.50.173:3000';
  try {
    assert.equal(
      resolveAuthCallbackPath('https://evil.example/auth/callback?code=abc'),
      null,
    );
  } finally {
    if (prev === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL;
    } else {
      process.env.NEXT_PUBLIC_APP_URL = prev;
    }
  }
});
