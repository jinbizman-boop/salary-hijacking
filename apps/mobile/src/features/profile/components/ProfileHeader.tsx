import { StyleSheet, Text, View } from "react-native";

import {
  SurfaceCard,
  componentColors,
  componentRadius,
} from "../../../shared/components";

export type ProfileHeaderProps = Readonly<{
  avatarEmoji: string;
  displayName: string;
  levelTitle: string;
  maskedEmail?: string;
  rawPersonalDataExposed: false;
}>;

export function ProfileHeader({
  avatarEmoji,
  displayName,
  levelTitle,
  maskedEmail,
  rawPersonalDataExposed: _rawPersonalDataExposed,
}: ProfileHeaderProps): React.ReactElement {
  return (
    <SurfaceCard accessibilityLabel={`profile header for ${displayName}`}>
      <View style={styles.row}>
        <View accessibilityLabel="profile avatar" style={styles.avatar}>
          <Text style={styles.avatarText}>{avatarEmoji}</Text>
        </View>
        <View style={styles.copy}>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.title}>{levelTitle}</Text>
          {maskedEmail ? <Text style={styles.meta}>{maskedEmail}</Text> : null}
        </View>
      </View>
      <Text style={styles.guard}>개인정보는 마스킹되어 표시돼요</Text>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatar: {
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: componentRadius.pill,
    backgroundColor: componentColors.primaryGreenSoft,
  },
  avatarText: {
    color: componentColors.primaryGreenDark,
    fontSize: 22,
    fontWeight: "900",
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  name: {
    color: componentColors.textPrimary,
    fontSize: 24,
    fontWeight: "900",
  },
  title: {
    color: componentColors.primaryGreen,
    fontSize: 14,
    fontWeight: "900",
  },
  meta: {
    color: componentColors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  guard: {
    color: componentColors.textSecondary,
    fontSize: 11,
    fontWeight: "800",
  },
});
