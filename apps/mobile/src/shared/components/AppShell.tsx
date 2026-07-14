import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { componentColors, componentSpacing } from "./tokens";

export type AppShellProps = Readonly<{
  children: React.ReactNode;
  header?: React.ReactNode;
  bottomTabBar?: React.ReactNode;
  accessibilityLabel?: string;
}>;

export function AppShell({
  children,
  header,
  bottomTabBar,
  accessibilityLabel = "급여납치 모바일 화면",
}: AppShellProps): React.ReactElement {
  const insets = useOptionalSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      accessibilityLabel={accessibilityLabel}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={insets.top}
      style={[styles.safe, { paddingTop: insets.top }]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 96 + insets.bottom },
        ]}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
      >
        {header}
        <View style={styles.stack}>{children}</View>
      </ScrollView>
      {bottomTabBar}
    </KeyboardAvoidingView>
  );
}

function useOptionalSafeAreaInsets(): ReturnType<typeof useSafeAreaInsets> {
  try {
    return useSafeAreaInsets();
  } catch {
    return { bottom: 0, left: 0, right: 0, top: 0 };
  }
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: componentColors.background,
  },
  content: {
    gap: componentSpacing.lg,
    padding: componentSpacing.lg,
  },
  stack: {
    gap: componentSpacing.lg,
  },
});
