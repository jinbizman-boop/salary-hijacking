import { readFileSync } from "node:fs";
import { join } from "node:path";

const detailRoutes = [
  {
    file: "reading.tsx",
    component: "ReadingContentCard",
    guard: "reading_content_policy_guard",
  },
  {
    file: "news.tsx",
    component: "NewsBalanceCard",
    guard: "news_balance_policy_guard",
  },
  {
    file: "english.tsx",
    component: "EnglishLessonCard",
    guard: "english_lesson_policy_guard",
  },
  {
    file: "health.tsx",
    component: "WorkoutTimerCard",
    guard: "workout_safety_policy_guard",
  },
] as const;

describe("level detail screen wiring", () => {
  it.each(detailRoutes)(
    "uses feature components for $file instead of the clean fintech detail fallback",
    ({ component, file, guard }) => {
      const source = readFileSync(
        join(__dirname, "..", "..", "..", "..", "app", "level", file),
        "utf8",
      );

      expect(source).not.toContain("CleanFintechLevelDetailScreen");
      expect(source).toContain("AppShell");
      expect(source).toContain("AppHeader");
      expect(source).toContain(component);
      expect(source).toContain("XpRewardToast");
      expect(source).toContain("GROWTH_CONTENTS_PATH");
      expect(source).toContain(guard);
    },
  );
});
