'use client';

import { useCallback, useRef } from 'react';

import {
  fetchEcpayCheckoutPayload,
  fetchEcpayLogisticsSelectionPayload,
  type EcpayBridgePayloadResult,
} from '@/app/(main)/shop/actions';
import {
  buildRemainingLogisticsQueue,
  isCheckoutSnapshotLike,
} from '@/lib/shop/build-remaining-logistics-queue';
import { useEcpayCheckoutFlowStore } from '@/lib/shop/ecpay-checkout-flow-store';
import { parseShopCheckoutReturnUrl, subscribeEcpayReturnMessage } from '@/lib/shop/ecpay-payment-return-channel';
import {
  logEcpayCheckout,
  snapshotMainWindow,
  snapshotPopup,
} from '@/lib/shop/ecpay-checkout-debug';
import {
  clearEcpayPaymentSessionOrderId,
  setEcpayPaymentSessionOrderId,
} from '@/lib/shop/ecpay-payment-session';
import { createClient } from '@/lib/supabase/client';
import {
  ECPAY_LOGISTICS_POPUP_NAME,
  ECPAY_PAYMENT_POPUP_NAME,
  openEcpayPopup,
  showPopupMessage,
  submitLogisticsMapBridgeToNamedPopup,
  submitPaymentBridgeToNamedPopup,
} from '@/lib/shop/ecpay-popup-form';
import { waitForVendorLogisticsCompleted } from '@/lib/shop/wait-for-logistics-completed';
import { waitForOrderPaid } from '@/lib/shop/wait-for-order-paid';

export interface LogisticsQueueItem {
  vendorId: string;
  vendorName: string;
  logisticsType: 'CVS' | 'HOME';
  logisticsSubType: string;
}

const FAST_POLL_MS = 500;
const FAST_POLL_ATTEMPTS = 10;
const POLL_MS = 2000;
const MAX_POLL_ATTEMPTS = 90;
const PAYMENT_BRIDGE_PATH = '/shop/payment-bridge';

function hasOpenerPaymentReturnSignal(): boolean {
  if (typeof window === 'undefined') return false;
  return parseShopCheckoutReturnUrl(window.location.href) != null;
}

function getPopupCheckoutReturnUrl(popup: Window): string | null {
  try {
    if (popup.closed) return null;
    return parseShopCheckoutReturnUrl(popup.location.href);
  } catch {
    return null;
  }
}

function closePopupSafely(popup: Window): void {
  try {
    if (!popup.closed) popup.close();
  } catch {
    /* ignore */
  }
}

function getLogisticsPopupReference(): Window | null {
  try {
    return window.open('', ECPAY_LOGISTICS_POPUP_NAME);
  } catch {
    return null;
  }
}

async function waitForLogisticsStep(
  orderId: string,
  vendorId: string,
  popup: Window | null,
): Promise<'completed' | 'cancelled' | 'timeout'> {
  const maxAttempts = 120;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (popup?.closed) {
      return 'cancelled';
    }
    const completed = await waitForVendorLogisticsCompleted(orderId, vendorId, {
      timeoutMs: POLL_MS,
    });
    if (completed) {
      return 'completed';
    }
  }
  return 'timeout';
}

function submitBridgeByName(
  popupName: string,
  bridge: EcpayBridgePayloadResult,
): void {
  if (!bridge.ok) {
    throw new Error(bridge.error);
  }
  submitLogisticsMapBridgeToNamedPopup(popupName, bridge);
}

export function useEcpayCheckoutFlow(options: {
  onPaid?: (orderId: string) => void;
  onPendingPayment?: (orderId: string) => void;
  onError?: (message: string) => void;
}) {
  const { onPaid, onPendingPayment, onError } = options;
  const phase = useEcpayCheckoutFlowStore((s) => s.phase);
  const statusMessage = useEcpayCheckoutFlowStore((s) => s.statusMessage);
  const pendingPaymentOrderId = useEcpayCheckoutFlowStore(
    (s) => s.pendingPaymentOrderId,
  );
  const enterPaymentReady = useEcpayCheckoutFlowStore((s) => s.enterPaymentReady);
  const setPhase = useEcpayCheckoutFlowStore((s) => s.setPhase);
  const setStatusMessage = useEcpayCheckoutFlowStore((s) => s.setStatusMessage);
  const resetFlow = useEcpayCheckoutFlowStore((s) => s.resetFlow);

  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const pollOrderStatus = useCallback(
    async (orderId: string) => {
      stopPolling();
      setPhase('polling');
      setStatusMessage('等待付款結果…');

      let attempts = 0;
      const supabase = createClient();

      const tick = async () => {
        attempts += 1;
        if (attempts > MAX_POLL_ATTEMPTS) {
          logEcpayCheckout('pollOrderStatus timeout', { orderId, attempts });
          stopPolling();
          resetFlow();
          onError?.('等待付款逾時，請至訂單紀錄確認狀態');
          return;
        }

        const { data, error } = await supabase
          .from('orders')
          .select('status, order_metadata')
          .eq('id', orderId)
          .maybeSingle();

        logEcpayCheckout('pollOrderStatus tick', {
          orderId,
          attempt: attempts,
          status: data?.status ?? null,
          error: error?.message ?? null,
        });

        if (!error && data) {
          if (data.status === 'paid') {
            logEcpayCheckout('pollOrderStatus → onPaid', { orderId });
            stopPolling();
            resetFlow();
            onPaid?.(orderId);
            return;
          }

          const meta = data.order_metadata;
          const ecpay =
            meta != null && typeof meta === 'object' && !Array.isArray(meta) ?
              (meta as Record<string, unknown>).ecpay
            : null;
          const pending =
            ecpay != null && typeof ecpay === 'object' &&
            (ecpay as Record<string, unknown>).paymentPending === true;

          if (pending) {
            logEcpayCheckout('pollOrderStatus → onPendingPayment', { orderId });
            stopPolling();
            resetFlow();
            onPendingPayment?.(orderId);
            return;
          }
        }

        const delay = attempts < FAST_POLL_ATTEMPTS ? FAST_POLL_MS : POLL_MS;
        pollTimerRef.current = setTimeout(() => {
          void tick();
        }, delay);
      };

      void tick();
    },
    [
      onError,
      onPaid,
      onPendingPayment,
      resetFlow,
      setPhase,
      setStatusMessage,
      stopPolling,
    ],
  );

  const runLogisticsQueue = useCallback(
    async (
      orderId: string,
      queue: LogisticsQueueItem[],
      preOpenedPopup?: Window | null,
    ) => {
      let popup = preOpenedPopup ?? null;

      for (let i = 0; i < queue.length; i++) {
        const item = queue[i]!;
        setPhase('logistics');
        setStatusMessage(
          `物流設定 (${i + 1}/${queue.length})：${item.vendorName}`,
        );

        if (!popup || popup.closed) {
          popup = openEcpayPopup(ECPAY_LOGISTICS_POPUP_NAME);
          if (!popup) {
            onError?.('請允許彈出視窗以完成物流設定');
            resetFlow();
            return false;
          }
        }

        showPopupMessage(
          popup,
          `正在準備物流設定 (${i + 1}/${queue.length})…`,
        );

        try {
          const bridge = await fetchEcpayLogisticsSelectionPayload({
            orderId,
            vendorId: item.vendorId,
          });
          if (!bridge.ok) {
            throw new Error(bridge.error);
          }
          if ('skipMap' in bridge && bridge.skipMap) {
            /* 宅配：後端已標記完成，僅輪詢 snapshot */
          } else if ('redirectUrl' in bridge) {
            submitBridgeByName(ECPAY_LOGISTICS_POPUP_NAME, bridge);
          } else if ('fields' in bridge) {
            submitBridgeByName(ECPAY_LOGISTICS_POPUP_NAME, bridge);
          } else {
            throw new Error('物流設定回應格式不正確');
          }
        } catch (e) {
          if (e instanceof Error && e.message === 'POPUP_BLOCKED') {
            onError?.('請允許彈出視窗以完成物流設定');
          } else {
            const msg = e instanceof Error ? e.message : '物流設定失敗';
            onError?.(msg);
          }
          if (popup && !popup.closed) {
            closePopupSafely(popup);
          }
          resetFlow();
          return false;
        }

        const stepResult = await waitForLogisticsStep(
          orderId,
          item.vendorId,
          popup ?? getLogisticsPopupReference(),
        );
        if (stepResult === 'cancelled') {
          onError?.(`${item.vendorName} 物流設定已取消`);
          resetFlow();
          return false;
        }
        if (stepResult !== 'completed') {
          onError?.(`${item.vendorName} 物流尚未完成`);
          if (popup && !popup.closed) {
            closePopupSafely(popup);
          }
          resetFlow();
          return false;
        }

        if (i < queue.length - 1 && popup && !popup.closed) {
          showPopupMessage(popup, '物流設定完成，準備下一項…');
        }
      }

      if (popup && !popup.closed) {
        closePopupSafely(popup);
      }

      return true;
    },
    [onError, resetFlow, setPhase, setStatusMessage],
  );

  const openPayment = useCallback(
    async (orderId: string) => {
      logEcpayCheckout('openPayment start', {
        orderId,
        mainWindow: snapshotMainWindow(),
        clientOrigin: window.location.origin,
      });

      setEcpayPaymentSessionOrderId(orderId);

      setPhase('payment');
      setStatusMessage('請於彈出視窗完成付款');

      const popup = openEcpayPopup(ECPAY_PAYMENT_POPUP_NAME);
      if (!popup) {
        logEcpayCheckout('openPayment popup blocked → payment-bridge');
        window.location.assign(
          `${PAYMENT_BRIDGE_PATH}?orderId=${encodeURIComponent(orderId)}`,
        );
        return;
      }

      try {
        const bridge = await fetchEcpayCheckoutPayload({
          orderId,
          clientOrigin: window.location.origin,
        });
        if (!bridge.ok) {
          throw new Error(bridge.error);
        }
        if ('skipPayment' in bridge && bridge.skipPayment) {
          closePopupSafely(popup);
          clearEcpayPaymentSessionOrderId();
          resetFlow();
          onPaid?.(bridge.orderId);
          return;
        }
        if ('fields' in bridge) {
          logEcpayCheckout('openPayment bridge fields', {
            orderId,
            action: bridge.action,
            merchantId: bridge.fields.MerchantID ?? bridge.debug?.merchantId ?? null,
            OrderResultURL: bridge.fields.OrderResultURL ?? null,
            ReturnURL: bridge.fields.ReturnURL ?? null,
            CustomField1: bridge.fields.CustomField1 ?? null,
            checkMacSelfOk: bridge.debug?.checkMacSelfOk ?? null,
          });
        } else {
          logEcpayCheckout('openPayment bridge redirectUrl', {
            orderId,
            redirectUrl: bridge.redirectUrl,
          });
        }
        showPopupMessage(popup, '載入付款頁…');
        submitPaymentBridgeToNamedPopup(ECPAY_PAYMENT_POPUP_NAME, bridge);
      } catch (e) {
        logEcpayCheckout('openPayment bridge error', {
          orderId,
          error: e instanceof Error ? e.message : String(e),
        });
        try {
          popup.close();
        } catch {
          /* ignore */
        }
        if (e instanceof Error && e.message === 'POPUP_BLOCKED') {
          onError?.('請允許彈出視窗以完成付款');
        } else {
          const msg = e instanceof Error ? e.message : '付款視窗開啟失敗';
          onError?.(msg);
        }
        enterPaymentReady(orderId);
        return;
      }

      let timer: ReturnType<typeof setInterval>;
      let watchTicks = 0;
      let settlingAfterClose = false;

      const stopPaymentWatch = (reason: string) => {
        logEcpayCheckout('openPayment watch stop', {
          orderId,
          reason,
          mainWindow: snapshotMainWindow(),
        });
        clearInterval(timer);
        window.removeEventListener('focus', onFocus);
        unsubscribeReturnMessage();
        stopPolling();
      };

      const navigateMainToReturnPath = (reason: string) => {
        const returnPath = parseShopCheckoutReturnUrl(window.location.href);
        if (returnPath) {
          logEcpayCheckout('openPayment navigate return path', {
            orderId,
            reason,
            returnPath,
          });
          stopPaymentWatch(reason);
          closePopupSafely(popup);
          window.location.assign(returnPath);
          return true;
        }
        return false;
      };

      const unsubscribeReturnMessage = subscribeEcpayReturnMessage(
        (path) => {
          logEcpayCheckout('openPayment postMessage navigate', { orderId, path });
          stopPaymentWatch('postMessage');
          closePopupSafely(popup);
          window.location.assign(path);
        },
        { supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL },
      );

      const settleAfterPopupClosed = async () => {
        if (settlingAfterClose) return;
        settlingAfterClose = true;
        logEcpayCheckout('openPayment popup closed → settle', { orderId });
        setPhase('polling');
        setStatusMessage('確認付款結果…');

        if (navigateMainToReturnPath('popupClosed:returnPath')) {
          return;
        }

        const result = await waitForOrderPaid(orderId, { timeoutMs: 20000 });
        logEcpayCheckout('openPayment popup closed poll result', {
          orderId,
          ...result,
        });

        stopPaymentWatch('popupClosed:settled');
        closePopupSafely(popup);
        clearEcpayPaymentSessionOrderId();
        resetFlow();

        if (result.status === 'paid') {
          onPaid?.(orderId);
          return;
        }
        if (result.status === 'pending_payment') {
          onPendingPayment?.(orderId);
          return;
        }
        onError?.('付款結果確認中，請至訂單紀錄查看');
      };

      const syncMainWindowFromPopup = (): boolean => {
        const returnUrl = getPopupCheckoutReturnUrl(popup);
        if (!returnUrl) return false;
        logEcpayCheckout('openPayment sync from popup', {
          orderId,
          returnUrl,
          popup: snapshotPopup(popup),
        });
        stopPaymentWatch('syncMainWindowFromPopup');
        closePopupSafely(popup);
        window.location.assign(returnUrl);
        return true;
      };

      const onFocus = () => {
        logEcpayCheckout('openPayment window focus', {
          orderId,
          mainWindow: snapshotMainWindow(),
          popup: snapshotPopup(popup),
          hasOpenerSignal: hasOpenerPaymentReturnSignal(),
        });
        if (navigateMainToReturnPath('focus:returnPath')) {
          return;
        }
        if (syncMainWindowFromPopup()) return;
        if (!popup.closed) return;
        void settleAfterPopupClosed();
      };

      window.addEventListener('focus', onFocus);

      logEcpayCheckout('openPayment start pollOrderStatus', { orderId });
      void pollOrderStatus(orderId);

      timer = setInterval(() => {
        watchTicks += 1;
        if (watchTicks === 1 || watchTicks % 4 === 0) {
          logEcpayCheckout('openPayment watch tick', {
            orderId,
            tick: watchTicks,
            mainWindow: snapshotMainWindow(),
            popup: snapshotPopup(popup),
            hasOpenerSignal: hasOpenerPaymentReturnSignal(),
          });
        }

        if (navigateMainToReturnPath('tick:returnPath')) {
          return;
        }

        if (syncMainWindowFromPopup()) return;

        if (popup.closed) {
          void settleAfterPopupClosed();
        }
      }, 500);
    },
    [enterPaymentReady, onError, onPaid, onPendingPayment, pollOrderStatus, resetFlow, setPhase, setStatusMessage, stopPolling],
  );

  const startEcpayFlow = useCallback(
    async (
      orderId: string,
      logisticsQueue: LogisticsQueueItem[],
      preOpenedPopup?: Window | null,
    ) => {
      try {
        const logisticsOk = await runLogisticsQueue(
          orderId,
          logisticsQueue,
          preOpenedPopup,
        );
        if (!logisticsOk) return;
        enterPaymentReady(orderId);
      } catch (e) {
        const msg = e instanceof Error ? e.message : '結帳流程失敗';
        onError?.(msg);
        resetFlow();
      }
    },
    [enterPaymentReady, onError, resetFlow, runLogisticsQueue],
  );

  const resumeEcpayCheckout = useCallback(
    async (orderId: string) => {
      const { data: order, error } = await createClient()
        .from('orders')
        .select('checkout_snapshot')
        .eq('id', orderId)
        .maybeSingle();

      if (error || !order) {
        onError?.('找不到訂單，無法續接結帳');
        return;
      }

      const snap = order.checkout_snapshot;
      if (!isCheckoutSnapshotLike(snap)) {
        onError?.('訂單資料異常，無法續接結帳');
        return;
      }

      const remainingQueue = buildRemainingLogisticsQueue(snap);
      try {
        if (remainingQueue.length > 0) {
          const logisticsOk = await runLogisticsQueue(orderId, remainingQueue);
          if (!logisticsOk) return;
        } else if (!snap.logisticsCompleted) {
          onError?.('物流尚未完成，請重新設定');
          resetFlow();
          return;
        }
        enterPaymentReady(orderId);
      } catch (e) {
        const msg = e instanceof Error ? e.message : '結帳流程失敗';
        onError?.(msg);
        resetFlow();
      }
    },
    [enterPaymentReady, onError, resetFlow, runLogisticsQueue],
  );

  return {
    phase,
    statusMessage,
    pendingPaymentOrderId,
    startEcpayFlow,
    resumeEcpayCheckout,
    openPayment,
    stopPolling,
  };
}
