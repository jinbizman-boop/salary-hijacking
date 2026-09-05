import { ConfirmDialog } from "../../../shared/components/ConfirmDialog";

export type LogoutConfirmDialogProps = Readonly<{
  onCancel: () => void;
  onConfirm: () => void;
}>;

export function LogoutConfirmDialog({
  onCancel,
  onConfirm,
}: LogoutConfirmDialogProps) {
  return (
    <ConfirmDialog
      cancelLabel="취소"
      confirmLabel="로그아웃"
      description="현재 기기의 자동 로그인 세션을 종료합니다."
      onCancel={onCancel}
      onConfirm={onConfirm}
      title="로그아웃"
    />
  );
}
