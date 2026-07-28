import { BottomSheet } from "../../components/BottomSheet";

export type AttachmentBottomSheetProps = Readonly<{
  onClose: () => void;
  onSelect: (value: "camera" | "gallery" | "file") => void;
}>;

export function AttachmentBottomSheet({
  onClose,
  onSelect,
}: AttachmentBottomSheetProps) {
  return (
    <BottomSheet
      actions={[
        { key: "camera", label: "카메라", description: "새 사진 촬영" },
        { key: "gallery", label: "앨범", description: "이미지 선택" },
        { key: "file", label: "파일", description: "문서 첨부" },
      ]}
      onClose={onClose}
      onSelect={(key) => onSelect(key as "camera" | "gallery" | "file")}
      title="첨부"
    />
  );
}
