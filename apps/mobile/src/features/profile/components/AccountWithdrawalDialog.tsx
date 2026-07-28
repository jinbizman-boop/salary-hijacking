import { ConfirmDialog } from "../../../shared/components/ConfirmDialog";

export type AccountWithdrawalDialogProps = Readonly<{
  onCancel: () => void;
  onConfirm: () => void;
}>;

export function AccountWithdrawalDialog({
  onCancel,
  onConfirm,
}: AccountWithdrawalDialogProps) {
  return (
    <ConfirmDialog
      cancelLabel="취소"
      confirmLabel="탈퇴 요청"
      description="탈퇴 요청 후 법정 보관 항목을 제외한 개인 데이터 삭제 절차가 시작됩니다."
      destructive
      onCancel={onCancel}
      onConfirm={onConfirm}
      title="계정 탈퇴"
    />
  );
}
