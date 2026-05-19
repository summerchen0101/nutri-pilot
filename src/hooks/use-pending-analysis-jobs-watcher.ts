'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { usePendingAnalysisJobsStore } from '@/lib/ai/pending-analysis-jobs-store';
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

export function usePendingAnalysisJobsWatcher(): void {
  const pathname = usePathname();
  const photoJobId = usePendingAnalysisJobsStore((s) => s.photo?.jobId);
  const photoStatus = usePendingAnalysisJobsStore((s) => s.photo?.status ?? '');
  const guardJobId = usePendingAnalysisJobsStore((s) => s.guard?.jobId);
  const guardStatus = usePendingAnalysisJobsStore((s) => s.guard?.status ?? '');

  const patchPhotoFromRow = usePendingAnalysisJobsStore((s) => s.patchPhotoFromRow);
  const patchGuardFromRow = usePendingAnalysisJobsStore((s) => s.patchGuardFromRow);
  const setPhotoTimeoutError = usePendingAnalysisJobsStore((s) => s.setPhotoTimeoutError);
  const setGuardTimeoutError = usePendingAnalysisJobsStore((s) => s.setGuardTimeoutError);

  const photoToastKeyRef = useRef<string | null>(null);
  const guardToastKeyRef = useRef<string | null>(null);

  useEffect(() => {
    photoToastKeyRef.current = null;
  }, [photoJobId]);

  useEffect(() => {
    guardToastKeyRef.current = null;
  }, [guardJobId]);

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
