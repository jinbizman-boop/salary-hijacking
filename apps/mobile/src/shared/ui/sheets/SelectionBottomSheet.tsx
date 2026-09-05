import {
  BottomSheet,
  type BottomSheetAction,
} from "../../components/BottomSheet";
import { salaryHijackingDesignSystem } from "../../components/tokens";

export const selectionBottomSheetDesignContract = {
  component: "BottomSheet",
  minTouchTarget: salaryHijackingDesignSystem.layout.touchTarget,
  radius: salaryHijackingDesignSystem.radius.xl,
} as const;

export type SelectionBottomSheetProps = Readonly<{
  title?: string;
  actions: readonly BottomSheetAction[];
  onClose: () => void;
  onSelect: (key: string) => void;
}>;

export function SelectionBottomSheet({
  actions,
  onClose,
  onSelect,
  title = "선택",
}: SelectionBottomSheetProps) {
  return (
    <BottomSheet
      actions={actions}
      onClose={onClose}
      onSelect={onSelect}
      title={title}
    />
  );
}
