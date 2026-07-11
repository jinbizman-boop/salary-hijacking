import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("community write and detail route wiring", () => {
  const route = (...segments: readonly string[]): string =>
    readFileSync(
      join(__dirname, "..", "..", "..", "..", "app", "community", ...segments),
      "utf8",
    );

  it("uses the community write feature form instead of the clean fintech write fallback", () => {
    const source = route("write.tsx");

    expect(source).not.toContain("CleanFintechWriteScreen");
    expect(source).toContain("AppShell");
    expect(source).toContain("AppHeader");
    expect(source).toContain("CommunityWriteForm");
    expect(source).toContain("useCommunityWrite");
    expect(source).toContain("/api/v1/community/posts");
    expect(source).toContain("raw_financial_data_not_allowed_guard");
    expect(source).toContain("community_publish_idempotency_guard");
  });

  it("uses community post detail components instead of the clean fintech detail fallback", () => {
    const source = route("[postId].tsx");

    expect(source).not.toContain("CleanFintechPostDetailScreen");
    expect(source).toContain("AppShell");
    expect(source).toContain("AppHeader");
    expect(source).toContain("CommunityPostCard");
    expect(source).toContain("CommunityCommentItem");
    expect(source).toContain("CommunityAdDisclosure");
    expect(source).toContain("/api/v1/community/posts");
    expect(source).toContain("community_report_policy_guard");
    expect(source).toContain("contextual_ads_only_guard");
  });
});
