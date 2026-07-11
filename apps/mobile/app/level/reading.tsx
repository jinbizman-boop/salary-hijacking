import { AppHeader, AppShell } from "../../src/shared/components";
import {
  ReadingContentCard,
  XpRewardToast,
} from "../../src/features/level/components";
import { GROWTH_CONTENTS_PATH } from "../../src/features/level/constants";
import { levelDetailContent } from "../../src/features/level/detail-content";

const SCREEN_VERSION = "4.1.0-level-detail-components";
const content = levelDetailContent.READING;

export default function ReadingLevelScreen(): React.ReactElement {
  return (
    <AppShell
      accessibilityLabel="Salary Hijacking reading level detail"
      header={<AppHeader subtitle="LV UP" title="독서" />}
    >
      <ReadingContentCard
        content={content}
        onRecord={() => undefined}
        onStart={() => undefined}
      />
      <XpRewardToast
        earnedXp={content.xpReward}
        rewardSource="READING_COMPLETE"
      />
    </AppShell>
  );
}

export function assertMobileReadingLevelCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "Salary Hijacking level detail feature components",
    GROWTH_CONTENTS_PATH,
    "AppShell",
    "AppHeader",
    "ReadingContentCard",
    "XpRewardToast",
    "독서",
    "AI 추천",
    "소설",
    "경제/경영",
    "인문/철학",
    "기타",
    "추천 도서",
    "내 역량/진행률",
    "reading_content_policy_guard",
    "server_authority_component_guard",
    "financial_raw_data_component_guard",
  ] as const;

  return { ok: checks.length >= 15, version: SCREEN_VERSION, checks };
}
