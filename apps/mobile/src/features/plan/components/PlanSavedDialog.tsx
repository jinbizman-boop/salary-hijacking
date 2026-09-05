import { ConfirmDialog } from "../../../shared/components/ConfirmDialog";

export type PlanSavedDialogProps = Readonly<{
  onConfirm: () => void;
}>;

export function PlanSavedDialog({ onConfirm }: PlanSavedDialogProps) {
  return (
    <ConfirmDialog
      cancelLabel="닫기"
      confirmLabel="확인"
      description="계획이 저장되었고 홈 요약에 다시 반영됩니다."
      onCancel={onConfirm}
      onConfirm={onConfirm}
      title="계획 저장 완료"
    />
  );
}
