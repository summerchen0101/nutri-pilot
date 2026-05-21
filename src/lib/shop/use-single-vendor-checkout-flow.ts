'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  assertOrderPayable,
  fetchEcpayLogisticsSelectionPayload,
  markHomeLogisticsForCheckout,
  startCheckout,
  updateCheckoutOrderShipping,
} from '@/app/(main)/shop/actions';
import { useEcpayCheckoutFlowStore } from '@/lib/shop/ecpay-checkout-flow-store';
import {
  fetchOrderCheckoutSummary,
  fetchOrderLogisticsDraft,
  type OrderLogisticsDraftView,
} from '@/lib/shop/order-logistics-snapshot';
import {
  ECPAY_LOGISTICS_POPUP_NAME,
  openEcpayPopup,
  showPopupMessage,
  submitLogisticsMapBridgeToNamedPopup,
} from '@/lib/shop/ecpay-popup-form';
import {
  isCvsCodShippingCode,
  isCvsShippingCode,
  isHomeDeliveryCode,
} from '@/lib/shop/shipping-method-kind';
import { useEcpayCheckoutFlow } from '@/lib/shop/use-ecpay-checkout-flow';
import { waitForLogisticsCreated } from '@/lib/shop/wait-for-logistics-created';
import { waitForOrderPaid } from '@/lib/shop/wait-for-order-paid';
import { waitForStoreSelected } from '@/lib/shop/wait-for-store-selected';
import type { VendorShippingSummary } from '@/lib/shop/vendor-shipping';
import type { CartLine } from '@/lib/shop/cart-store';

export type SingleVendorCheckoutPhase =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'selectingStore'
  | 'confirmingHome'
  | 'paying'
  | 'awaitingLogistics'
  | 'done';

export interface UseSingleVendorCheckoutFlowOptions {
  checkoutVendorId: string | null;
  selectedSummary: VendorShippingSummary | null;
  selectedValidLines: CartLine[];
  vendorShippingSelections: Record<string, string>;
  recipientName: string;
  recipientPhone: string;
  recipientAddressFull: string;
  saveShippingToProfile: boolean;
  isPanelOpen: boolean;
  /** 收件預設已載入（避免空值時假性 onError） */
  recipientDefaultsReady: boolean;
  resumeOrderId?: string | null;
  onComplete: (orderId: string) => void;
  onError: (message: string) => void;
}

export function useSingleVendorCheckoutFlow(
  options: UseSingleVendorCheckoutFlowOptions,
) {
  const {
    checkoutVendorId,
    selectedSummary,
    selectedValidLines,
    vendorShippingSelections,
    recipientName,
    recipientPhone,
    recipientAddressFull,
    saveShippingToProfile,
    isPanelOpen,
    recipientDefaultsReady,
    resumeOrderId,
    onComplete,
    onError,
  } = options;

  const [phase, setPhase] = useState<SingleVendorCheckoutPhase>('idle');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [paymentTotal, setPaymentTotal] = useState(0);
  const [shippingMethodCode, setShippingMethodCode] = useState<string | null>(
    null,
  );
  const [draft, setDraft] = useState<OrderLogisticsDraftView | null>(null);
  const [homeSubType, setHomeSubType] = useState<'TCAT' | 'POST'>('TCAT');
  const [homeAddressReady, setHomeAddressReady] = useState(false);

  const orderCreatingRef = useRef(false);
  const resumeHandledOrderIdRef = useRef<string | null>(null);
  const pollAbortRef = useRef<AbortController | null>(null);
  const previousCheckoutVendorIdRef = useRef<string | null>(null);
  const mapReturnOrderId = useEcpayCheckoutFlowStore((s) => s.mapReturnOrderId);

  const beginPoll = useCallback(() => {
    pollAbortRef.current?.abort();
    const controller = new AbortController();
    pollAbortRef.current = controller;
    return controller.signal;
  }, []);

  const abortPolls = useCallback(() => {
    pollAbortRef.current?.abort();
    pollAbortRef.current = null;
  }, []);

  const refreshDraft = useCallback(async (oid: string, vid: string) => {
    const next = await fetchOrderLogisticsDraft(oid, vid);
    setDraft(next);
    return next;
  }, []);

  const hydrateOrderFromDb = useCallback(
    async (oid: string, vid: string) => {
      const summary = await fetchOrderCheckoutSummary(oid);
      if (summary) {
        setPaymentTotal(summary.paymentTotal);
        setShippingMethodCode(
          summary.shippingMethodCode ??
            selectedSummary?.selectedShippingMethodCode ??
            null,
        );
      }
      await refreshDraft(oid, vid);
    },
    [refreshDraft, selectedSummary?.selectedShippingMethodCode],
  );

  const finishWithLogistics = useCallback(
    async (
      oid: string,
      vid: string,
      options?: { requirePayment?: boolean; paymentTotal?: number },
    ) => {
      const signal = beginPoll();
      const requirePayment = options?.requirePayment !== false;
      const amount = options?.paymentTotal ?? paymentTotal;

      if (requirePayment && amount > 0) {
        setPhase('awaitingLogistics');
        setStatusMessage('確認付款結果…');
        const paid = await waitForOrderPaid(oid, {
          timeoutMs: 60000,
          signal,
        });
        if (paid.status === 'aborted') return;
        if (paid.status !== 'paid') {
          onError('付款尚未確認，請稍後再試或至訂單紀錄查看');
          setPhase('ready');
          setStatusMessage(null);
          return;
        }
      }

      setPhase('awaitingLogistics');
      setStatusMessage('物流單建立中，請稍候…');
      const logistics = await waitForLogisticsCreated(oid, vid, {
        timeoutMs: 90000,
        signal,
      });
      if (!logistics.ok) {
        if ('aborted' in logistics && logistics.aborted) return;
        onError(logistics.error);
        setPhase('ready');
        setStatusMessage(null);
        return;
      }
      abortPolls();
      useEcpayCheckoutFlowStore.getState().setPendingPaymentOrderId(null);
      setPhase('done');
      setStatusMessage(null);
      onComplete(oid);
    },
    [abortPolls, beginPoll, onComplete, onError, paymentTotal],
  );

  const { openPayment, stopPolling } = useEcpayCheckoutFlow({
    onPaid: (oid) => {
      const vid = checkoutVendorId ?? '';
      if (!vid) return;
      void finishWithLogistics(oid, vid, {
        requirePayment: true,
        paymentTotal,
      });
    },
    onPendingPayment: (oid) => {
      onComplete(oid);
    },
    onError,
  });

  const createOrder = useCallback(async (): Promise<boolean> => {
    if (!checkoutVendorId || !selectedSummary) {
      onError('請先選擇要結帳的廠商');
      return false;
    }
    const rn = recipientName.trim();
    const rp = recipientPhone.trim();
    const ra = recipientAddressFull.trim();
    if (!rn || !rp) {
      if (recipientDefaultsReady) {
        onError('請填寫收件人姓名與聯絡電話');
      }
      return false;
    }
    if (isHomeDeliveryCode(selectedSummary.selectedShippingMethodCode) && !ra) {
      if (recipientDefaultsReady) {
        onError('請填寫收件地址（宅配）');
      }
      return false;
    }

    setPhase('loading');
    setStatusMessage('建立訂單…');

    const res = await startCheckout({
      checkoutVendorId,
      items: selectedValidLines.map((l) => ({
        variantId: l.variantId,
        qty: l.qty,
      })),
      vendorShippingSelections,
      recipientName: rn,
      recipientPhone: rp,
      recipientAddressFull: ra,
      saveShippingToProfile,
      homeLogisticsSubType: isHomeDeliveryCode(
        selectedSummary.selectedShippingMethodCode,
      )
        ? homeSubType
        : undefined,
    });

    if (!res.ok) {
      onError(res.error);
      setPhase('idle');
      setStatusMessage(null);
      return false;
    }

    setOrderId(res.orderId);
    setPaymentTotal(res.paymentTotal);
    setShippingMethodCode(res.shippingMethodCode);
    useEcpayCheckoutFlowStore.getState().setPendingPaymentOrderId(res.orderId);
    await refreshDraft(res.orderId, res.vendorId);
    setPhase('ready');
    setStatusMessage(null);
    return true;
  }, [
    checkoutVendorId,
    homeSubType,
    onError,
    recipientDefaultsReady,
    recipientAddressFull,
    recipientName,
    recipientPhone,
    refreshDraft,
    saveShippingToProfile,
    selectedSummary,
    selectedValidLines,
    vendorShippingSelections,
  ]);

  const ensureOrder = useCallback(async () => {
    if (orderId) return true;
    if (orderCreatingRef.current) return false;
    orderCreatingRef.current = true;
    try {
      return await createOrder();
    } finally {
      orderCreatingRef.current = false;
    }
  }, [createOrder, orderId]);

  const handleMapReturn = useCallback(
    async (oid: string) => {
      const vid = checkoutVendorId?.trim() ?? '';
      if (!vid) return;

      abortPolls();
      setOrderId(oid);
      useEcpayCheckoutFlowStore.getState().setPendingPaymentOrderId(oid);

      const code = shippingMethodCode ?? selectedSummary?.selectedShippingMethodCode ?? null;

      if (isCvsCodShippingCode(code)) {
        await hydrateOrderFromDb(oid, vid);
        await finishWithLogistics(oid, vid, { requirePayment: false });
        return;
      }

      let draftNow = await refreshDraft(oid, vid);
      if (draftNow?.storeSelected && draftNow.cvsStoreId) {
        setPhase('ready');
        setStatusMessage('門市已選擇，請前往付款');
        return;
      }

      const signal = beginPoll();
      const selected = await waitForStoreSelected(oid, vid, {
        timeoutMs: 15000,
        signal,
      });
      draftNow = await refreshDraft(oid, vid);
      if (selected.ok === false && selected.aborted) {
        return;
      }
      if (!selected.ok || !draftNow?.storeSelected) {
        onError('未取得門市資訊，請重新選擇');
        setPhase('ready');
        setStatusMessage(null);
        return;
      }
      setPhase('ready');
      setStatusMessage('門市已選擇，請前往付款');
    },
    [
      abortPolls,
      beginPoll,
      checkoutVendorId,
      finishWithLogistics,
      hydrateOrderFromDb,
      onError,
      refreshDraft,
      selectedSummary?.selectedShippingMethodCode,
      shippingMethodCode,
    ],
  );

  const openStoreMap = useCallback(async () => {
    const oid = orderId?.trim() ?? '';
    const vid = checkoutVendorId?.trim() ?? '';
    if (!oid || !vid) {
      onError('請先建立訂單');
      return;
    }

    const popup = openEcpayPopup(ECPAY_LOGISTICS_POPUP_NAME);
    if (!popup) {
      onError('請允許彈出視窗以選擇門市');
      return;
    }

    setPhase('selectingStore');
    setStatusMessage('請於彈出視窗選擇取貨門市…');
    showPopupMessage(popup, '載入門市地圖…');

    const bridge = await fetchEcpayLogisticsSelectionPayload({
      orderId: oid,
      vendorId: vid,
    });
    if (!bridge.ok) {
      try {
        popup.close();
      } catch {
        /* ignore */
      }
      onError(bridge.error);
      setPhase('ready');
      setStatusMessage(null);
      return;
    }

    if ('skipMap' in bridge && bridge.skipMap) {
      try {
        popup.close();
      } catch {
        /* ignore */
      }
      setPhase('ready');
      setStatusMessage(null);
      return;
    }

    try {
      submitLogisticsMapBridgeToNamedPopup(
        ECPAY_LOGISTICS_POPUP_NAME,
        bridge as
          | { ok: true; action: string; fields: Record<string, string> }
          | { ok: true; redirectUrl: string },
      );
    } catch (e) {
      try {
        popup.close();
      } catch {
        /* ignore */
      }
      onError(e instanceof Error ? e.message : '無法開啟門市地圖');
      setPhase('ready');
      setStatusMessage(null);
      return;
    }

    let settled = false;
    const settleFromPopup = () => {
      if (settled) return;
      settled = true;
      window.removeEventListener('focus', onWindowFocus);
      clearInterval(pollTimer);
      void handleMapReturn(oid);
    };

    const onWindowFocus = () => {
      if (!popup.closed) return;
      settleFromPopup();
    };

    const pollTimer = setInterval(() => {
      if (popup.closed) {
        settleFromPopup();
      }
    }, 500);

    window.addEventListener('focus', onWindowFocus);
  }, [checkoutVendorId, handleMapReturn, onError, orderId]);

  const confirmHomeAndPay = useCallback(async () => {
    const oid = orderId?.trim() ?? '';
    const vid = checkoutVendorId?.trim() ?? '';
    if (!oid || !vid) {
      onError('請先建立訂單');
      return;
    }

    const upd = await updateCheckoutOrderShipping({
      orderId: oid,
      recipientName: recipientName.trim(),
      recipientPhone: recipientPhone.trim(),
      recipientAddressFull: recipientAddressFull.trim(),
      saveShippingToProfile,
    });
    if (!upd.ok) {
      onError(upd.error);
      return;
    }

    setPhase('confirmingHome');
    setStatusMessage('確認宅配資訊…');

    const mark = await markHomeLogisticsForCheckout({
      orderId: oid,
      vendorId: vid,
      homeLogisticsSubType: homeSubType,
    });
    if (!mark.ok) {
      onError(mark.error);
      setPhase('ready');
      setStatusMessage(null);
      return;
    }

    const nextDraft = await refreshDraft(oid, vid);
    setHomeAddressReady(nextDraft?.completed === true);
    setPhase('ready');

    if (paymentTotal <= 0) {
      await finishWithLogistics(oid, vid, { requirePayment: false });
      return;
    }

    const payable = await assertOrderPayable(oid);
    if (!payable.ok) {
      onError(payable.error);
      return;
    }

    setPhase('paying');
    setStatusMessage('開啟付款視窗…');
    try {
      await openPayment(oid);
    } finally {
      setPhase((prev) => (prev === 'paying' ? 'ready' : prev));
      setStatusMessage((prev) =>
        prev === '開啟付款視窗…' ? null : prev,
      );
    }
  }, [
    checkoutVendorId,
    finishWithLogistics,
    homeSubType,
    onError,
    openPayment,
    orderId,
    paymentTotal,
    recipientAddressFull,
    recipientName,
    recipientPhone,
    refreshDraft,
    saveShippingToProfile,
  ]);

  const goToPayment = useCallback(async () => {
    const oid = orderId?.trim() ?? '';
    const vid = checkoutVendorId?.trim() ?? '';
    if (!oid || !vid) {
      onError('請先建立訂單');
      return;
    }

    if (paymentTotal <= 0) {
      await finishWithLogistics(oid, vid, { requirePayment: false });
      return;
    }

    const payable = await assertOrderPayable(oid);
    if (!payable.ok) {
      onError(payable.error);
      return;
    }

    setPhase('paying');
    setStatusMessage('開啟付款視窗…');
    try {
      await openPayment(oid);
    } finally {
      setPhase((prev) => (prev === 'paying' ? 'ready' : prev));
      setStatusMessage((prev) =>
        prev === '開啟付款視窗…' ? null : prev,
      );
    }
  }, [
    checkoutVendorId,
    finishWithLogistics,
    onError,
    openPayment,
    orderId,
    paymentTotal,
  ]);

  useEffect(() => {
    if (!isPanelOpen) {
      abortPolls();
      stopPolling();
      setPhase('idle');
      setStatusMessage(null);
      setHomeAddressReady(false);
      orderCreatingRef.current = false;
      resumeHandledOrderIdRef.current = null;
      return;
    }
    if (!checkoutVendorId || selectedValidLines.length === 0) return;

    if (resumeOrderId) {
      if (resumeHandledOrderIdRef.current === resumeOrderId) {
        return;
      }
      resumeHandledOrderIdRef.current = resumeOrderId;

      setOrderId(resumeOrderId);
      useEcpayCheckoutFlowStore.getState().setPendingPaymentOrderId(resumeOrderId);
      void (async () => {
        const summary = await fetchOrderCheckoutSummary(resumeOrderId);
        const resolvedPaymentTotal = summary?.paymentTotal ?? paymentTotal;
        if (summary?.paymentTotal != null) {
          setPaymentTotal(summary.paymentTotal);
        }
        if (summary?.shippingMethodCode) {
          setShippingMethodCode(summary.shippingMethodCode);
        }

        const d = await refreshDraft(resumeOrderId, checkoutVendorId);
        if (d?.logisticsCreated) {
          onComplete(resumeOrderId);
          return;
        }

        const signal = beginPoll();
        const paid = await waitForOrderPaid(resumeOrderId, {
          timeoutMs: 60000,
          signal,
        });
        if (paid.status === 'aborted') return;
        if (paid.status === 'paid') {
          await finishWithLogistics(resumeOrderId, checkoutVendorId, {
            requirePayment: true,
            paymentTotal: resolvedPaymentTotal,
          });
          return;
        }
        setPhase('ready');
        setStatusMessage(null);
      })();
      return;
    }

    const pendingOrderId =
      useEcpayCheckoutFlowStore.getState().pendingPaymentOrderId?.trim() ?? '';
    if (!orderId && pendingOrderId) {
      setOrderId(pendingOrderId);
      void hydrateOrderFromDb(pendingOrderId, checkoutVendorId).then(() => {
        setPhase('ready');
      });
      return;
    }

    if (
      !recipientDefaultsReady ||
      !recipientName.trim() ||
      !recipientPhone.trim()
    ) {
      return;
    }

    void ensureOrder();
  }, [
    abortPolls,
    beginPoll,
    checkoutVendorId,
    ensureOrder,
    finishWithLogistics,
    hydrateOrderFromDb,
    isPanelOpen,
    onComplete,
    orderId,
    paymentTotal,
    recipientDefaultsReady,
    recipientName,
    recipientPhone,
    refreshDraft,
    resumeOrderId,
    selectedValidLines.length,
    stopPolling,
  ]);

  useEffect(() => {
    if (!checkoutVendorId) {
      previousCheckoutVendorIdRef.current = null;
      return;
    }

    const previousVendorId = previousCheckoutVendorIdRef.current;
    previousCheckoutVendorIdRef.current = checkoutVendorId;

    if (previousVendorId && previousVendorId !== checkoutVendorId) {
      setOrderId(null);
      setDraft(null);
      setPaymentTotal(0);
      setShippingMethodCode(null);
      setHomeAddressReady(false);
      abortPolls();
      useEcpayCheckoutFlowStore.getState().setPendingPaymentOrderId(null);
    }
  }, [abortPolls, checkoutVendorId]);

  useEffect(() => {
    if (!mapReturnOrderId || !isPanelOpen) return;
    const oid = mapReturnOrderId;
    useEcpayCheckoutFlowStore.setState({ mapReturnOrderId: null });
    void handleMapReturn(oid);
  }, [handleMapReturn, isPanelOpen, mapReturnOrderId]);

  const methodCode =
    shippingMethodCode ?? selectedSummary?.selectedShippingMethodCode ?? null;
  const isCvs = isCvsShippingCode(methodCode);
  const isCod = isCvsCodShippingCode(methodCode);
  const isHome = isHomeDeliveryCode(methodCode);
  const storeReady = Boolean(
    draft?.storeSelected && draft.cvsStoreId && draft.cvsStoreName,
  );
  const canPayCvs = isCvs && !isCod && storeReady;
  const canPayHome = isHome && homeAddressReady && (draft?.completed ?? false);

  return {
    phase,
    statusMessage,
    orderId,
    paymentTotal,
    shippingMethodCode,
    draft,
    homeSubType,
    setHomeSubType,
    homeAddressReady,
    setHomeAddressReady,
    isCvs,
    isCod,
    isHome,
    storeReady,
    canPayCvs,
    canPayHome,
    openStoreMap,
    goToPayment,
    confirmHomeAndPay,
    refreshDraft,
    ensureOrder,
  };
}
