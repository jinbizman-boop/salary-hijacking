import { BottomSheet } from "../../components/BottomSheet";
import { salaryHijackingDesignSystem } from "../../components/tokens";

export const visibilityBottomSheetDesignContract = {
  component: "BottomSheet",
  minTouchTarget: salaryHijackingDesignSystem.layout.touchTarget,
  radius: salaryHijackingDesignSystem.radius.xl,
} as const;

export type VisibilityBottomSheetProps = Readonly<{
  onClose: () => void;
  onSelect: (value: "public" | "anonymous" | "private") => void;
}>;

export function VisibilityBottomSheet({
  onClose,
  onSelect,
}: VisibilityBottomSheetProps) {
  return (
    <BottomSheet
      actions={[
        { key: "public", label: "공개", description: "닉네임으로 게시" },
        { key: "anonymous", label: "익명", description: "작성자 표시 숨김" },
        { key: "private", label: "나만 보기", description: "임시 저장" },
      ]}
      onClose={onClose}
      onSelect={(key) => onSelect(key as "public" | "anonymous" | "private")}
      title="공개 범위"
    />
  );
}
