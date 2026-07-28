import { BottomSheet } from "../../components/BottomSheet";

export type RecurrenceBottomSheetProps = Readonly<{
  onClose: () => void;
  onSelect: (value: "daily" | "weekly" | "monthly") => void;
}>;

export function RecurrenceBottomSheet({
  onClose,
  onSelect,
}: RecurrenceBottomSheetProps) {
  return (
    <BottomSheet
      actions={[
        { key: "daily", label: "매일", description: "일일 생활비 항목" },
        { key: "weekly", label: "매주", description: "주 단위 반복" },
        { key: "monthly", label: "매월", description: "월 고정 항목" },
      ]}
      onClose={onClose}
      onSelect={(key) => onSelect(key as "daily" | "weekly" | "monthly")}
      title="반복 주기"
    />
  );
}
