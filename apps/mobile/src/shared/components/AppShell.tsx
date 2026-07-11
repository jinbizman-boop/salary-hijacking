import { SafeAreaView, ScrollView, StyleSheet, View } from "react-native";

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
  return (
    <SafeAreaView accessibilityLabel={accessibilityLabel} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        {header}
        <View style={styles.stack}>{children}</View>
      </ScrollView>
      {bottomTabBar}
    </SafeAreaView>
  );
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
