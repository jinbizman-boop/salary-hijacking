import {
  BottomSheet,
  type BottomSheetAction,
} from "../../components/BottomSheet";

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
