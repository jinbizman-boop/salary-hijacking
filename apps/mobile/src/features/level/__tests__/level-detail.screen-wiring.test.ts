import { readFileSync } from "node:fs";
import { join } from "node:path";

const detailRoutes = [
  {
    file: "reading.tsx",
    childRoute: "/level/reading/session",
    childFile: join("reading", "session.tsx"),
    childFallback: "/level/reading",
    productCopy: "도서 탐색",
  },
  {
    file: "news.tsx",
    childRoute: "/level/news/article",
    childFile: join("news", "article.tsx"),
    childFallback: "/level/news",
    productCopy: "뉴스 피드",
  },
  {
    file: "english.tsx",
    childRoute: "/level/english/session",
    childFile: join("english", "session.tsx"),
    childFallback: "/level/english",
    productCopy: "4개 Skill",
  },
  {
    file: "health.tsx",
    childRoute: "/level/health/routine",
    childFile: join("health", "routine.tsx"),
    childFallback: "/level/health",
    productCopy: "오늘 추천 루틴",
  },
] as const;

describe("level detail screen wiring", () => {
  it.each(detailRoutes)(
    "uses feature components for $file instead of the clean fintech detail fallback",
    ({ file, childRoute, childFile, childFallback, productCopy }) => {
      const source = readFileSync(
        join(__dirname, "..", "..", "..", "..", "app", "level", file),
        "utf8",
      );

      expect(source).not.toContain("CleanFintechLevelDetailScreen");
      expect(source).toContain("AppShell");
      expect(source).toContain("AppHeader");
      expect(source).toContain("ProductDetail");
      expect(source).toContain("XpRewardToast");
      expect(source).toContain("createMobileGrowthApi");
      expect(source).toContain("loadGrowthContentForType");
      expect(source).toContain("completeGrowthContentWithServerAuthority");
      expect(source).not.toContain("onPrimary={() => undefined}");
      expect(source).not.toContain("onRecord={() => undefined}");
      expect(source).toContain(`router.push("${childRoute}"`);
      expect(source).toContain("useLogicalBack");
      expect(source).toContain('fallbackHref: "/level"');
      expect(source).not.toContain("onBack={() => router.back()}");
      expect(source).toContain(productCopy);
      expect(source).not.toContain("Synthetic");
      expect(source).not.toContain("QA");
      expect(source).not.toContain("Staging");

      const childSource = readFileSync(
        join(__dirname, "..", "..", "..", "..", "app", "level", childFile),
        "utf8",
      );
      expect(childSource).toContain("useLogicalBack");
      expect(childSource).toContain(`fallbackHref: "${childFallback}"`);
      expect(childSource).not.toContain("router.replace(\"/salary\"");
      expect(childSource).not.toContain("onBack={() => router.back()}");
    },
  );
});
