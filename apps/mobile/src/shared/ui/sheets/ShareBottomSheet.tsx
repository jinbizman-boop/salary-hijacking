import { BottomSheet } from "../../components/BottomSheet";

export type ShareBottomSheetProps = Readonly<{
  onClose: () => void;
  onSelect: (value: "copy" | "community" | "native") => void;
}>;

export function ShareBottomSheet({ onClose, onSelect }: ShareBottomSheetProps) {
  return (
    <BottomSheet
      actions={[
        { key: "community", label: "커뮤니티 공유", description: "성과 글로 남기기" },
        { key: "copy", label: "링크 복사", description: "공유 링크 저장" },
        { key: "native", label: "다른 앱으로 공유", description: "시스템 공유 열기" },
      ]}
      onClose={onClose}
      onSelect={(key) => onSelect(key as "copy" | "community" | "native")}
      title="공유"
    />
  );
}
