import { StyleSheet, Text, View } from "react-native";

import {
  AppHeader,
  AppShell,
  PrimaryButton,
  ProgressBar,
  SurfaceCard,
  componentColors,
} from "../../shared/components";

export type CapturePreviewKind =
  | "salary"
  | "plan"
  | "level"
  | "notifications"
  | "community"
  | "profile"
  | "login"
  | "splash"
  | "signup"
  | "community-write"
  | "profile-level"
  | "reading"
  | "news"
  | "english"
  | "health";

type CaptureContent = Readonly<{
  title: string;
  subtitle: string;
  body: string;
  primary: string;
  secondary: string;
  value: number;
}>;

const contentByKind: Record<CapturePreviewKind, CaptureContent> = {
  community: {
    body: "자유, 레벨 인증, 루틴 공유를 민감정보 없이 탐색합니다.",
    primary: "인기 글",
    secondary: "문맥형 광고만 허용",
    subtitle: "Community",
    title: "커뮤니티",
    value: 62,
  },
  "community-write": {
    body: "계좌, 연락처, 급여 원문을 차단하고 게시 요청을 서버로 보냅니다.",
    primary: "글 작성",
    secondary: "검열 후 게시",
    subtitle: "Community",
    title: "글쓰기",
    value: 44,
  },
  english: {
    body: "출처가 있는 짧은 영어 표현을 듣고 따라 말합니다.",
    primary: "5문장",
    secondary: "XP 30",
    subtitle: "LV UP",
    title: "영어",
    value: 50,
  },
  health: {
    body: "초보자 안전 범위의 스트레칭 루틴만 안내합니다.",
    primary: "10분",
    secondary: "안전 레벨 확인",
    subtitle: "LV UP",
    title: "건강",
    value: 58,
  },
  level: {
    body: "독서, 뉴스, 영어, 건강 미션과 XP를 서버 기준으로 확인합니다.",
    primary: "오늘의 미션",
    secondary: "일일 XP cap 적용",
    subtitle: "LV UP",
    title: "레벨업",
    value: 78,
  },
  login: {
    body: "이메일, OAuth, MFA 경계를 통과해 서버 세션을 확인합니다.",
    primary: "로그인",
    secondary: "토큰 원문 미노출",
    subtitle: "Auth",
    title: "로그인",
    value: 35,
  },
  news: {
    body: "서로 다른 관점의 뉴스를 비교하고 요약만 기록합니다.",
    primary: "균형 뉴스",
    secondary: "출처 확인",
    subtitle: "LV UP",
    title: "뉴스",
    value: 54,
  },
  notifications: {
    body: "급여/계좌/토큰 원문 없이 알림 상태와 동의만 표시합니다.",
    primary: "알림함",
    secondary: "푸시 payload 안전",
    subtitle: "Inbox",
    title: "알림",
    value: 40,
  },
  plan: {
    body: "예산과 자동 저축 목표는 서버 계산 결과만 표시합니다.",
    primary: "계획",
    secondary: "KRW 정수",
    subtitle: "Plan",
    title: "계획",
    value: 68,
  },
  profile: {
    body: "프로필, 계정, 고객지원, 내 활동으로 이동합니다.",
    primary: "MY",
    secondary: "개인정보 마스킹",
    subtitle: "Profile",
    title: "마이페이지",
    value: 72,
  },
  "profile-level": {
    body: "내 레벨과 XP, 주간 미션 진행도를 서버 기록으로 표시합니다.",
    primary: "LV 7",
    secondary: "1240 / 1600 XP",
    subtitle: "Profile",
    title: "내 레벨",
    value: 78,
  },
  reading: {
    body: "원문 전문 저장 없이 독서 미션, 요약, 기록 질문만 제공합니다.",
    primary: "독서",
    secondary: "출처/저작권 확인",
    subtitle: "LV UP",
    title: "독서",
    value: 47,
  },
  salary: {
    body: "급여, 예산, 지출, 저축 계산은 서버 권한 결과만 보여줍니다.",
    primary: "이번 달",
    secondary: "민감 금액 광고 미사용",
    subtitle: "Salary",
    title: "급여 홈",
    value: 84,
  },
  signup: {
    body: "약관, 개인정보 동의, 이메일 확인을 서버 상태와 맞춥니다.",
    primary: "회원가입",
    secondary: "동의 기록 보존",
    subtitle: "Auth",
    title: "가입",
    value: 30,
  },
  splash: {
    body: "서버 세션 상태를 확인하고 로그인 또는 급여 홈으로 이동합니다.",
    primary: "SALARY HIJACKING",
    secondary: "1.2초 라우팅",
    subtitle: "Launch",
    title: "시작",
    value: 24,
  },
};

export type CapturePreviewScreenProps = Readonly<{
  kind: CapturePreviewKind;
}>;

export function CapturePreviewScreen({
  kind,
}: CapturePreviewScreenProps): React.ReactElement {
  const content = contentByKind[kind];

  return (
    <AppShell
      accessibilityLabel={`Salary Hijacking capture ${kind}`}
      header={<AppHeader subtitle={content.subtitle} title={content.title} />}
    >
      <SurfaceCard accessibilityLabel={`${content.title} preview`}>
        <Text style={styles.kicker}>{content.primary}</Text>
        <Text style={styles.body}>{content.body}</Text>
        <ProgressBar
          accessibilityLabel={`${content.title} progress`}
          value={content.value}
        />
        <View style={styles.metaRow}>
          <Text style={styles.meta}>{content.secondary}</Text>
          <Text style={styles.guard}>rawSensitiveDataExposed=false</Text>
        </View>
      </SurfaceCard>
      <PrimaryButton
        accessibilityLabel={`${content.title} primary action`}
        label={content.primary}
        onPress={() => undefined}
      />
      <Text style={styles.guard}>serverAuthority=true</Text>
      <Text style={styles.guard}>adsFinancialTargetingUsed=false</Text>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  body: {
    color: componentColors.textPrimary,
    fontSize: 16,
    lineHeight: 24,
  },
  guard: {
    color: componentColors.textSecondary,
    fontSize: 11,
    fontWeight: "800",
  },
  kicker: {
    color: componentColors.primaryGreenDark,
    fontSize: 13,
    fontWeight: "900",
  },
  meta: {
    color: componentColors.textSecondary,
    flex: 1,
    fontSize: 12,
    fontWeight: "800",
  },
  metaRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
});
