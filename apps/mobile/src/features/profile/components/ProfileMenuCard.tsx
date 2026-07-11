import { StyleSheet, Text, View } from "react-native";

import {
  PrimaryButton,
  SurfaceCard,
  componentColors,
} from "../../../shared/components";

export type ProfileMenuKey =
  | "MY_POSTS"
  | "MY_LEVEL"
  | "SUPPORT"
  | "NOTICES"
  | "ACCOUNT_SETTINGS";

export type ProfileMenuCardProps = Readonly<{
  onSelect: (key: ProfileMenuKey) => void;
}>;

const menuItems: readonly Readonly<{
  key: ProfileMenuKey;
  label: string;
  accessibilityLabel: string;
}>[] = [
  {
    key: "MY_POSTS",
    label: "My posts",
    accessibilityLabel: "manage my posts",
  },
  {
    key: "MY_LEVEL",
    label: "My level",
    accessibilityLabel: "manage my level",
  },
  {
    key: "SUPPORT",
    label: "1:1 support",
    accessibilityLabel: "support ticket",
  },
  {
    key: "NOTICES",
    label: "Notices",
    accessibilityLabel: "notices",
  },
  {
    key: "ACCOUNT_SETTINGS",
    label: "Account settings",
    accessibilityLabel: "account settings",
  },
];

export function ProfileMenuCard({
  onSelect,
}: ProfileMenuCardProps): React.ReactElement {
  return (
    <SurfaceCard accessibilityLabel="profile menu">
      <Text style={styles.title}>My page menu</Text>
      <View style={styles.stack}>
        {menuItems.map((item) => (
          <PrimaryButton
            accessibilityLabel={item.accessibilityLabel}
            key={item.key}
            label={item.label}
            onPress={() => onSelect(item.key)}
            variant="secondary"
          />
        ))}
      </View>
      <Text style={styles.guard}>financialRawDataExposed=false</Text>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  title: {
    color: componentColors.textPrimary,
    fontSize: 18,
    fontWeight: "900",
  },
  stack: {
    gap: 8,
  },
  guard: {
    color: componentColors.textSecondary,
    fontSize: 11,
    fontWeight: "800",
  },
});
