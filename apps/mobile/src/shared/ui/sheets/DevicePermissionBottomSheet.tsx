import { BottomSheet } from "../../components/BottomSheet";
import { salaryHijackingDesignSystem } from "../../components/tokens";

export const devicePermissionBottomSheetDesignContract = {
  component: "BottomSheet",
  minTouchTarget: salaryHijackingDesignSystem.layout.touchTarget,
  radius: salaryHijackingDesignSystem.radius.xl,
} as const;

export type DevicePermissionBottomSheetProps = Readonly<{
  permissionName: string;
  onClose: () => void;
  onOpenSettings: () => void;
}>;

export function DevicePermissionBottomSheet({
  onClose,
  onOpenSettings,
  permissionName,
}: DevicePermissionBottomSheetProps) {
  return (
    <BottomSheet
      actions={[
        {
          key: "settings",
          label: "설정 열기",
          description: `${permissionName} 권한을 허용합니다`,
        },
      ]}
      onClose={onClose}
      onSelect={onOpenSettings}
      title={`${permissionName} 권한 필요`}
    />
  );
}
