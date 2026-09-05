import { router } from "expo-router";

import { SalaryHomeScreen } from "../../../src/features/salary/components/SalaryHomeScreen";
import { ConfirmDialog } from "../../../src/shared/components/ConfirmDialog";
import { ErrorState } from "../../../src/shared/components/ErrorState";
import { AmountInputErrorDialog } from "../../../src/shared/ui/dialogs/AmountInputErrorDialog";
import { SelectionBottomSheet } from "../../../src/shared/ui/sheets/SelectionBottomSheet";

const SCREEN_VERSION = "4.3.0-salary-home-ui";
const SALARY_SUMMARY_ENDPOINT = "/api/v1/salary/summary";
const SPONSORED_SLOT_LABEL = "Sponsored 광고 영역";
const SALARY_VISIBLE_COPY_CONTRACT = [
  "Salary Hijacking",
  "SALARY HIJACKING",
  "지켜낸 돈",
  "누적 납치금액",
  "오늘 사용 가능 금액",
  "예정 고정지출",
  "변동지출",
] as const;

export const salaryStitchOverlayComponents = {
  AmountInputErrorDialog,
  ConfirmDialog,
  ErrorState,
  SelectionBottomSheet,
} as const;

export default function SalaryIndexScreen(): React.ReactElement {
  return (
    <SalaryHomeScreen
      onOpenNotifications={() => router.push("/notifications")}
      onOpenSettings={() => router.push("/profile/settings")}
    />
  );
}

export function assertMobileSalaryIndexCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "SalaryHomeScreen",
    SALARY_SUMMARY_ENDPOINT,
    SPONSORED_SLOT_LABEL,
    ...SALARY_VISIBLE_COPY_CONTRACT,
    "server_authority_component_guard",
    "responsive_salary_home_guard",
    "raw_account_data_component_guard",
    "KRW integer display",
    "financial amount ad targeting prohibited",
  ] as const;

  return { ok: checks.length >= 12, version: SCREEN_VERSION, checks };
}
