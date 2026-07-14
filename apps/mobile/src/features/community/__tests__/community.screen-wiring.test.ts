import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("community tab screen wiring", () => {
  it("uses community feature components instead of the clean fintech fallback", () => {
    const source = readFileSync(
      join(
        __dirname,
        "..",
        "..",
        "..",
        "..",
        "app",
        "(tabs)",
        "community",
        "index.tsx",
      ),
      "utf8",
    );

    expect(source).not.toContain("CleanFintechScreen");
    expect(source).toContain("AppShell");
    expect(source).toContain("CommunityTabBar");
    expect(source).toContain("PopularPostSection");
    expect(source).toContain("ComposeBottomSheet");
    expect(source).toContain("/api/v1/community/posts");
    expect(source).toContain("personal_raw_data_hidden");
  });
});
