import { BUDGET_RISK_LABELS, BUDGET_RISK_THRESHOLDS } from "./constants";
import type {
  BudgetActionHint,
  BudgetCheckedEvent,
  BudgetRiskLevel,
  BudgetViewModel,
  DailyBudgetSnapshot,
} from "./types";
import { formatBudgetSyncTime, formatKrw } from "./utils";

export function resolveBudgetRiskLevel(usageRate: number): BudgetRiskLevel {
  if (!Number.isFinite(usageRate) || usageRate < 0) return "SAFE";
  if (usageRate >= BUDGET_RISK_THRESHOLDS.over) return "OVER";
  if (usageRate >= BUDGET_RISK_THRESHOLDS.warning) return "WARNING";
  if (usageRate >= BUDGET_RISK_THRESHOLDS.watch) return "WATCH";
  return "SAFE";
}

export function selectBudgetViewModel(
  snapshot: DailyBudgetSnapshot,
): BudgetViewModel {
  return {
    snapshot,
    riskLabel: BUDGET_RISK_LABELS[snapshot.riskLevel],
    remainingLabel: formatKrw(snapshot.remainingToday),
    spentLabel: formatKrw(snapshot.spentToday),
    dailyLimitLabel: formatKrw(snapshot.dailyLimit),
    overspentLabel:
      snapshot.overspentAmount > 0 ? formatKrw(snapshot.overspentAmount) : null,
    lastSyncedLabel: formatBudgetSyncTime(snapshot.serverCalculatedAt),
  };
}

export function createBudgetActionHints(
  snapshot: DailyBudgetSnapshot,
): readonly BudgetActionHint[] {
  if (snapshot.riskLevel === "SAFE") return [];

  if (snapshot.riskLevel === "WATCH") {
    return [
      {
        id: "budget-watch",
        title: "오늘 사용 흐름을 확인해 보세요",
        description: "남은 일정과 필요한 지출을 가볍게 점검할 시점입니다.",
        severity: "INFO",
        route: "/(tabs)/plan",
        eventName: "budget_watch_hint_shown",
        rawFinancialDataExposed: false,
      },
    ];
  }

  if (snapshot.riskLevel === "WARNING") {
    return [
      {
        id: "budget-warning",
        title: "오늘 예산을 다시 확인해 주세요",
        description:
          "필수 지출을 우선하고 선택 지출은 다음 계획으로 옮겨 보세요.",
        severity: "WARNING",
        route: "/(tabs)/plan",
        eventName: "budget_warning_hint_shown",
        rawFinancialDataExposed: false,
      },
    ];
  }

  return [
    {
      id: "budget-over",
      title: "오늘 예산을 초과했습니다",
      description:
        "과소비를 탓하기보다 다음 날 계획과 변동지출을 함께 조정해 보세요.",
      severity: "CRITICAL",
      route: "/(tabs)/plan",
      eventName: "budget_over_hint_shown",
      rawFinancialDataExposed: false,
    },
  ];
}

export function createBudgetCheckedEvent(): BudgetCheckedEvent {
  return {
    type: "DAILY_BUDGET_CHECKED",
    source: "mobile_budget_feature",
    rawFinancialDataExposed: false,
    adsFinancialTargetingUsed: false,
  };
}
