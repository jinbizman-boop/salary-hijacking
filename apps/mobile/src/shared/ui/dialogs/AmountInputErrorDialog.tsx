import { ConfirmDialog } from "../../components/ConfirmDialog";
import { salaryHijackingDesignSystem } from "../../components/tokens";

export const amountInputErrorDialogDesignContract = {
  component: "ConfirmDialog",
  minTouchTarget: salaryHijackingDesignSystem.layout.touchTarget,
  radius: salaryHijackingDesignSystem.radius.xl,
} as const;

export type AmountInputErrorDialogProps = Readonly<{
  message?: string;
  onConfirm: () => void;
}>;

export function AmountInputErrorDialog({
  message = "금액은 0원보다 큰 원 단위 숫자로 입력해 주세요.",
  onConfirm,
}: AmountInputErrorDialogProps) {
  return (
    <ConfirmDialog
      cancelLabel="닫기"
      confirmLabel="다시 입력"
      description={message}
      onCancel={onConfirm}
      onConfirm={onConfirm}
      title="금액 입력 확인"
    />
  );
}
