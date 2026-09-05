import { ConfirmDialog } from "../../../shared/components/ConfirmDialog";

export type PostRegistrationResultDialogProps = Readonly<{
  onConfirm: () => void;
  onViewPost?: () => void;
}>;

export function PostRegistrationResultDialog({
  onConfirm,
  onViewPost,
}: PostRegistrationResultDialogProps) {
  return (
    <ConfirmDialog
      cancelLabel="닫기"
      confirmLabel={onViewPost ? "게시글 보기" : "확인"}
      description="게시글이 등록되었습니다. 댓글과 좋아요 알림은 알림 화면에서 확인할 수 있습니다."
      onCancel={onConfirm}
      onConfirm={onViewPost ?? onConfirm}
      title="등록 완료"
    />
  );
}
