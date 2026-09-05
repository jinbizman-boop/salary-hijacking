import { ConfirmDialog } from "../../../shared/components/ConfirmDialog";

export type ExpenseDeleteDialogProps = Readonly<{
  title?: string;
  onCancel: () => void;
  onConfirm: () => void;
}>;

export function ExpenseDeleteDialog({
  onCancel,
  onConfirm,
  title = "지출 기록",
}: ExpenseDeleteDialogProps) {
  return (
    <ConfirmDialog
      cancelLabel="취소"
      confirmLabel="삭제"
      description={`${title}을 삭제하면 서버 요약 금액이 다시 계산됩니다.`}
      destructive
      onCancel={onCancel}
      onConfirm={onConfirm}
      title="지출 삭제"
    />
  );
}
