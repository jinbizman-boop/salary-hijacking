import {
  COMMUNITY_BOARD_TYPES,
  COMMUNITY_MAX_COMMENT_LENGTH,
  COMMUNITY_MAX_CONTENT_LENGTH,
  COMMUNITY_MAX_TAG_LENGTH,
  COMMUNITY_MAX_TAGS,
  COMMUNITY_MAX_TITLE_LENGTH,
} from "./community.constants";
import { moderateCommunityText } from "./community.moderation";
import type {
  CommunityCommentDraft,
  CommunityPostDraft,
  CommunityValidationIssue,
  CommunityValidationResult,
} from "./community.types";

function issue(
  code: CommunityValidationIssue["code"],
  field: CommunityValidationIssue["field"],
  message: string,
): CommunityValidationIssue {
  return { code, field, message };
}

export function validatePostDraft(
  draft: CommunityPostDraft,
): CommunityValidationResult {
  const issues: CommunityValidationIssue[] = [];
  const title = draft.title.trim();
  const content = draft.content.trim();

  if (!COMMUNITY_BOARD_TYPES.includes(draft.boardType)) {
    issues.push(issue("REQUIRED", "content", "게시판을 선택해 주세요."));
  }
  if (!title) {
    issues.push(issue("REQUIRED", "title", "제목을 입력해 주세요."));
  } else if (title.length < 2) {
    issues.push(issue("TOO_SHORT", "title", "제목은 2자 이상이어야 합니다."));
  } else if (title.length > COMMUNITY_MAX_TITLE_LENGTH) {
    issues.push(issue("TOO_LONG", "title", "제목이 너무 깁니다."));
  }

  if (!content) {
    issues.push(issue("REQUIRED", "content", "내용을 입력해 주세요."));
  } else if (content.length < 2) {
    issues.push(issue("TOO_SHORT", "content", "내용은 2자 이상이어야 합니다."));
  } else if (content.length > COMMUNITY_MAX_CONTENT_LENGTH) {
    issues.push(issue("TOO_LONG", "content", "내용이 너무 깁니다."));
  }

  if (draft.tags.length > COMMUNITY_MAX_TAGS) {
    issues.push(
      issue("TOO_MANY_TAGS", "tags", "태그는 10개 이하로 입력해 주세요."),
    );
  }
  if (
    draft.tags.some(
      (tag) =>
        !tag.trim() ||
        tag.trim().length > COMMUNITY_MAX_TAG_LENGTH ||
        /[#,\n\r]/u.test(tag),
    )
  ) {
    issues.push(issue("INVALID_TAG", "tags", "태그 형식을 확인해 주세요."));
  }

  if (issues.length > 0) {
    return { valid: false, issues, moderationStatus: "BLOCKED" };
  }
  return moderateCommunityText(title, content);
}

export function validateCommentInput(
  draft: CommunityCommentDraft,
): CommunityValidationResult {
  const content = draft.content.trim();
  if (!content) {
    return {
      valid: false,
      issues: [issue("REQUIRED", "content", "댓글을 입력해 주세요.")],
      moderationStatus: "BLOCKED",
    };
  }
  if (content.length > COMMUNITY_MAX_COMMENT_LENGTH) {
    return {
      valid: false,
      issues: [issue("TOO_LONG", "content", "댓글이 너무 깁니다.")],
      moderationStatus: "BLOCKED",
    };
  }
  return moderateCommunityText("", content);
}
