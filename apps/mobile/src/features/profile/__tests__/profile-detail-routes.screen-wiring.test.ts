import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("profile detail route wiring", () => {
  const route = (fileName: string): string =>
    readFileSync(
      join(__dirname, "..", "..", "..", "..", "app", "profile", fileName),
      "utf8",
    );

  const cases: readonly Readonly<{
    fileName: string;
    forbidden: string;
    variant: string;
    endpoint: string;
  }>[] = [
    {
      endpoint: "/api/v1/users/me/profile-settings",
      fileName: "settings.tsx",
      forbidden: "CleanFintechSettingsScreen",
      variant: 'variant="settings"',
    },
    {
      endpoint: "/api/v1/users/me/account",
      fileName: "account.tsx",
      forbidden: "CleanFintechSettingsScreen",
      variant: 'variant="account"',
    },
    {
      endpoint: "/api/v1/community/users/me/posts",
      fileName: "community.tsx",
      forbidden: "CleanFintechMyCommunityScreen",
      variant: 'variant="community"',
    },
    {
      endpoint: "/api/v1/growth/users/me/level-progress",
      fileName: "level.tsx",
      forbidden: "CleanFintechMyLevelProgressScreen",
      variant: 'variant="level"',
    },
    {
      endpoint: "/api/v1/users/me/notices",
      fileName: "notices.tsx",
      forbidden: "CleanFintechProfileNoticesScreen",
      variant: 'variant="notices"',
    },
    {
      endpoint: "/api/v1/support/tickets",
      fileName: "support.tsx",
      forbidden: "CleanFintechSupportScreen",
      variant: 'variant="support"',
    },
  ];

  it.each(cases)(
    "uses the profile detail component for $fileName",
    ({ endpoint, fileName, forbidden, variant }) => {
      const source = route(fileName);

      expect(source).not.toContain(forbidden);
      expect(source).toContain("ProfileDetailScreen");
      expect(source).toContain(variant);
      expect(source).toContain(endpoint);
      expect(source).toContain("raw_personal_data_not_exposed_guard");
    },
  );

  it("keeps the shared profile detail component on app shell primitives", () => {
    const source = readFileSync(
      join(__dirname, "..", "components", "ProfileDetailScreen.tsx"),
      "utf8",
    );

    expect(source).toContain("AppShell");
    expect(source).toContain("AppHeader");
    expect(source).toContain("SurfaceCard");
    expect(source).toContain("프로필 변경은 서버 기록 기준으로 관리돼요");
    expect(source).toContain("금융 원문은 광고 추천에 사용하지 않아요");
  });
});
