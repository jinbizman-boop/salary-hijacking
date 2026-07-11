import { StyleSheet, Text, View } from "react-native";

import {
  AppHeader,
  AppShell,
  ProgressBar,
  SurfaceCard,
  componentColors,
} from "../../../shared/components";

export type SplashLaunchScreenProps = Readonly<{
  routeDelayMs: number;
}>;

export function SplashLaunchScreen({
  routeDelayMs,
}: SplashLaunchScreenProps): React.ReactElement {
  return (
    <AppShell
      accessibilityLabel="Salary Hijacking launch"
      header={<AppHeader subtitle="Launch" title="SALARY HIJACKING" />}
    >
      <SurfaceCard accessibilityLabel="launch state">
        <Text style={styles.title}>급여가 사라지기 전에 먼저 붙잡아요</Text>
        <Text style={styles.body}>
          서버 세션을 확인한 뒤 로그인 또는 급여 홈으로 이동합니다. 금융,
          개인정보, 토큰 원문은 시작 화면에 노출하지 않습니다.
        </Text>
        <ProgressBar accessibilityLabel="launch progress" value={34} />
        <View style={styles.row}>
          <Text style={styles.meta}>{routeDelayMs / 1000}초 라우팅</Text>
          <Text style={styles.guard}>serverAuthority=true</Text>
        </View>
      </SurfaceCard>
      <Text style={styles.guard}>rawFinancialDataExposed=false</Text>
      <Text style={styles.guard}>rawPersonalDataExposed=false</Text>
      <Text style={styles.guard}>rawTokenExposed=false</Text>
      <Text style={styles.guard}>adsFinancialTargetingUsed=false</Text>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  body: {
    color: componentColors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  guard: {
    color: componentColors.textSecondary,
    fontSize: 11,
    fontWeight: "800",
  },
  meta: {
    color: componentColors.primaryGreenDark,
    flex: 1,
    fontSize: 12,
    fontWeight: "900",
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  title: {
    color: componentColors.textPrimary,
    fontSize: 23,
    fontWeight: "900",
    lineHeight: 30,
  },
});
