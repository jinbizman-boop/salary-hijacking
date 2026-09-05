import { ConfirmDialog } from "../../../shared/components/ConfirmDialog";

export type BudgetOverrunDialogProps = Readonly<{
  overrunAmount: string;
  onConfirm: () => void;
  onCancel: () => void;
}>;

export function BudgetOverrunDialog({
  onCancel,
  onConfirm,
  overrunAmount,
}: BudgetOverrunDialogProps) {
  return (
    <ConfirmDialog
      cancelLabel="계속 조정"
      confirmLabel="그래도 저장"
      description={`오늘 예산을 ${overrunAmount} 초과합니다. 저장하면 홈에서 예산 초과로 표시됩니다.`}
      onCancel={onCancel}
      onConfirm={onConfirm}
      title="예산 초과"
    />
  );
}
