import { StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "./PrimaryButton";
import { componentColors, salaryHijackingDesignSystem } from "./tokens";

const designSystem = salaryHijackingDesignSystem;

export type ErrorStateProps = Readonly<{
  title: string;
  message: string;
  retryLabel?: string;
  onRetry?: () => void;
}>;

export function ErrorState({
  title,
  message,
  retryLabel = "다시 시도",
  onRetry,
}: ErrorStateProps): React.ReactElement {
  return (
    <View accessibilityLabel={`${title} ${message}`} style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? (
        <PrimaryButton
          label={retryLabel}
          onPress={onRetry}
          variant="secondary"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: designSystem.spacing[2],
    padding: designSystem.spacing[5],
  },
  title: {
    color: componentColors.dangerRed,
    ...designSystem.typography.titleM,
  },
  message: {
    color: componentColors.textSecondary,
    ...designSystem.typography.bodyS,
  },
});
