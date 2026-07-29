import { BottomSheet } from "../../../shared/components/BottomSheet";

export type DraftExitBottomSheetProps = Readonly<{
  onClose: () => void;
  onSelect: (action: "save" | "discard" | "keep") => void;
}>;

export function DraftExitBottomSheet({
  onClose,
  onSelect,
}: DraftExitBottomSheetProps) {
  return (
    <BottomSheet
      actions={[
        { key: "save", label: "임시 저장", description: "작성 내용을 보관" },
        {
          key: "discard",
          label: "버리고 나가기",
          description: "작성 내용 삭제",
        },
        { key: "keep", label: "계속 작성" },
      ]}
      onClose={onClose}
      onSelect={(key) => onSelect(key as "save" | "discard" | "keep")}
      title="작성 중인 글"
    />
  );
}
