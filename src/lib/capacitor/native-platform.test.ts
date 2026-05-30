import assert from 'node:assert/strict';
import test from 'node:test';

import { buildAuthCallbackRedirectUrl } from '@/lib/capacitor/native-platform';

test('buildAuthCallbackRedirectUrl uses NEXT_PUBLIC_APP_URL', () => {
  const prev = process.env.NEXT_PUBLIC_APP_URL;
  process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com';
  try {
    assert.equal(
      buildAuthCallbackRedirectUrl('/dashboard'),
      'https://app.example.com/auth/callback',
    );
  } finally {
    if (prev === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL;
    } else {
      process.env.NEXT_PUBLIC_APP_URL = prev;
    }
  }
});

test('buildAuthCallbackRedirectUrl rejects unsafe next path', () => {
  const prev = process.env.NEXT_PUBLIC_APP_URL;
  process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com';
  try {
    assert.equal(
      buildAuthCallbackRedirectUrl('//evil.com'),
      'https://app.example.com/auth/callback',
    );
  } finally {
    if (prev === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL;
    } else {
      process.env.NEXT_PUBLIC_APP_URL = prev;
    }
  }
});
