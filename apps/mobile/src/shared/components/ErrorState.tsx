import { StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "./PrimaryButton";
import { componentColors } from "./tokens";

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
    gap: 10,
    padding: 18,
  },
  title: {
    color: componentColors.dangerRed,
    fontSize: 17,
    fontWeight: "900",
  },
  message: {
    color: componentColors.textSecondary,
    fontSize: 13,
  },
});
