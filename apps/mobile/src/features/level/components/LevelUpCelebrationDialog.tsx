import { ConfirmDialog } from "../../../shared/components/ConfirmDialog";

export type LevelUpCelebrationDialogProps = Readonly<{
  level: number;
  onConfirm: () => void;
  onShare?: () => void;
}>;

export function LevelUpCelebrationDialog({
  level,
  onConfirm,
  onShare,
}: LevelUpCelebrationDialogProps) {
  return (
    <ConfirmDialog
      cancelLabel="닫기"
      confirmLabel={onShare ? "공유하기" : "확인"}
      description={`축하합니다. 현재 레벨이 ${level}LV로 올랐습니다.`}
      onCancel={onConfirm}
      onConfirm={onShare ?? onConfirm}
      title="레벨업"
    />
  );
}
