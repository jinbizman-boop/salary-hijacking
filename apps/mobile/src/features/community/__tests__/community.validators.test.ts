import {
  validateCommentInput,
  validatePostDraft,
} from "../community.validators";

describe("community validators", () => {
  it("accepts a privacy-safe post draft", () => {
    const result = validatePostDraft({
      boardType: "FREE",
      title: "생활비 루틴을 바꾼 후기",
      content: "주간 단위로 계획하고 남은 금액은 공개하지 않았어요.",
      tags: ["생활비", "루틴"],
      anonymous: true,
    });

    expect(result).toEqual({
      valid: true,
      issues: [],
      moderationStatus: "SAFE",
    });
  });

  it.each([
    ["연락처 공개", "제 이메일은 user@example.com 입니다.", "PERSONAL_DATA"],
    ["급여 공개", "월급은 3,500,000원입니다.", "FINANCIAL_DATA"],
    ["고수익 보장", "원금 보장 고수익 투자 링크로 오세요.", "RISKY_ADVICE"],
    ["개인 연락", "전화번호 010-1234-5678로 연락하세요.", "PERSONAL_DATA"],
    [
      "raw JWT exposure",
      "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.signature",
      "PERSONAL_DATA",
    ],
  ])("blocks %s", (title, content, expectedCode) => {
    const result = validatePostDraft({
      boardType: "FREE",
      title,
      content,
      tags: [],
      anonymous: true,
    });

    expect(result.valid).toBe(false);
    expect(result.moderationStatus).toBe("BLOCKED");
    expect(result.issues.some((item) => item.code === expectedCode)).toBe(true);
  });

  it("validates comment length and sensitive content", () => {
    expect(
      validateCommentInput({ content: "좋은 루틴이네요.", anonymous: true })
        .valid,
    ).toBe(true);
    expect(validateCommentInput({ content: "", anonymous: true }).valid).toBe(
      false,
    );
    expect(
      validateCommentInput({
        content: "계좌 123-456-789012로 보내세요.",
        anonymous: true,
      }).valid,
    ).toBe(false);
  });
});
