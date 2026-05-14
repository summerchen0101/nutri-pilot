'use client';

import { create } from 'zustand';

export type AppMessageVariant = 'success' | 'error' | 'info';

type AppMessageState = {
  isOpen: boolean;
  title: string | null;
  message: string;
  variant: AppMessageVariant;
  showAppMessage: (params: {
    message: string;
    title?: string | null;
    variant?: AppMessageVariant;
  }) => void;
  hideAppMessage: () => void;
};

export const useAppMessageStore = create<AppMessageState>((set) => ({
  isOpen: false,
  title: null,
  message: '',
  variant: 'info',
  showAppMessage: ({ message, title = null, variant = 'info' }) =>
    set({
      isOpen: true,
      message,
      title: title ?? null,
      variant,
    }),
  hideAppMessage: () =>
    set({
      isOpen: false,
      title: null,
      message: '',
      variant: 'info',
    }),
}));

export function showSuccessMessage(message: string, title?: string | null) {
  useAppMessageStore.getState().showAppMessage({
    message,
    title,
    variant: 'success',
  });
}

export function showErrorMessage(message: string, title?: string | null) {
  useAppMessageStore.getState().showAppMessage({
    message,
    title,
    variant: 'error',
  });
}
