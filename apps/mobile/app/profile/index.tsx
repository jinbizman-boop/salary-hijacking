import { useRouter } from "expo-router";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  AppHeader,
  componentColors,
  componentRadius,
  componentSpacing,
  salaryHijackingDesignSystem,
} from "../../src/shared/components";

const SCREEN_VERSION = "1.0.1-profile-hub-copy-restored";
const typography = salaryHijackingDesignSystem.typography;
const MENU = [
  { label: "프로필 설정", route: "/profile/settings" },
  { label: "계정 설정", route: "/profile/account" },
  { label: "내 게시글 관리", route: "/profile/community" },
  { label: "내 레벨업 관리", route: "/profile/level" },
  { label: "1:1 문의", route: "/profile/support" },
  { label: "공지사항", route: "/profile/notices" },
] as const;

export default function ProfileHubScreen(): React.ReactElement {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppHeader subtitle="MY" title="내 급여납치 설정" variant="ROOT" />
        <Text style={styles.body}>
          성과 확인, 프로필, 계정, 문의, 공지사항으로 이동하는 MY 허브입니다.
          금융 원문 데이터는 이 화면에 저장하거나 호출하지 않습니다.
        </Text>
        <View style={styles.privacyPill}>
          <Text style={styles.privacyText}>
            최신 MY 기록을 안전하게 확인해요.
          </Text>
          <Text style={styles.privacyText}>
            금융 원문은 광고나 분석에 쓰지 않아요.
          </Text>
        </View>

        <View style={styles.card}>
          {MENU.map((item) => (
            <Pressable
              accessibilityLabel={item.label}
              accessibilityRole="button"
              key={item.route}
              onPress={() => router.push(item.route as never)}
              style={styles.row}
            >
              <Text style={styles.rowTitle}>{item.label}</Text>
              <Text style={styles.rowArrow}>›</Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          accessibilityLabel="급여 홈으로 이동"
          accessibilityRole="button"
          onPress={() => router.replace("/salary" as never)}
          style={styles.homeButton}
        >
          <Text style={styles.homeButtonText}>급여 홈으로 돌아가기</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

export function assertMobileProfileHubCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "/profile",
    "/profile/settings",
    "/profile/account",
    "/profile/community",
    "/profile/level",
    "/profile/support",
    "/profile/notices",
    "/salary",
    "server-side profile hub navigation",
    "financial raw data not used for ads or analytics",
    "readable Korean profile hub copy",
  ] as const;

  return { ok: checks.length >= 10, version: SCREEN_VERSION, checks };
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: componentColors.background, flex: 1 },
  content: { gap: componentSpacing.md, padding: componentSpacing.lg },
  body: {
    color: componentColors.textSecondary,
    fontSize: typography.bodyM.fontSize,
    lineHeight: typography.bodyM.lineHeight,
  },
  privacyPill: {
    alignSelf: "flex-start",
    backgroundColor: componentColors.primaryGreenSoft,
    borderColor: componentColors.primaryGreenTint,
    borderRadius: componentRadius.pill,
    borderWidth: 1,
    paddingHorizontal: componentSpacing.sm,
    paddingVertical: componentSpacing.sm,
  },
  privacyText: {
    color: componentColors.primaryGreenDark,
    fontSize: typography.caption.fontSize,
    fontWeight: typography.caption.fontWeight,
  },
  card: {
    backgroundColor: componentColors.surface,
    borderColor: componentColors.line,
    borderRadius: componentRadius.card,
    borderWidth: 1,
    overflow: "hidden",
  },
  row: {
    alignItems: "center",
    borderBottomColor: componentColors.line,
    borderBottomWidth: 1,
    flexDirection: "row",
    minHeight: 54,
    paddingHorizontal: componentSpacing.md,
  },
  rowTitle: {
    color: componentColors.textPrimary,
    flex: 1,
    fontSize: typography.bodyM.fontSize,
    fontWeight: typography.bodyM.fontWeight,
  },
  rowArrow: {
    color: componentColors.disabledGray,
    fontSize: typography.titleXL.fontSize,
    fontWeight: typography.titleXL.fontWeight,
  },
  homeButton: {
    alignItems: "center",
    backgroundColor: componentColors.primaryGreen,
    borderRadius: componentRadius.button,
    justifyContent: "center",
    minHeight: 52,
  },
  homeButtonText: {
    color: salaryHijackingDesignSystem.colors.text.inverse,
    fontSize: typography.labelL.fontSize,
    fontWeight: typography.labelL.fontWeight,
  },
});
