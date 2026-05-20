'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { parsePhotoJobResult } from '@/lib/food/parse-photo-job-result';
import {
  parseLabelGuardReportJson,
  type LabelGuardReport,
} from '@/lib/food/label-guard-report';
import type { ManualFoodAnalysisResult } from '@/lib/food/manual-food-analysis-result';
import type { PersonalContextFacets } from '@/lib/personal-context/types';
import type { ClaudeImageMediaType } from '@/lib/ai/image-file-to-claude-payload';
import type { QuickLogValidatedEntry } from '@/lib/quick-log/types';
import { createClient } from '@/lib/supabase/client';
import type { Json } from '@/types/supabase';

import {
  createSignedStoragePreviewUrl,
  type AnalysisPhotoBucket,
} from './signed-storage-preview-url';
import type { AnalysisJobRow } from './watch-analysis-job';

export type LogMealTab = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type SyncAiTaskStatus = 'idle' | 'pending' | 'ready' | 'error';

export type QuickLogInterpretResult = {
  summaryZh: string | null;
  entries: QuickLogValidatedEntry[];
};

export type QuickLogPending = {
  status: SyncAiTaskStatus;
  message: string;
  referenceDateIso: string;
  waterMlKnownToday: number | null;
  result: QuickLogInterpretResult | null;
  error: string | null;
  requestId: number;
};

export type PersonalContextPending = {
  status: SyncAiTaskStatus;
  draft: string;
  preview: PersonalContextFacets | null;
  error: string | null;
  requestId: number;
};

export function isSyncTaskTerminal(status: SyncAiTaskStatus): boolean {
  return status === 'ready' || status === 'error';
}

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

type PersistedQuickLog = Omit<QuickLogPending, 'status'> & {
  status: 'pending' | 'ready' | 'error';
};

type PersistedPersonalContext = Omit<PersonalContextPending, 'status'> & {
  status: 'pending' | 'ready' | 'error';
};

type PendingAnalysisJobsState = {
  photo: PhotoPendingJob | null;
  guard: GuardPendingJob | null;
  quickLog: QuickLogPending | null;
  personalContext: PersonalContextPending | null;
  spriteSheetOpen: boolean;
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
  setSpriteSheetOpen: (open: boolean) => void;
  setQuickLogMessage: (message: string) => void;
  startQuickLogInterpret: (opts: {
    message: string;
    referenceDateIso: string;
    waterMlKnownToday?: number | null;
    imageBase64?: string;
    imageMediaType?: ClaudeImageMediaType;
  }) => void;
  clearQuickLog: () => void;
  setQuickLogPreviewResult: (result: QuickLogInterpretResult) => void;
  startQuickLogRevise: (opts: {
    revisionInstruction: string;
    referenceDateIso: string;
    currentEntries: QuickLogValidatedEntry[];
    waterMlKnownToday?: number | null;
  }) => void;
  setPersonalContextDraft: (draft: string) => void;
  startPersonalContextAnalyze: (draft: string) => void;
  setPersonalContextPreview: (preview: PersonalContextFacets) => void;
  clearPersonalContextTask: () => void;
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
      quickLog: null,
      personalContext: null,
      spriteSheetOpen: false,

      setSpriteSheetOpen: (open) => {
        set({ spriteSheetOpen: open });
      },

      setQuickLogMessage: (message) => {
        const ql = get().quickLog;
        if (!ql) return;
        set({ quickLog: { ...ql, message } });
      },

      startQuickLogInterpret: (opts) => {
        const requestId = (get().quickLog?.requestId ?? 0) + 1;
        const message = opts.message.trim();
        set({
          quickLog: {
            status: 'pending',
            message,
            referenceDateIso: opts.referenceDateIso,
            waterMlKnownToday: opts.waterMlKnownToday ?? null,
            result: null,
            error: null,
            requestId,
          },
        });

        void (async () => {
          try {
            const res = await fetch('/api/ai/quick-log', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                message,
                referenceDateIso: opts.referenceDateIso,
                ...(opts.waterMlKnownToday != null ?
                  { waterMlKnownToday: opts.waterMlKnownToday }
                : {}),
                ...(opts.imageBase64 ?
                  {
                    imageBase64: opts.imageBase64,
                    imageMediaType: opts.imageMediaType ?? 'image/jpeg',
                  }
                : {}),
              }),
            });

            const dataUnknown: unknown = await res.json().catch(() => null);
            const data =
              dataUnknown && typeof dataUnknown === 'object' ?
                (dataUnknown as Record<string, unknown>)
              : {};

            if (get().quickLog?.requestId !== requestId) return;

            if (!res.ok) {
              const msg =
                typeof data.error === 'string' ?
                  data.error
                : '解析失敗，請稍後再試';
              set({
                quickLog: {
                  ...get().quickLog!,
                  status: 'error',
                  error: msg,
                  result: null,
                },
              });
              return;
            }

            const summaryRaw = data.summaryZh;
            const summaryZh =
              typeof summaryRaw === 'string' && summaryRaw.trim() ?
                summaryRaw.trim().slice(0, 500)
              : null;

            const entries = data.entries;
            if (!Array.isArray(entries)) {
              set({
                quickLog: {
                  ...get().quickLog!,
                  status: 'error',
                  error: '回傳格式異常',
                  result: null,
                },
              });
              return;
            }

            set({
              quickLog: {
                ...get().quickLog!,
                status: 'ready',
                error: null,
                result: {
                  summaryZh,
                  entries: entries as QuickLogValidatedEntry[],
                },
              },
            });
          } catch {
            if (get().quickLog?.requestId !== requestId) return;
            set({
              quickLog: {
                ...get().quickLog!,
                status: 'error',
                error: '網路錯誤，請稍後再試',
                result: null,
              },
            });
          }
        })();
      },

      clearQuickLog: () => {
        set({ quickLog: null });
      },

      setQuickLogPreviewResult: (result) => {
        const ql = get().quickLog;
        if (!ql || ql.status !== 'ready') return;
        set({
          quickLog: {
            ...ql,
            result,
            error: null,
          },
        });
      },

      startQuickLogRevise: (opts) => {
        const ql = get().quickLog;
        if (!ql || ql.status !== 'ready' || !ql.result) return;

        const requestId = ql.requestId + 1;
        const revisionInstruction = opts.revisionInstruction.trim();

        set({
          quickLog: {
            ...ql,
            status: 'pending',
            error: null,
            requestId,
          },
        });

        void (async () => {
          try {
            const res = await fetch('/api/ai/quick-log', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                referenceDateIso: opts.referenceDateIso,
                revisionInstruction,
                currentEntries: opts.currentEntries,
                ...(opts.waterMlKnownToday != null ?
                  { waterMlKnownToday: opts.waterMlKnownToday }
                : {}),
              }),
            });

            const dataUnknown: unknown = await res.json().catch(() => null);
            const data =
              dataUnknown && typeof dataUnknown === 'object' ?
                (dataUnknown as Record<string, unknown>)
              : {};

            if (get().quickLog?.requestId !== requestId) return;

            if (!res.ok) {
              const msg =
                typeof data.error === 'string' ?
                  data.error
                : '修正失敗，請稍後再試';
              set({
                quickLog: {
                  ...get().quickLog!,
                  status: 'error',
                  error: msg,
                },
              });
              return;
            }

            const summaryRaw = data.summaryZh;
            const summaryZh =
              typeof summaryRaw === 'string' && summaryRaw.trim() ?
                summaryRaw.trim().slice(0, 500)
              : null;

            const entries = data.entries;
            if (!Array.isArray(entries)) {
              set({
                quickLog: {
                  ...get().quickLog!,
                  status: 'error',
                  error: '回傳格式異常',
                },
              });
              return;
            }

            set({
              quickLog: {
                ...get().quickLog!,
                status: 'ready',
                error: null,
                result: {
                  summaryZh,
                  entries: entries as QuickLogValidatedEntry[],
                },
              },
            });
          } catch {
            if (get().quickLog?.requestId !== requestId) return;
            set({
              quickLog: {
                ...get().quickLog!,
                status: 'error',
                error: '網路錯誤，請稍後再試',
              },
            });
          }
        })();
      },

      setPersonalContextDraft: (draft) => {
        const pc = get().personalContext;
        if (pc) {
          set({ personalContext: { ...pc, draft } });
          return;
        }
        set({
          personalContext: {
            status: 'idle',
            draft,
            preview: null,
            error: null,
            requestId: 0,
          },
        });
      },

      startPersonalContextAnalyze: (draft) => {
        const trimmed = draft.trim();
        const requestId = (get().personalContext?.requestId ?? 0) + 1;
        set({
          personalContext: {
            status: 'pending',
            draft: trimmed,
            preview: null,
            error: null,
            requestId,
          },
        });

        void (async () => {
          try {
            const res = await fetch('/api/ai/personal-context/analyze', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: trimmed }),
            });
            const data = (await res.json()) as {
              error?: string;
              facets?: PersonalContextFacets;
            };

            if (get().personalContext?.requestId !== requestId) return;

            if (!res.ok) {
              set({
                personalContext: {
                  ...get().personalContext!,
                  status: 'error',
                  error: data.error ?? '整理失敗',
                  preview: null,
                },
              });
              return;
            }

            if (!data.facets) {
              set({
                personalContext: {
                  ...get().personalContext!,
                  status: 'error',
                  error: '回傳資料異常',
                  preview: null,
                },
              });
              return;
            }

            set({
              personalContext: {
                ...get().personalContext!,
                status: 'ready',
                error: null,
                preview: data.facets,
              },
            });
          } catch {
            if (get().personalContext?.requestId !== requestId) return;
            set({
              personalContext: {
                ...get().personalContext!,
                status: 'error',
                error: '網路錯誤，請稍後再試',
                preview: null,
              },
            });
          }
        })();
      },

      setPersonalContextPreview: (preview) => {
        const pc = get().personalContext;
        if (!pc) return;
        set({ personalContext: { ...pc, preview } });
      },

      clearPersonalContextTask: () => {
        set({ personalContext: null });
      },

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
        quickLog:
          state.quickLog &&
          (state.quickLog.status === 'pending' || state.quickLog.status === 'ready')
            ? ({
                status: state.quickLog.status,
                message: state.quickLog.message,
                referenceDateIso: state.quickLog.referenceDateIso,
                waterMlKnownToday: state.quickLog.waterMlKnownToday,
                result: state.quickLog.result,
                error: state.quickLog.error,
                requestId: state.quickLog.requestId,
              } satisfies PersistedQuickLog)
            : null,
        personalContext:
          state.personalContext &&
          (state.personalContext.status === 'pending' ||
            state.personalContext.status === 'ready')
            ? ({
                status: state.personalContext.status,
                draft: state.personalContext.draft,
                preview: state.personalContext.preview,
                error: state.personalContext.error,
                requestId: state.personalContext.requestId,
              } satisfies PersistedPersonalContext)
            : null,
      }),
      merge: (persisted, current) => {
        const p = persisted as {
          photo?: PersistedPhoto | null;
          guard?: PersistedGuard | null;
          quickLog?: PersistedQuickLog | null;
          personalContext?: PersistedPersonalContext | null;
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
          quickLog: p.quickLog ?? null,
          personalContext: p.personalContext ?? null,
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
