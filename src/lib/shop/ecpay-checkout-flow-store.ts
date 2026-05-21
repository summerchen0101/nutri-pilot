'use client';

import { create } from 'zustand';

import { setEcpayPaymentSessionOrderId } from '@/lib/shop/ecpay-payment-session';

export type EcpayCheckoutPhase =
  | 'idle'
  | 'logistics'
  | 'paymentReady'
  | 'payment'
  | 'polling';

interface EcpayCheckoutFlowState {
  phase: EcpayCheckoutPhase;
  statusMessage: string | null;
  pendingPaymentOrderId: string | null;
  /** 地圖 popup 回傳後通知結帳側欄刷新 */
  mapReturnOrderId: string | null;
  enterPaymentReady: (orderId: string) => void;
  signalMapReturn: (orderId: string) => void;
  setPhase: (phase: EcpayCheckoutPhase) => void;
  setStatusMessage: (message: string | null) => void;
  setPendingPaymentOrderId: (orderId: string | null) => void;
  resetFlow: () => void;
}

export const useEcpayCheckoutFlowStore = create<EcpayCheckoutFlowState>((set) => ({
  phase: 'idle',
  statusMessage: null,
  pendingPaymentOrderId: null,
  mapReturnOrderId: null,
  signalMapReturn: (orderId) =>
    set({ mapReturnOrderId: orderId, pendingPaymentOrderId: orderId }),
  enterPaymentReady: (orderId) => {
    setEcpayPaymentSessionOrderId(orderId);
    set({
      pendingPaymentOrderId: orderId,
      phase: 'paymentReady',
      statusMessage: '物流已設定，請點擊下方前往付款',
    });
  },
  setPhase: (phase) => set({ phase }),
  setStatusMessage: (statusMessage) => set({ statusMessage }),
  setPendingPaymentOrderId: (pendingPaymentOrderId) =>
    set({ pendingPaymentOrderId }),
  resetFlow: () =>
    set({
      phase: 'idle',
      statusMessage: null,
      pendingPaymentOrderId: null,
      mapReturnOrderId: null,
    }),
}));
