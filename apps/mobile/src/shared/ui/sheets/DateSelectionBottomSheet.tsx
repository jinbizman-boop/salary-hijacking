import { BottomSheet } from "../../components/BottomSheet";
import { salaryHijackingDesignSystem } from "../../components/tokens";

export const dateSelectionBottomSheetDesignContract = {
  component: "BottomSheet",
  minTouchTarget: salaryHijackingDesignSystem.layout.touchTarget,
  radius: salaryHijackingDesignSystem.radius.xl,
} as const;

export type DateSelectionBottomSheetProps = Readonly<{
  selectedDay?: number;
  onClose: () => void;
  onSelectDay: (day: number) => void;
}>;

export function DateSelectionBottomSheet({
  onClose,
  onSelectDay,
  selectedDay,
}: DateSelectionBottomSheetProps) {
  const actions = [1, 5, 10, 15, 20, 25, 30].map((day) => ({
    key: String(day),
    label: `매월 ${day}일`,
    description: selectedDay === day ? "현재 선택됨" : "반복 지출일로 설정",
  }));

  return (
    <BottomSheet
      actions={actions}
      onClose={onClose}
      onSelect={(key) => onSelectDay(Number(key))}
      title="날짜 선택"
    />
  );
}
