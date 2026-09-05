import { ConfirmDialog } from "../../../shared/components/ConfirmDialog";

export type MissionCompleteDialogProps = Readonly<{
  missionTitle: string;
  xp: number;
  onConfirm: () => void;
}>;

export function MissionCompleteDialog({
  missionTitle,
  onConfirm,
  xp,
}: MissionCompleteDialogProps) {
  return (
    <ConfirmDialog
      cancelLabel="닫기"
      confirmLabel="확인"
      description={`${missionTitle} 완료 기록이 저장되었습니다. XP ${xp}가 성장 기록에 반영됩니다.`}
      onCancel={onConfirm}
      onConfirm={onConfirm}
      title="LV UP 완료"
    />
  );
}
