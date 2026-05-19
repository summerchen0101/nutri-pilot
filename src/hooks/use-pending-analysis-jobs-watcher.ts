'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

import {
  isSyncTaskTerminal,
  usePendingAnalysisJobsStore,
} from '@/lib/ai/pending-analysis-jobs-store';
import {
  isTerminalJobStatus,
  watchAnalysisJob,
} from '@/lib/ai/watch-analysis-job';
import {
  showErrorMessage,
  showSuccessMessage,
} from '@/lib/ui/app-message-store';

function isLogRoute(pathname: string): boolean {
  return pathname === '/log' || pathname.startsWith('/log/');
}

function isGuardRoute(pathname: string): boolean {
  return pathname === '/guard';
}

function isDashboardRoute(pathname: string): boolean {
  return pathname === '/dashboard';
}

function isSettingsRoute(pathname: string): boolean {
  return pathname === '/settings' || pathname.startsWith('/settings/');
}

function shouldShowQuickLogToast(pathname: string, spriteSheetOpen: boolean): boolean {
  return !isDashboardRoute(pathname) || !spriteSheetOpen;
}

function shouldShowPersonalContextToast(pathname: string): boolean {
  return !isSettingsRoute(pathname);
}

export function usePendingAnalysisJobsWatcher(): void {
  const pathname = usePathname();
  const photoJobId = usePendingAnalysisJobsStore((s) => s.photo?.jobId);
  const photoStatus = usePendingAnalysisJobsStore((s) => s.photo?.status ?? '');
  const guardJobId = usePendingAnalysisJobsStore((s) => s.guard?.jobId);
  const guardStatus = usePendingAnalysisJobsStore((s) => s.guard?.status ?? '');
  const quickLogStatus = usePendingAnalysisJobsStore((s) => s.quickLog?.status);
  const quickLogRequestId = usePendingAnalysisJobsStore(
    (s) => s.quickLog?.requestId,
  );
  const personalContextStatus = usePendingAnalysisJobsStore(
    (s) => s.personalContext?.status,
  );
  const personalContextRequestId = usePendingAnalysisJobsStore(
    (s) => s.personalContext?.requestId,
  );
  const spriteSheetOpen = usePendingAnalysisJobsStore((s) => s.spriteSheetOpen);

  const patchPhotoFromRow = usePendingAnalysisJobsStore((s) => s.patchPhotoFromRow);
  const patchGuardFromRow = usePendingAnalysisJobsStore((s) => s.patchGuardFromRow);
  const setPhotoTimeoutError = usePendingAnalysisJobsStore((s) => s.setPhotoTimeoutError);
  const setGuardTimeoutError = usePendingAnalysisJobsStore((s) => s.setGuardTimeoutError);

  const photoToastKeyRef = useRef<string | null>(null);
  const guardToastKeyRef = useRef<string | null>(null);
  const quickLogToastKeyRef = useRef<string | null>(null);
  const personalContextToastKeyRef = useRef<string | null>(null);

  useEffect(() => {
    photoToastKeyRef.current = null;
  }, [photoJobId]);

  useEffect(() => {
    guardToastKeyRef.current = null;
  }, [guardJobId]);

  useEffect(() => {
    quickLogToastKeyRef.current = null;
  }, [quickLogRequestId]);

  useEffect(() => {
    personalContextToastKeyRef.current = null;
  }, [personalContextRequestId]);

  useEffect(() => {
    if (!quickLogStatus || !isSyncTaskTerminal(quickLogStatus)) return;

    const toastKey = `quickLog:${quickLogRequestId}:${quickLogStatus}`;
    if (quickLogToastKeyRef.current === toastKey) return;
    quickLogToastKeyRef.current = toastKey;

    if (!shouldShowQuickLogToast(pathname, spriteSheetOpen)) return;

    if (quickLogStatus === 'ready') {
      const result = usePendingAnalysisJobsStore.getState().quickLog?.result;
      if (result?.entries.length) {
        showSuccessMessage(
          '快速紀錄解析完成，回到總覽開啟 AI 精靈可預覽並寫入。',
          'AI 精靈',
        );
      } else {
        showErrorMessage('無法解析紀錄內容，請回到總覽重試。', 'AI 精靈');
      }
      return;
    }

    const err =
      usePendingAnalysisJobsStore.getState().quickLog?.error ??
      '解析失敗，請稍後再試';
    showErrorMessage(err, 'AI 精靈');
  }, [quickLogStatus, quickLogRequestId, pathname, spriteSheetOpen]);

  useEffect(() => {
    if (!personalContextStatus || !isSyncTaskTerminal(personalContextStatus)) {
      return;
    }

    const toastKey = `personalContext:${personalContextRequestId}:${personalContextStatus}`;
    if (personalContextToastKeyRef.current === toastKey) return;
    personalContextToastKeyRef.current = toastKey;

    if (!shouldShowPersonalContextToast(pathname)) return;

    if (personalContextStatus === 'ready') {
      const preview =
        usePendingAnalysisJobsStore.getState().personalContext?.preview;
      if (preview) {
        showSuccessMessage(
          '飲食脈絡已整理完成，回到設定可預覽並套用。',
          '健康脈絡',
        );
      } else {
        showErrorMessage('無法解析整理結果，請回到設定重試。', '健康脈絡');
      }
      return;
    }

    const err =
      usePendingAnalysisJobsStore.getState().personalContext?.error ??
      '整理失敗';
    showErrorMessage(err, '健康脈絡');
  }, [personalContextStatus, personalContextRequestId, pathname]);

  useEffect(() => {
    if (!photoJobId || isTerminalJobStatus(photoStatus)) return;

    return watchAnalysisJob({
      table: 'photo_analysis_jobs',
      jobId: photoJobId,
      channelPrefix: 'photo-job',
      onRow: (row) => {
        patchPhotoFromRow(row);
        const st = row.status ?? '';
        if (!isTerminalJobStatus(st)) return;

        const toastKey = `${photoJobId}:${st}`;
        if (photoToastKeyRef.current === toastKey) return;
        photoToastKeyRef.current = toastKey;

        if (isLogRoute(pathname)) return;

        if (st === 'ready') {
          const result = usePendingAnalysisJobsStore.getState().photo?.result;
          if (result) {
            showSuccessMessage('拍照辨識完成，回到紀錄頁可確認並加入餐次。', '飲食辨識');
          } else {
            showErrorMessage('無法解析辨識結果，請回到紀錄頁重試。', '飲食辨識');
          }
          return;
        }

        const err =
          usePendingAnalysisJobsStore.getState().photo?.error ?? '辨識失敗';
        showErrorMessage(err, '飲食辨識');
      },
      onTimeout: () => {
        setPhotoTimeoutError();
        if (isLogRoute(pathname)) return;
        const toastKey = `${photoJobId}:timeout`;
        if (photoToastKeyRef.current === toastKey) return;
        photoToastKeyRef.current = toastKey;
        showErrorMessage('分析逾時，請回到紀錄頁重試。', '飲食辨識');
      },
    });
  }, [
    photoJobId,
    photoStatus,
    pathname,
    patchPhotoFromRow,
    setPhotoTimeoutError,
  ]);

  useEffect(() => {
    if (!guardJobId || isTerminalJobStatus(guardStatus)) return;

    return watchAnalysisJob({
      table: 'label_guard_jobs',
      jobId: guardJobId,
      channelPrefix: 'label-guard-job',
      onRow: (row) => {
        patchGuardFromRow(row);
        const st = row.status ?? '';
        if (!isTerminalJobStatus(st)) return;

        const toastKey = `${guardJobId}:${st}`;
        if (guardToastKeyRef.current === toastKey) return;
        guardToastKeyRef.current = toastKey;

        if (isGuardRoute(pathname)) return;

        if (st === 'ready') {
          const report = usePendingAnalysisJobsStore.getState().guard?.report;
          if (report) {
            showSuccessMessage('標示分析完成，回到守衛頁可查看完整報告。', '食品安全守衛');
          } else {
            showErrorMessage('無法解析分析結果，請回到守衛頁重試。', '食品安全守衛');
          }
          return;
        }

        const err =
          usePendingAnalysisJobsStore.getState().guard?.error ?? '分析失敗';
        showErrorMessage(err, '食品安全守衛');
      },
      onTimeout: () => {
        setGuardTimeoutError();
        if (isGuardRoute(pathname)) return;
        const toastKey = `${guardJobId}:timeout`;
        if (guardToastKeyRef.current === toastKey) return;
        guardToastKeyRef.current = toastKey;
        showErrorMessage('分析逾時，請回到守衛頁重試。', '食品安全守衛');
      },
    });
  }, [
    guardJobId,
    guardStatus,
    pathname,
    patchGuardFromRow,
    setGuardTimeoutError,
  ]);
}
