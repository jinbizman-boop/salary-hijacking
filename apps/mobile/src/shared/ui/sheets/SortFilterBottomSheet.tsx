import { BottomSheet } from "../../components/BottomSheet";
import { salaryHijackingDesignSystem } from "../../components/tokens";

export const sortFilterBottomSheetDesignContract = {
  component: "BottomSheet",
  minTouchTarget: salaryHijackingDesignSystem.layout.touchTarget,
  radius: salaryHijackingDesignSystem.radius.xl,
} as const;

export type SortFilterBottomSheetProps = Readonly<{
  onClose: () => void;
  onSelect: (value: "latest" | "popular" | "comments") => void;
}>;

export function SortFilterBottomSheet({
  onClose,
  onSelect,
}: SortFilterBottomSheetProps) {
  return (
    <BottomSheet
      actions={[
        { key: "latest", label: "최신순" },
        { key: "popular", label: "인기순" },
        { key: "comments", label: "댓글 많은 순" },
      ]}
      onClose={onClose}
      onSelect={(key) => onSelect(key as "latest" | "popular" | "comments")}
      title="정렬"
    />
  );
}
