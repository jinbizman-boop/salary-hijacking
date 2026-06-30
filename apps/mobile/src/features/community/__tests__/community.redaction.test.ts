import {
  containsSensitiveCommunityContent,
  redactCommunityText,
} from "../community.redaction";

describe("community redaction", () => {
  it("redacts direct identifiers, account/card numbers, tokens, and raw KRW amounts", () => {
    const input =
      "메일 user@example.com 전화 010-1234-5678 계좌 123-456-789012 카드 1234-5678-9012-3456 월급 3,500,000원 token abcdefghijklmnop";
    const output = redactCommunityText(input);

    expect(output).not.toContain("user@example.com");
    expect(output).not.toContain("010-1234-5678");
    expect(output).not.toContain("123-456-789012");
    expect(output).not.toContain("1234-5678-9012-3456");
    expect(output).not.toContain("3,500,000원");
    expect(output).not.toContain("abcdefghijklmnop");
    expect(output).toContain("[이메일 비공개]");
    expect(output).toContain("[금액 비공개]");
  });

  it("allows non-identifying routine descriptions", () => {
    const safe = "이번 달 고정지출을 줄이고 영어 루틴을 7일 유지했어요.";
    expect(containsSensitiveCommunityContent(safe)).toBe(false);
    expect(redactCommunityText(safe)).toBe(safe);
  });
});
