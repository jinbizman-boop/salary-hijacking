import { containsSensitiveCommunityContent } from "./community.redaction";
import type {
  CommunityValidationIssue,
  CommunityValidationResult,
} from "./community.types";

const RISKY_ADVICE_PATTERN =
  /원금\s*보장|수익\s*보장|고수익|리딩방|대출\s*추천|카드론|사채|처방|진단/iu;
const ABUSIVE_CONTENT_PATTERN = /죽어|혐오|성적\s*괴롭힘|폭력\s*예고/iu;
const EXTERNAL_LINK_PATTERN = /https?:\/\/|www\./iu;
const FINANCIAL_CONTEXT_PATTERN =
  /급여|월급|연봉|수입|소득|지출|저축|예산|금액|원금|대출/iu;

function issue(
  code: CommunityValidationIssue["code"],
  field: CommunityValidationIssue["field"],
  message: string,
): CommunityValidationIssue {
  return { code, field, message };
}

export function moderateCommunityText(
  title: string,
  content: string,
): CommunityValidationResult {
  const combined = `${title}\n${content}`;
  const issues: CommunityValidationIssue[] = [];

  if (containsSensitiveCommunityContent(combined)) {
    const financial = FINANCIAL_CONTEXT_PATTERN.test(combined);
    issues.push(
      issue(
        financial ? "FINANCIAL_DATA" : "PERSONAL_DATA",
        "content",
        financial
          ? "실제 금융 금액은 커뮤니티에 공개할 수 없습니다."
          : "개인 식별 정보는 커뮤니티에 공개할 수 없습니다.",
      ),
    );
  }
  if (RISKY_ADVICE_PATTERN.test(combined)) {
    issues.push(
      issue(
        "RISKY_ADVICE",
        "content",
        "위험한 금융·의료 조언 또는 보장 표현은 사용할 수 없습니다.",
      ),
    );
  }
  if (ABUSIVE_CONTENT_PATTERN.test(combined)) {
    issues.push(
      issue(
        "ABUSIVE_CONTENT",
        "content",
        "괴롭힘·혐오·폭력 표현은 사용할 수 없습니다.",
      ),
    );
  }
  if (issues.length > 0) {
    return { valid: false, issues, moderationStatus: "BLOCKED" };
  }

  if (EXTERNAL_LINK_PATTERN.test(combined)) {
    return {
      valid: true,
      issues: [
        issue("EXTERNAL_LINK", "content", "외부 링크는 서버 검토 대상입니다."),
      ],
      moderationStatus: "REVIEW",
    };
  }

  return { valid: true, issues: [], moderationStatus: "SAFE" };
}
