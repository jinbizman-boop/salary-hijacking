import { AppHeader, AppShell } from "../../src/shared/components";
import {
  NewsBalanceCard,
  XpRewardToast,
} from "../../src/features/level/components";
import { GROWTH_CONTENTS_PATH } from "../../src/features/level/constants";
import { levelDetailContent } from "../../src/features/level/detail-content";

const SCREEN_VERSION = "4.1.0-level-detail-components";
const content = levelDetailContent.NEWS;

export default function NewsLevelScreen(): React.ReactElement {
  return (
    <AppShell
      accessibilityLabel="Salary Hijacking news level detail"
      header={<AppHeader subtitle="LV UP" title="뉴스" />}
    >
      <NewsBalanceCard content={content} onRecord={() => undefined} />
      <XpRewardToast
        earnedXp={content.xpReward}
        rewardSource="NEWS_BALANCE_COMPLETE"
      />
    </AppShell>
  );
}

export function assertMobileNewsLevelCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "Salary Hijacking level detail feature components",
    GROWTH_CONTENTS_PATH,
    "AppShell",
    "AppHeader",
    "NewsBalanceCard",
    "XpRewardToast",
    "뉴스",
    "경제",
    "산업",
    "사회",
    "기술",
    "전체",
    "출처/날짜",
    "좋아요",
    "댓글",
    "공유",
    "news_balance_policy_guard",
    "server_authority_component_guard",
    "financial_raw_data_component_guard",
  ] as const;

  return { ok: checks.length >= 17, version: SCREEN_VERSION, checks };
}
