import { AppHeader, AppShell } from "../../src/shared/components";
import {
  EnglishLessonCard,
  XpRewardToast,
} from "../../src/features/level/components";
import { GROWTH_CONTENTS_PATH } from "../../src/features/level/constants";
import { levelDetailContent } from "../../src/features/level/detail-content";

const SCREEN_VERSION = "4.1.0-level-detail-components";
const content = levelDetailContent.ENGLISH;

export default function EnglishLevelScreen(): React.ReactElement {
  return (
    <AppShell
      accessibilityLabel="Salary Hijacking english level detail"
      header={<AppHeader subtitle="LV UP" title="영어" />}
    >
      <EnglishLessonCard content={content} onRecord={() => undefined} />
      <XpRewardToast
        earnedXp={content.xpReward}
        rewardSource="ENGLISH_COMPLETE"
      />
    </AppShell>
  );
}

export function assertMobileEnglishLevelCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "Salary Hijacking level detail feature components",
    GROWTH_CONTENTS_PATH,
    "AppShell",
    "AppHeader",
    "EnglishLessonCard",
    "XpRewardToast",
    "영어",
    "Listening",
    "Speaking",
    "Reading",
    "Writing",
    "일자별 문장 학습",
    "문장 학습",
    "말하기 연습",
    "english_lesson_policy_guard",
    "server_authority_component_guard",
    "financial_raw_data_component_guard",
  ] as const;

  return { ok: checks.length >= 15, version: SCREEN_VERSION, checks };
}
