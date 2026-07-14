import { StyleSheet, Text, View } from "react-native";

import {
  PrimaryButton,
  SurfaceCard,
  componentColors,
  componentSpacing,
} from "../../../shared/components";

export type NotificationPreferenceStripProps = Readonly<{
  pushEnabled: boolean;
  marketingEnabled: boolean;
  onMarkAllRead: () => void;
}>;

export function NotificationPreferenceStrip({
  pushEnabled,
  marketingEnabled,
  onMarkAllRead,
}: NotificationPreferenceStripProps): React.ReactElement {
  return (
    <SurfaceCard accessibilityLabel="알림 설정 요약">
      <View style={styles.row}>
        <View style={styles.statusGroup}>
          <Text style={styles.status}>
            푸시 {pushEnabled ? "켜짐" : "꺼짐"}
          </Text>
          <Text style={styles.status}>
            마케팅 {marketingEnabled ? "켜짐" : "꺼짐"}
          </Text>
        </View>
        <PrimaryButton
          accessibilityLabel="모두 읽음"
          label="모두 읽음"
          onPress={onMarkAllRead}
          variant="secondary"
        />
      </View>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: componentSpacing.md,
  },
  status: {
    color: componentColors.textPrimary,
    fontSize: 14,
    fontWeight: "800",
  },
  statusGroup: {
    flex: 1,
    gap: componentSpacing.xs,
  },
});
