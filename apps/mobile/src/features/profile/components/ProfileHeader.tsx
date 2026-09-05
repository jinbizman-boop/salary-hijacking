import { StyleSheet, Text, View } from "react-native";

import {
  SurfaceCard,
  componentColors,
  salaryHijackingDesignSystem,
} from "../../../shared/components";

const designSystem = salaryHijackingDesignSystem;

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
    gap: designSystem.spacing[3],
  },
  avatar: {
    width: designSystem.spacing[8] + designSystem.spacing[8],
    height: designSystem.spacing[8] + designSystem.spacing[8],
    alignItems: "center",
    justifyContent: "center",
    borderRadius: designSystem.radius.full,
    backgroundColor: componentColors.primaryGreenSoft,
  },
  avatarText: {
    color: componentColors.primaryGreenDark,
    ...designSystem.typography.titleL,
  },
  copy: {
    flex: 1,
    gap: designSystem.spacing[1],
  },
  name: {
    color: componentColors.textPrimary,
    ...designSystem.typography.titleXL,
  },
  title: {
    color: componentColors.primaryGreen,
    ...designSystem.typography.labelM,
  },
  meta: {
    color: componentColors.textSecondary,
    ...designSystem.typography.caption,
  },
  guard: {
    color: componentColors.textSecondary,
    ...designSystem.typography.labelS,
  },
});
