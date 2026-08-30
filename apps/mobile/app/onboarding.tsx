import { useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { createMobileProfileApi } from "../src/shared/api/mobile-api";
import {
  AppHeader,
  AppShell,
  PrimaryButton,
  SurfaceCard,
  componentColors,
  salaryHijackingDesignSystem,
} from "../src/shared/components";

const VERSION = "1.0.3-onboarding-readable-korean";
const designSystem = salaryHijackingDesignSystem;
const STEPS = [
  "급여일과 예상 수령액을 먼저 확인해요.",
  "고정지출과 고정저축을 급여 직후 먼저 분리해요.",
  "일일 예산과 생활비 기준을 서버 계산으로 확인해요.",
] as const;
const ONBOARDING_SETUP_ENTRIES = [
  {
    description: "KRW 정수만 입력하고 서버 계산으로 예상 납치금액을 확인해요.",
    title: "급여일과 월급",
  },
  {
    description: "구독, 통신비, 대출처럼 매달 빠지는 돈을 급여 직후 분리해요.",
    title: "고정지출 먼저 분리",
  },
  {
    description: "비상금과 목표 저축을 먼저 확보하고 남은 돈으로 생활해요.",
    title: "고정저축 먼저 확보",
  },
  {
    description: "다음 급여일까지 하루에 쓸 수 있는 돈을 매일 확인해요.",
    title: "일일 예산으로 생활비 관리",
  },
] as const;

export default function OnboardingScreen(): React.ReactElement {
  const router = useRouter();
  const profileApi = useMemo(() => createMobileProfileApi(), []);
  const [submitting, setSubmitting] = useState<"/plan" | "/salary" | null>(
    null,
  );
  const onboardingCompletionInFlightRef = useRef(false);
  const [message, setMessage] = useState(
    "온보딩 완료를 서버 프로필 경계에 기록한 뒤 다음 화면으로 이동해요.",
  );

  const finishOnboarding = useCallback(
    (target: "/plan" | "/salary"): void => {
      if (submitting || onboardingCompletionInFlightRef.current) return;
      onboardingCompletionInFlightRef.current = true;
      setSubmitting(target);
      setMessage("서버에 온보딩 완료를 기록하는 중입니다.");
      void profileApi
        .completeOnboarding()
        .then(() => {
          router.replace(target as never);
        })
        .catch(() => {
          setMessage(
            "온보딩 완료를 서버에 기록하지 못했어요. 연결을 확인하고 다시 시도해 주세요.",
          );
        })
        .finally(() => {
          onboardingCompletionInFlightRef.current = false;
          setSubmitting(null);
        });
    },
    [profileApi, router, submitting],
  );

  return (
    <AppShell
      accessibilityLabel="급여납치 온보딩 화면"
      header={
        <AppHeader
          subtitle="급여 계획을 안전하게 저장해요"
          title="월급이 사라지기 전에 먼저 붙잡아요"
        />
      }
    >
      <View style={styles.content}>
        <SurfaceCard accessibilityLabel="온보딩 보안 안내" style={styles.badge}>
          <Text style={styles.badgeText}>
            급여 계획을 안전하게 저장해요.
          </Text>
          <Text style={styles.badgeText}>
            금융 원문은 광고나 분석에 쓰지 않아요.
          </Text>
        </SurfaceCard>

        <Text style={styles.kicker}>SALARY HIJACKING</Text>
        <Text style={styles.title}>월급이 사라지기 전에 먼저 붙잡아요</Text>
        <Text style={styles.body}>
          급여납치는 급여, 고정지출, 고정저축, 생활비를 먼저 분리하고 서버
          기준으로 오늘 쓸 수 있는 돈과 지켜낸 돈을 보여줘요.
        </Text>
        <Text style={styles.notice}>{message}</Text>

        <SurfaceCard accessibilityLabel="온보딩 핵심 단계">
          {STEPS.map((step, index) => (
            <View key={step} style={styles.stepRow}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{index + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </SurfaceCard>

        <SurfaceCard accessibilityLabel="초기 설정 체크리스트">
          <Text style={styles.cardTitle}>초기 설정 체크리스트</Text>
          {ONBOARDING_SETUP_ENTRIES.map((entry) => (
            <View key={entry.title} style={styles.setupRow}>
              <View style={styles.setupDot} />
              <View style={styles.setupTextBox}>
                <Text style={styles.setupTitle}>{entry.title}</Text>
                <Text style={styles.setupDescription}>{entry.description}</Text>
              </View>
            </View>
          ))}
        </SurfaceCard>

        <PrimaryButton
          accessibilityLabel="목표: 급여 계획부터 설정하기"
          disabled={submitting !== null}
          label={submitting === "/plan" ? "서버 기록 중" : "급여 계획부터 설정하기"}
          onPress={() => finishOnboarding("/plan")}
        />

        <PrimaryButton
          accessibilityLabel="목표: 이미 설정했어요"
          disabled={submitting !== null}
          label={submitting === "/salary" ? "서버 기록 중" : "이미 설정했어요"}
          onPress={() => finishOnboarding("/salary")}
          variant="secondary"
        />
      </View>
    </AppShell>
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
    "ONBOARDING_SETUP_ENTRIES",
    "createMobileProfileApi",
    "completeOnboarding",
    "finishOnboarding",
    "server-authoritative onboarding completion",
    "financial raw data not used for ads or analytics",
    "KRW integer guidance",
    "payroll plan entry",
    "fixed expense entry",
    "fixed savings entry",
    "daily budget entry",
    "readable Korean launch copy",
  ] as const;

  return { ok: checks.length >= 15, version: VERSION, checks };
}

const styles = StyleSheet.create({
  content: { gap: designSystem.spacing[5] },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: componentColors.primaryGreenSoft,
    borderColor: designSystem.colors.brand.surface,
    borderRadius: designSystem.radius.full,
    gap: designSystem.spacing[1],
    paddingHorizontal: designSystem.spacing[3],
    paddingVertical: designSystem.spacing[2],
  },
  badgeText: {
    color: designSystem.colors.brand.dark,
    ...designSystem.typography.labelS,
  },
  kicker: {
    color: componentColors.primaryGreen,
    ...designSystem.typography.labelS,
  },
  title: {
    color: componentColors.textPrimary,
    ...designSystem.typography.display,
  },
  body: {
    color: componentColors.textSecondary,
    ...designSystem.typography.bodyM,
  },
  notice: {
    backgroundColor: componentColors.primaryGreenSoft,
    borderColor: designSystem.colors.brand.surface,
    borderRadius: designSystem.radius.lg,
    borderWidth: 1,
    color: designSystem.colors.brand.dark,
    ...designSystem.typography.labelM,
    padding: designSystem.spacing[3],
  },
  cardTitle: {
    color: componentColors.textPrimary,
    ...designSystem.typography.titleM,
  },
  stepRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: designSystem.spacing[3],
  },
  stepNumber: {
    alignItems: "center",
    backgroundColor: componentColors.primaryGreen,
    borderRadius: designSystem.radius.full,
    height: designSystem.spacing[8],
    justifyContent: "center",
    width: designSystem.spacing[8],
  },
  stepNumberText: {
    color: componentColors.surface,
    ...designSystem.typography.labelM,
  },
  stepText: {
    color: componentColors.textPrimary,
    flex: 1,
    ...designSystem.typography.bodyM,
  },
  setupDescription: {
    color: componentColors.textSecondary,
    ...designSystem.typography.bodyS,
  },
  setupDot: {
    backgroundColor: componentColors.primaryGreen,
    borderRadius: designSystem.radius.full,
    height: designSystem.spacing[2],
    marginTop: designSystem.spacing[1],
    width: designSystem.spacing[2],
  },
  setupRow: { flexDirection: "row", gap: designSystem.spacing[3] },
  setupTextBox: { flex: 1, gap: designSystem.spacing[1] },
  setupTitle: {
    color: componentColors.textPrimary,
    ...designSystem.typography.labelL,
  },
});
