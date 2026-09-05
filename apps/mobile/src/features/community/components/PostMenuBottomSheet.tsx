import { BottomSheet } from "../../../shared/components/BottomSheet";

export type PostMenuBottomSheetProps = Readonly<{
  mine?: boolean;
  onClose: () => void;
  onSelect: (action: "edit" | "delete" | "report" | "block" | "share") => void;
}>;

export function PostMenuBottomSheet({
  mine = false,
  onClose,
  onSelect,
}: PostMenuBottomSheetProps) {
  const actions = mine
    ? [
        { key: "edit", label: "수정" },
        { key: "delete", label: "삭제", description: "작성 글을 삭제합니다" },
        { key: "share", label: "공유" },
      ]
    : [
        { key: "report", label: "신고" },
        { key: "block", label: "작성자 차단" },
        { key: "share", label: "공유" },
      ];

  return (
    <BottomSheet
      actions={actions}
      onClose={onClose}
      onSelect={(key) =>
        onSelect(key as "edit" | "delete" | "report" | "block" | "share")
      }
      title="게시글 메뉴"
    />
  );
}
