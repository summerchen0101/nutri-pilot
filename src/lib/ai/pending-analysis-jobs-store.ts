'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { parsePhotoJobResult } from '@/lib/food/parse-photo-job-result';
import {
  parseLabelGuardReportJson,
  type LabelGuardReport,
} from '@/lib/food/label-guard-report';
import type { ManualFoodAnalysisResult } from '@/lib/food/manual-food-analysis-result';
import { createClient } from '@/lib/supabase/client';
import type { Json } from '@/types/supabase';

import {
  createSignedStoragePreviewUrl,
  type AnalysisPhotoBucket,
} from './signed-storage-preview-url';
import type { AnalysisJobRow } from './watch-analysis-job';

export type LogMealTab = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type PhotoPendingJob = {
  jobId: string;
  storagePath: string;
  status: string;
  previewUrl: string | null;
  previewIsBlob: boolean;
  result: ManualFoodAnalysisResult | null;
  error: string | null;
  hint: string | null;
  context: { date: string; mealTab: LogMealTab };
};

export type GuardPendingJob = {
  jobId: string;
  storagePath: string;
  status: string;
  previewUrl: string | null;
  previewIsBlob: boolean;
  report: LabelGuardReport | null;
  error: string | null;
  hint: string | null;
};

type PersistedPhoto = Pick<
  PhotoPendingJob,
  'jobId' | 'storagePath' | 'status' | 'hint' | 'context'
>;

type PersistedGuard = Pick<
  GuardPendingJob,
  'jobId' | 'storagePath' | 'status' | 'hint'
>;

type PendingAnalysisJobsState = {
  photo: PhotoPendingJob | null;
  guard: GuardPendingJob | null;
  startPhotoJob: (params: {
    jobId: string;
    storagePath: string;
    previewUrl: string | null;
    previewIsBlob: boolean;
    hint?: string | null;
    context: { date: string; mealTab: LogMealTab };
    initialStatus?: string;
  }) => void;
  startGuardJob: (params: {
    jobId: string;
    storagePath: string;
    previewUrl: string | null;
    previewIsBlob: boolean;
    hint?: string | null;
    initialStatus?: string;
  }) => void;
  patchPhotoFromRow: (row: AnalysisJobRow) => void;
  patchGuardFromRow: (row: AnalysisJobRow) => void;
  setPhotoPreviewUrl: (url: string | null, isBlob: boolean) => void;
  setGuardPreviewUrl: (url: string | null, isBlob: boolean) => void;
  setPhotoTimeoutError: () => void;
  setGuardTimeoutError: () => void;
  setPhotoStagingResult: (params: {
    result: ManualFoodAnalysisResult;
    hint?: string | null;
    context: { date: string; mealTab: LogMealTab };
  }) => void;
  clearPhoto: () => void;
  clearGuard: () => void;
  hydrateFromDb: () => Promise<void>;
};

function revokeBlobPreview(job: { previewUrl: string | null; previewIsBlob: boolean }) {
  if (job.previewIsBlob && job.previewUrl?.startsWith('blob:')) {
    URL.revokeObjectURL(job.previewUrl);
  }
}

async function ensureSignedPreview(
  bucket: AnalysisPhotoBucket,
  storagePath: string,
  setPreview: (url: string | null, isBlob: boolean) => void,
) {
  const url = await createSignedStoragePreviewUrl(bucket, storagePath);
  if (url) setPreview(url, false);
}

export const usePendingAnalysisJobsStore = create<PendingAnalysisJobsState>()(
  persist(
    (set, get) => ({
      photo: null,
      guard: null,

      startPhotoJob: ({
        jobId,
        storagePath,
        previewUrl,
        previewIsBlob,
        hint = null,
        context,
        initialStatus = 'pending',
      }) => {
        const prev = get().photo;
        if (prev) revokeBlobPreview(prev);

        set({
          photo: {
            jobId,
            storagePath,
            status: initialStatus,
            previewUrl,
            previewIsBlob,
            result: null,
            error: null,
            hint,
            context,
          },
        });
      },

      startGuardJob: ({
        jobId,
        storagePath,
        previewUrl,
        previewIsBlob,
        hint = null,
        initialStatus = 'pending',
      }) => {
        const prev = get().guard;
        if (prev) revokeBlobPreview(prev);

        set({
          guard: {
            jobId,
            storagePath,
            status: initialStatus,
            previewUrl,
            previewIsBlob,
            report: null,
            error: null,
            hint,
          },
        });
      },

      patchPhotoFromRow: (row) => {
        const photo = get().photo;
        if (!photo) return;

        const st = row.status ?? '';
        if (st === 'ready') {
          const one = parsePhotoJobResult((row.result_json ?? null) as Json | null);
          set({
            photo: {
              ...photo,
              status: st,
              result: one,
              error: one ? null : '無法解析辨識結果',
            },
          });
          return;
        }
        if (st === 'error') {
          set({
            photo: {
              ...photo,
              status: st,
              error: row.error_message ?? '辨識失敗',
              result: null,
            },
          });
          return;
        }
        set({ photo: { ...photo, status: st } });
      },

      patchGuardFromRow: (row) => {
        const guard = get().guard;
        if (!guard) return;

        const st = row.status ?? '';
        if (st === 'ready') {
          const parsed = parseLabelGuardReportJson(
            (row.result_json ?? null) as Json | null,
          );
          set({
            guard: {
              ...guard,
              status: st,
              report: parsed,
              error: parsed ? null : '無法解析分析結果',
            },
          });
          return;
        }
        if (st === 'error') {
          set({
            guard: {
              ...guard,
              status: st,
              error: row.error_message ?? '分析失敗',
              report: null,
            },
          });
          return;
        }
        set({ guard: { ...guard, status: st } });
      },

      setPhotoPreviewUrl: (url, isBlob) => {
        const photo = get().photo;
        if (!photo) return;
        if (photo.previewIsBlob && photo.previewUrl?.startsWith('blob:')) {
          URL.revokeObjectURL(photo.previewUrl);
        }
        set({ photo: { ...photo, previewUrl: url, previewIsBlob: isBlob } });
      },

      setGuardPreviewUrl: (url, isBlob) => {
        const guard = get().guard;
        if (!guard) return;
        if (guard.previewIsBlob && guard.previewUrl?.startsWith('blob:')) {
          URL.revokeObjectURL(guard.previewUrl);
        }
        set({ guard: { ...guard, previewUrl: url, previewIsBlob: isBlob } });
      },

      setPhotoTimeoutError: () => {
        const photo = get().photo;
        if (!photo) return;
        set({
          photo: {
            ...photo,
            status: 'error',
            error: '分析逾時，請重試',
            result: null,
          },
        });
      },

      setGuardTimeoutError: () => {
        const guard = get().guard;
        if (!guard) return;
        set({
          guard: {
            ...guard,
            status: 'error',
            error: '分析逾時，請重試',
            report: null,
          },
        });
      },

      setPhotoStagingResult: ({ result, hint = null, context }) => {
        const prev = get().photo;
        if (prev) revokeBlobPreview(prev);
        set({
          photo: {
            jobId: '',
            storagePath: '',
            status: 'ready',
            previewUrl: null,
            previewIsBlob: false,
            result,
            error: null,
            hint,
            context,
          },
        });
      },

      clearPhoto: () => {
        const photo = get().photo;
        if (photo) revokeBlobPreview(photo);
        set({ photo: null });
      },

      clearGuard: () => {
        const guard = get().guard;
        if (guard) revokeBlobPreview(guard);
        set({ guard: null });
      },

      hydrateFromDb: async () => {
        const { photo, guard } = get();
        const supabase = createClient();

        if (photo?.jobId) {
          const { data: row } = await supabase
            .from('photo_analysis_jobs')
            .select('status,result_json,error_message')
            .eq('id', photo.jobId)
            .maybeSingle();
          if (row) get().patchPhotoFromRow(row as AnalysisJobRow);
          if (!get().photo?.previewUrl && photo.storagePath) {
            void ensureSignedPreview('food-photos', photo.storagePath, (url, isBlob) => {
              get().setPhotoPreviewUrl(url, isBlob);
            });
          }
        }

        if (guard?.jobId) {
          const { data: row } = await supabase
            .from('label_guard_jobs')
            .select('status,result_json,error_message')
            .eq('id', guard.jobId)
            .maybeSingle();
          if (row) get().patchGuardFromRow(row as AnalysisJobRow);
          if (!get().guard?.previewUrl && guard.storagePath) {
            void ensureSignedPreview(
              'label-guard-photos',
              guard.storagePath,
              (url, isBlob) => {
                get().setGuardPreviewUrl(url, isBlob);
              },
            );
          }
        }
      },
    }),
    {
      name: 'nutri-pilot-pending-analysis-jobs',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        photo: state.photo
          ? ({
              jobId: state.photo.jobId,
              storagePath: state.photo.storagePath,
              status: state.photo.status,
              hint: state.photo.hint,
              context: state.photo.context,
            } satisfies PersistedPhoto)
          : null,
        guard: state.guard
          ? ({
              jobId: state.guard.jobId,
              storagePath: state.guard.storagePath,
              status: state.guard.status,
              hint: state.guard.hint,
            } satisfies PersistedGuard)
          : null,
      }),
      merge: (persisted, current) => {
        const p = persisted as {
          photo?: PersistedPhoto | null;
          guard?: PersistedGuard | null;
        } | null;
        if (!p) return current;

        return {
          ...current,
          photo: p.photo
            ? {
                ...p.photo,
                previewUrl: null,
                previewIsBlob: false,
                result: null,
                error: null,
              }
            : null,
          guard: p.guard
            ? {
                ...p.guard,
                previewUrl: null,
                previewIsBlob: false,
                report: null,
                error: null,
              }
            : null,
        };
      },
      onRehydrateStorage: () => (state) => {
        if (state?.photo || state?.guard) {
          void state.hydrateFromDb();
        }
      },
    },
  ),
);
