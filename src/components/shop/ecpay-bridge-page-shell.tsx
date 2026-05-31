'use client';

import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import type { EcpaySubmitBridgePayload } from '@/lib/shop/ecpay-bridge-types';
import type { EcpayBridgeKind } from '@/lib/shop/ecpay-bridge-resume';
import {
  buildCheckoutReturnPath,
  prepareEcpayBridgeResume,
} from '@/lib/shop/ecpay-bridge-resume';
import { submitEcpayBridgeInDocument } from '@/lib/shop/submit-ecpay-bridge-form';

const FETCH_TIMEOUT_MS = 20_000;
const SUBMIT_WATCHDOG_MS = 8_000;

export type EcpayBridgePhase =
  | 'loading'
  | 'redirecting'
  | 'stuck'
  | 'error';

export interface EcpayBridgePageShellProps {
  orderId: string;
  bridgeKind: EcpayBridgeKind;
  loadingMessage: string;
  stuckMessage?: string;
  onFetchBridge: () => Promise<
    | { ok: true; bridge: EcpaySubmitBridgePayload }
    | { ok: false; error: string }
    | { ok: true; skip: true; redirectPath: string }
  >;
  onBeforeSubmit?: () => void;
}

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);
    void promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export function EcpayBridgePageShell({
  orderId,
  bridgeKind,
  loadingMessage,
  stuckMessage = '若已在外部瀏覽器開啟綠界，請完成操作後返回；若未開啟，請重試或返回結帳。',
  onFetchBridge,
  onBeforeSubmit,
}: EcpayBridgePageShellProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<EcpayBridgePhase>('loading');
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  const returnToCheckout = useCallback(() => {
    prepareEcpayBridgeResume(orderId, bridgeKind);
    router.replace(buildCheckoutReturnPath(orderId));
  }, [bridgeKind, orderId, router]);

  const runBridge = useCallback(async () => {
    setPhase('loading');
    setError(null);

    try {
      const result = await withTimeout(
        onFetchBridge(),
        FETCH_TIMEOUT_MS,
        '連線逾時，請檢查網路後重試',
      );

      if (!result.ok) {
        setError(result.error);
        setPhase('error');
        return;
      }

      if ('skip' in result) {
        window.location.assign(result.redirectPath);
        return;
      }

      onBeforeSubmit?.();
      setPhase('redirecting');
      submitEcpayBridgeInDocument(result.bridge);

      window.setTimeout(() => {
        if (window.location.pathname.includes('-bridge')) {
          setPhase('stuck');
        }
      }, SUBMIT_WATCHDOG_MS);
    } catch (e) {
      setError(e instanceof Error ? e.message : '無法開啟綠界頁面');
      setPhase('error');
    }
  }, [onBeforeSubmit, onFetchBridge]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    prepareEcpayBridgeResume(orderId, bridgeKind);
    void runBridge();
  }, [bridgeKind, orderId, runBridge]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const handle = App.addListener('appStateChange', (state) => {
      if (!state.isActive) return;
      if (phase === 'redirecting') {
        setPhase('stuck');
      }
    });

    return () => {
      void handle.then((h) => h.remove());
    };
  }, [phase]);

  const showRetry = phase === 'error' || phase === 'stuck';

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center px-4 py-12 text-center">
      {phase === 'loading' || phase === 'redirecting' ? (
        <p className="text-body text-muted-foreground" role="status">
          {phase === 'redirecting' ? '正在導向綠界…' : loadingMessage}
        </p>
      ) : null}

      {phase === 'stuck' ? (
        <p className="text-body text-muted-foreground" role="status">
          {stuckMessage}
        </p>
      ) : null}

      {error ? (
        <p className="mt-3 text-body text-[#E24B4A]" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Button type="button" variant="outline" size="sm" onClick={returnToCheckout}>
          返回結帳
        </Button>
        {showRetry ? (
          <Button type="button" variant="default" size="sm" onClick={() => void runBridge()}>
            重試
          </Button>
        ) : null}
      </div>
    </div>
  );
}
