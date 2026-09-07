import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("community write and detail route wiring", () => {
  const appRoot = join(__dirname, "..", "..", "..", "..", "app");
  const communityTabRoot = join(appRoot, "(tabs)", "community");
  const route = (...segments: readonly string[]): string =>
    readFileSync(join(communityTabRoot, ...segments), "utf8");

  it("keeps Community detail and write routes inside the community tab stack", () => {
    const layoutSource = route("_layout.tsx");
    const tabsSource = readFileSync(
      join(appRoot, "(tabs)", "_layout.tsx"),
      "utf8",
    );

    expect(layoutSource).toContain('import { Stack } from "expo-router"');
    expect(layoutSource).toContain('anchor: "index"');
    expect(layoutSource).toContain('name="write"');
    expect(layoutSource).toContain('name="[postId]"');
    expect(tabsSource).toContain('name: "community"');
    expect(tabsSource).not.toContain('name: "community/index"');
  });

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

  it("publishes community write drafts through the authenticated mobile API instead of a local success mock", () => {
    const source = route("write.tsx");

    expect(source).toContain("createMobileCommunityService");
    expect(source).toContain("createSecureStoreRuntime");
    expect(source).toContain("draftStore");
    expect(source).not.toContain("function postFromDraft");
    expect(source).not.toContain(
      "publishPost: (draft) => response(postFromDraft(draft))",
    );
  });

  it("uses community post detail components instead of the clean fintech detail fallback", () => {
    const source = route("[postId].tsx");

    expect(source).not.toContain("CleanFintechPostDetailScreen");
    expect(source).toContain("AppShell");
    expect(source).toContain("AppHeader");
    expect(source).toContain("CommunityPostCard");
    expect(source).toContain("CommunityCommentItem");
    expect(source).not.toContain("<CommunityAdDisclosure");
    expect(source).toContain("community_detail_ads_disabled");
    expect(source).toContain("/api/v1/community/posts");
    expect(source).toContain("community_report_policy_guard");
    expect(source).not.toContain("contextual_ads_only_guard");
  });

  it("loads community post details through the authenticated mobile API instead of a local success mock", () => {
    const source = route("[postId].tsx");

    expect(source).toContain("createMobileCommunityService");
    expect(source).toContain("useMemo");
    expect(source).not.toContain("function response(");
    expect(source).not.toContain(
      "const communityPostService: CommunityService",
    );
    expect(source).not.toContain("deleteComment: () => response({ ok: true })");
    expect(source).not.toContain("reportPost: () => response({ ok: true })");
    expect(source).not.toContain("setPostLiked: () => response");
  });

  it("does not mask missing community post details with route-local sample data", () => {
    const source = route("[postId].tsx");

    expect(source).not.toContain("sampleDetail");
    expect(source).not.toContain("sampleComments");
    expect(source).not.toContain("state.detail ??");
    expect(source).not.toContain("state.comments.length > 0 ? state.comments");
  });
});
