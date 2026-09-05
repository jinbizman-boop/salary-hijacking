import { ConfirmDialog } from "../../../shared/components/ConfirmDialog";

export type ReportResultDialogProps = Readonly<{
  onConfirm: () => void;
}>;

export function ReportResultDialog({ onConfirm }: ReportResultDialogProps) {
  return (
    <ConfirmDialog
      cancelLabel="닫기"
      confirmLabel="확인"
      description="신고가 접수되었습니다. 운영 검수 전까지 동일 신고의 중복 제출은 제한됩니다."
      onCancel={onConfirm}
      onConfirm={onConfirm}
      title="신고 접수 완료"
    />
  );
}
