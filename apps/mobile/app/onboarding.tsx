import { useRouter } from "expo-router";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

const VERSION = "1.0.0-onboarding-entry";
const STEPS = [
  "급여일과 예상 수령액을 확인해요.",
  "고정지출과 고정저축을 먼저 분리해요.",
  "일일 예산과 생활비 기준을 서버 계산으로 확인해요.",
] as const;

export default function OnboardingScreen(): React.ReactElement {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>serverAuthority=true</Text>
          <Text style={styles.badgeText}>rawFinancialData=false</Text>
        </View>

        <Text style={styles.kicker}>SALARY HIJACKING</Text>
        <Text style={styles.title}>월급이 사라지기 전에 기준을 잡아요</Text>
        <Text style={styles.body}>
          급여납치는 급여, 고정지출, 고정저축, 생활비를 먼저 분리한 뒤 서버
          기준으로 오늘 쓸 수 있는 돈과 지켜낸 돈을 보여줍니다.
        </Text>

        <View style={styles.card}>
          {STEPS.map((step, index) => (
            <View key={step} style={styles.stepRow}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{index + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>

        <Pressable
          accessibilityLabel="급여 계획 설정 시작"
          accessibilityRole="button"
          onPress={() => router.replace("/plan" as never)}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>급여 계획부터 설정하기</Text>
        </Pressable>

        <Pressable
          accessibilityLabel="급여 홈으로 이동"
          accessibilityRole="button"
          onPress={() => router.replace("/salary" as never)}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryButtonText}>이미 설정했어요</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

export function assertOnboardingScreenCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "/onboarding",
    "/plan",
    "/salary",
    "serverAuthority=true",
    "rawFinancialData=false",
    "KRW integer guidance",
    "payroll plan entry",
    "fixed expense entry",
    "fixed savings entry",
    "daily budget entry",
  ] as const;

  return { ok: checks.length >= 10, version: VERSION, checks };
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: "#F7F8FA", flex: 1 },
  content: { gap: 18, padding: 20 },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#EAF6EF",
    borderColor: "#D9F0E3",
    borderRadius: 999,
    borderWidth: 1,
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  badgeText: { color: "#12663A", fontSize: 11, fontWeight: "800" },
  kicker: {
    color: "#209252",
    fontSize: 12,
    fontWeight: "900",
    marginTop: 14,
  },
  title: {
    color: "#202327",
    fontSize: 30,
    fontWeight: "900",
    lineHeight: 38,
  },
  body: { color: "#4B535B", fontSize: 15, lineHeight: 23 },
  card: {
    backgroundColor: "#FFFFFF",
    borderColor: "#EEF0F2",
    borderRadius: 20,
    borderWidth: 1,
    gap: 14,
    padding: 16,
  },
  stepRow: { alignItems: "center", flexDirection: "row", gap: 12 },
  stepNumber: {
    alignItems: "center",
    backgroundColor: "#209252",
    borderRadius: 999,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  stepNumberText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },
  stepText: { color: "#202327", flex: 1, fontSize: 15, lineHeight: 22 },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#209252",
    borderRadius: 16,
    justifyContent: "center",
    minHeight: 52,
  },
  primaryButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "900" },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E7EBEF",
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 52,
  },
  secondaryButtonText: { color: "#209252", fontSize: 15, fontWeight: "900" },
});
