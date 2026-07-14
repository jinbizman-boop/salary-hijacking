import { StyleSheet, Text, View } from "react-native";

import {
  PrimaryButton,
  SurfaceCard,
  componentColors,
  componentSpacing,
} from "../../../shared/components";

export type PlanActionItem = Readonly<{
  key: string;
  label: string;
  description: string;
}>;

export type PlanActionListProps = Readonly<{
  actions: readonly PlanActionItem[];
  onSelect: (key: string) => void;
}>;

export function PlanActionList({
  actions,
  onSelect,
}: PlanActionListProps): React.ReactElement {
  return (
    <SurfaceCard accessibilityLabel="plan-action-list">
      <Text style={styles.title}>관리</Text>
      {actions.map((action) => (
        <View key={action.key} style={styles.row}>
          <View style={styles.textBlock}>
            <Text style={styles.label}>{action.label}</Text>
            <Text style={styles.description}>{action.description}</Text>
          </View>
          <PrimaryButton
            accessibilityLabel={`${action.label} ${action.description}`}
            label="열기"
            onPress={() => onSelect(action.key)}
            variant="secondary"
          />
        </View>
      ))}
      <Text style={styles.guard}>저장 후 서버 기준으로 다시 계산돼요</Text>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  title: {
    color: componentColors.textPrimary,
    fontSize: 18,
    fontWeight: "900",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: componentSpacing.md,
    minHeight: 58,
  },
  textBlock: {
    flex: 1,
    gap: 3,
  },
  label: {
    color: componentColors.textPrimary,
    fontSize: 15,
    fontWeight: "800",
  },
  description: {
    color: componentColors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  guard: {
    color: componentColors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
});
