import { useCallback, useMemo, useState } from "react";

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
    onPublished?: (post: CommunityPost) => void;
  }> = {},
): CommunityWriteController {
  const [draft, setDraft] = useState<CommunityPostDraft>(
    options.initialDraft ?? EMPTY_DRAFT,
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const actions = useCommunityActions(service, undefined, options.analytics);
  const validation = useMemo(() => validatePostDraft(draft), [draft]);

  const updateDraft = useCallback(
    (patch: Partial<CommunityPostDraft>): void => {
      setDraft((current) => ({ ...current, ...patch }));
    },
    [],
  );

  const reset = useCallback((): void => {
    setDraft(EMPTY_DRAFT);
    setError(null);
  }, []);

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
      options.onPublished?.(post);
      return post;
    } catch (submitError) {
      setError(redactCommunityError(submitError));
      throw submitError;
    } finally {
      setSubmitting(false);
    }
  }, [actions, draft, options]);

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
