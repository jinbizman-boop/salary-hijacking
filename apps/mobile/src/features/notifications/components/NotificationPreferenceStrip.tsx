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
    <SurfaceCard accessibilityLabel="notification-preference-strip">
      <View style={styles.row}>
        <View style={styles.statusGroup}>
          <Text style={styles.status}>
            {pushEnabled ? "푸시 켜짐" : "푸시 꺼짐"}
          </Text>
          <Text style={styles.status}>
            {marketingEnabled ? "마케팅 켜짐" : "마케팅 꺼짐"}
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
  statusGroup: {
    flex: 1,
    gap: componentSpacing.xs,
  },
  status: {
    color: componentColors.textPrimary,
    fontSize: 14,
    fontWeight: "800",
  },
});
