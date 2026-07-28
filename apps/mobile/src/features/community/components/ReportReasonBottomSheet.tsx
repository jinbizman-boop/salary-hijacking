import { BottomSheet } from "../../../shared/components/BottomSheet";

export type ReportReasonBottomSheetProps = Readonly<{
  onClose: () => void;
  onSelect: (reason: "spam" | "privacy" | "abuse" | "financial") => void;
}>;

export function ReportReasonBottomSheet({
  onClose,
  onSelect,
}: ReportReasonBottomSheetProps) {
  return (
    <BottomSheet
      actions={[
        { key: "spam", label: "스팸/홍보" },
        { key: "privacy", label: "개인정보 노출" },
        { key: "financial", label: "민감 금융정보 노출" },
        { key: "abuse", label: "욕설/괴롭힘" },
      ]}
      onClose={onClose}
      onSelect={(key) =>
        onSelect(key as "spam" | "privacy" | "abuse" | "financial")
      }
      title="신고 사유"
    />
  );
}
