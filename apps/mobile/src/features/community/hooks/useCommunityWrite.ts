import { useCallback, useEffect, useMemo, useState } from "react";

import type { CommunityAnalytics } from "../community.analytics";
import type {
  CommunityPost,
  CommunityPostDraft,
  CommunityService,
  CommunityValidationResult,
} from "../community.types";
import { redactCommunityError } from "../community.redaction";
import { validatePostDraft } from "../community.validators";
import { useCommunityActions } from "./useCommunityActions";

const EMPTY_DRAFT: CommunityPostDraft = Object.freeze({
  boardType: "FREE",
  title: "",
  content: "",
  tags: [],
  anonymous: true,
});

export type CommunityDraftStore = Readonly<{
  loadDraft: () => Promise<CommunityPostDraft | null>;
  saveDraft: (draft: CommunityPostDraft) => Promise<void>;
  clearDraft: () => Promise<void>;
}>;

export type CommunityWriteController = Readonly<{
  draft: CommunityPostDraft;
  validation: CommunityValidationResult;
  submitting: boolean;
  error: string | null;
  setDraft: (draft: CommunityPostDraft) => void;
  updateDraft: (patch: Partial<CommunityPostDraft>) => void;
  reset: () => void;
  submit: () => Promise<CommunityPost>;
}>;

export function useCommunityWrite(
  service: CommunityService,
  options: Readonly<{
    initialDraft?: CommunityPostDraft;
    analytics?: CommunityAnalytics;
    draftStore?: CommunityDraftStore;
    onPublished?: (post: CommunityPost) => void;
  }> = {},
): CommunityWriteController {
  const { analytics, draftStore, initialDraft, onPublished } = options;
  const [draft, setDraftState] = useState<CommunityPostDraft>(
    initialDraft ?? EMPTY_DRAFT,
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const actions = useCommunityActions(service, undefined, analytics);
  const validation = useMemo(() => validatePostDraft(draft), [draft]);

  useEffect(() => {
    if (initialDraft || !draftStore) return undefined;
    let active = true;
    void draftStore
      .loadDraft()
      .then((storedDraft) => {
        if (active && storedDraft) setDraftState(storedDraft);
      })
      .catch((loadError) => {
        if (active) setError(redactCommunityError(loadError));
      });
    return () => {
      active = false;
    };
  }, [draftStore, initialDraft]);

  const persistDraft = useCallback(
    (nextDraft: CommunityPostDraft): void => {
      void draftStore?.saveDraft(nextDraft).catch((saveError) => {
        setError(redactCommunityError(saveError));
      });
    },
    [draftStore],
  );

  const setDraft = useCallback(
    (nextDraft: CommunityPostDraft): void => {
      setDraftState(nextDraft);
      persistDraft(nextDraft);
    },
    [persistDraft],
  );

  const updateDraft = useCallback(
    (patch: Partial<CommunityPostDraft>): void => {
      setDraftState((current) => {
        const nextDraft = { ...current, ...patch };
        persistDraft(nextDraft);
        return nextDraft;
      });
    },
    [persistDraft],
  );

  const reset = useCallback((): void => {
    setDraftState(EMPTY_DRAFT);
    setError(null);
    void draftStore?.clearDraft().catch((clearError) => {
      setError(redactCommunityError(clearError));
    });
  }, [draftStore]);

  const submit = useCallback(async (): Promise<CommunityPost> => {
    const latestValidation = validatePostDraft(draft);
    if (
      !latestValidation.valid ||
      latestValidation.moderationStatus === "BLOCKED"
    ) {
      throw new TypeError(
        latestValidation.issues[0]?.message ?? "게시글 내용을 확인해 주세요.",
      );
    }

    setSubmitting(true);
    setError(null);
    try {
      const post = await actions.publishPost(draft);
      await draftStore?.clearDraft();
      onPublished?.(post);
      return post;
    } catch (submitError) {
      setError(redactCommunityError(submitError));
      throw submitError;
    } finally {
      setSubmitting(false);
    }
  }, [actions, draft, draftStore, onPublished]);

  return {
    draft,
    validation,
    submitting,
    error,
    setDraft,
    updateDraft,
    reset,
    submit,
  };
}
