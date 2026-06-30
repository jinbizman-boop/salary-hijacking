const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu;
const PHONE_PATTERN = /\b01[016789][-\s]?\d{3,4}[-\s]?\d{4}\b/gu;
const RESIDENT_ID_PATTERN = /\b\d{6}[-\s]?[1-4]\d{6}\b/gu;
const CARD_PATTERN = /\b(?:\d{4}[-\s]?){3}\d{4}\b/gu;
const ACCOUNT_PATTERN =
  /(?:계좌|account)\s*(?:번호)?\s*[:：]?\s*\d{2,6}(?:[-\s]\d{2,6}){1,4}/giu;
const RAW_KRW_PATTERN =
  /(?:(?:급여|월급|연봉|수입|소득|지출|저축|예산|금액)\s*)?(?:₩\s*)?(?:\d{1,3}(?:,\d{3})+|\d{6,})\s*원?/gu;
const TOKEN_PATTERN =
  /\b(token|authorization|bearer|session|refresh|push|fcm)\b\s*[:=]?\s*[A-Z0-9._~+/=-]{8,}/giu;

const SENSITIVE_PATTERNS = [
  EMAIL_PATTERN,
  PHONE_PATTERN,
  RESIDENT_ID_PATTERN,
  CARD_PATTERN,
  ACCOUNT_PATTERN,
  RAW_KRW_PATTERN,
  TOKEN_PATTERN,
] as const;

function testPattern(pattern: RegExp, value: string): boolean {
  pattern.lastIndex = 0;
  return pattern.test(value);
}

export function containsSensitiveCommunityContent(value: string): boolean {
  return SENSITIVE_PATTERNS.some((pattern) => testPattern(pattern, value));
}

export function redactCommunityText(value: string): string {
  return value
    .replace(EMAIL_PATTERN, "[이메일 비공개]")
    .replace(PHONE_PATTERN, "[전화번호 비공개]")
    .replace(RESIDENT_ID_PATTERN, "[개인정보 비공개]")
    .replace(CARD_PATTERN, "[카드번호 비공개]")
    .replace(ACCOUNT_PATTERN, "[계좌번호 비공개]")
    .replace(RAW_KRW_PATTERN, "[금액 비공개]")
    .replace(TOKEN_PATTERN, "[인증정보 비공개]");
}

export function redactCommunityError(error: unknown): string {
  const status =
    typeof error === "object" && error !== null && "status" in error
      ? Number((error as { readonly status?: unknown }).status)
      : 0;

  if (status === 401) return "로그인이 필요합니다.";
  if (status === 403) return "커뮤니티 접근 권한이 없습니다.";
  if (status === 404) return "게시글을 찾을 수 없습니다.";
  if (status === 409) return "게시글 상태가 변경되었습니다. 새로고침해 주세요.";
  if (status === 422)
    return "커뮤니티 정책에 맞지 않는 내용이 포함되어 있습니다.";
  if (status === 429) return "요청이 많습니다. 잠시 후 다시 시도해 주세요.";
  return "일시적인 오류입니다. 다시 시도해 주세요.";
}
