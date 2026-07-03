import { act, renderHook, waitFor } from "@testing-library/react-native";

import type {
  CommunityApiResponse,
  CommunityPostDraft,
  CommunityService,
} from "../community.types";
import { useCommunityWrite } from "../hooks/useCommunityWrite";

const draft: CommunityPostDraft = {
  boardType: "FREE",
  title: "생활 루틴",
  content: "주간 단위로 계획을 점검한 경험을 공유합니다.",
  tags: ["루틴"],
  anonymous: true,
};

describe("community write hook", () => {
  it("validates and publishes a privacy-safe draft", async () => {
    const publishPost = jest.fn(
      async (): Promise<CommunityApiResponse> => ({
        data: {
          postId: "post_1",
          boardType: "FREE",
          title: draft.title,
          content: draft.content,
          authorMasked: "익명 사용자",
          status: "VISIBLE",
          likeCount: 0,
          commentCount: 0,
          createdAt: "2026-06-25T00:00:00.000Z",
          updatedAt: "2026-06-25T00:00:00.000Z",
          financialRawDataExposed: false,
        },
      }),
    );
    const service = {
      previewPost: jest.fn(() => ({
        valid: true,
        issues: [],
        moderationStatus: "SAFE",
      })),
      publishPost,
    } as unknown as CommunityService;
    const onPublished = jest.fn();
    const { result } = renderHook(() =>
      useCommunityWrite(service, { initialDraft: draft, onPublished }),
    );

    expect(result.current.validation.moderationStatus).toBe("SAFE");
    await act(async () => result.current.submit());

    expect(publishPost).toHaveBeenCalledWith(draft);
    expect(onPublished).toHaveBeenCalledWith(
      expect.objectContaining({ id: "post_1" }),
    );
    expect(result.current.error).toBeNull();
  });

  it("restores a persisted draft and clears it after successful publish", async () => {
    const publishPost = jest.fn(
      async (): Promise<CommunityApiResponse> => ({
        data: {
          postId: "post_1",
          boardType: "FREE",
          title: draft.title,
          content: draft.content,
          authorMasked: "anonymous user",
          status: "VISIBLE",
          likeCount: 0,
          commentCount: 0,
          createdAt: "2026-06-25T00:00:00.000Z",
          updatedAt: "2026-06-25T00:00:00.000Z",
          financialRawDataExposed: false,
        },
      }),
    );
    const service = {
      previewPost: jest.fn(() => ({
        valid: true,
        issues: [],
        moderationStatus: "SAFE",
      })),
      publishPost,
    } as unknown as CommunityService;
    const draftStore = {
      clearDraft: jest.fn(async () => undefined),
      loadDraft: jest.fn(async () => draft),
      saveDraft: jest.fn(async () => undefined),
    };
    const { result } = renderHook(() =>
      useCommunityWrite(service, { draftStore }),
    );

    await waitFor(() => expect(result.current.draft.title).toBe(draft.title));
    await act(async () => result.current.submit());

    expect(draftStore.loadDraft).toHaveBeenCalledTimes(1);
    expect(publishPost).toHaveBeenCalledWith(draft);
    expect(draftStore.clearDraft).toHaveBeenCalledTimes(1);
  });
});
