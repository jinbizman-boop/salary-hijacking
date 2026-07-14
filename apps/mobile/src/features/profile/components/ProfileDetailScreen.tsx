import { StyleSheet, Text, View } from "react-native";

import {
  AppHeader,
  AppShell,
  PrimaryButton,
  ProgressBar,
  SurfaceCard,
  componentColors,
} from "../../../shared/components";
import { ProfileHeader } from "./ProfileHeader";
import { ProfileStatGrid } from "./ProfileStatGrid";

export type ProfileDetailVariant =
  | "settings"
  | "account"
  | "community"
  | "level"
  | "notices"
  | "support";

type ProfileDetailContent = Readonly<{
  title: string;
  subtitle: string;
  endpoint: string;
  description: string;
  rows: readonly string[];
  actionLabel: string;
}>;

const contentByVariant: Record<ProfileDetailVariant, ProfileDetailContent> = {
  account: {
    actionLabel: "계정 보안 확인",
    description:
      "세션, MFA, 알림 동의, 계정 탈퇴 요청을 서버 기록 기준으로 확인합니다.",
    endpoint: "/api/v1/users/me/account",
    rows: [
      "활성 세션은 토큰 원문 없이 기기 종류와 최근 사용 시각만 표시",
      "탈퇴는 즉시 삭제가 아니라 /api/v1/users/me/withdrawal-requests 요청으로 접수",
      "임시 토큰과 인증 토큰은 화면, 로그, 알림 payload에 노출하지 않음",
    ],
    subtitle: "계정",
    title: "계정 설정",
  },
  community: {
    actionLabel: "내 활동 새로고침",
    description:
      "내 게시글과 댓글은 서버 커뮤니티 API에서 안전 필드만 내려받아 보여줍니다.",
    endpoint: "/api/v1/community/users/me/posts",
    rows: [
      "게시글 원문에 계좌, 연락처, 급여 금액이 있으면 서버 검수에서 숨김",
      "신고, 삭제, 수정 액션은 커뮤니티 RBAC와 감사 로그 경계를 따름",
      "광고와 파트너 추천에는 게시글 원문 금융정보를 사용하지 않음",
    ],
    subtitle: "커뮤니티",
    title: "내 커뮤니티",
  },
  level: {
    actionLabel: "LV UP 기록 확인",
    description:
      "레벨, XP, 미션 완료 여부는 서버 권위 성장 기록으로 계산합니다.",
    endpoint: "/api/v1/growth/users/me/level-progress",
    rows: [
      "중복 완료는 서버 idempotency key와 일일 XP cap으로 차단",
      "독서, 뉴스, 영어, 건강 미션은 추천과 안전 기준을 통과한 항목만 표시",
      "민감한 금융 데이터는 성장 추천이나 광고 타겟팅에 사용하지 않음",
    ],
    subtitle: "LV UP",
    title: "내 레벨",
  },
  notices: {
    actionLabel: "공지 확인",
    description:
      "서비스 공지와 계정 알림은 민감한 급여, 계좌 원문 없이 요약 정보만 표시합니다.",
    endpoint: "/api/v1/users/me/notices",
    rows: [
      "공지 payload에는 계좌, 카드, 급여, 토큰 원문을 포함하지 않음",
      "중요 공지는 서버 수신 확인 후 읽음 상태를 변경",
      "마케팅성 메시지는 동의 상태를 별도로 확인",
    ],
    subtitle: "공지",
    title: "공지 사항",
  },
  settings: {
    actionLabel: "프로필 저장",
    description:
      "닉네임, 커뮤니티 표시명, 레벨 타이틀은 개인정보 원문과 분리해 관리합니다.",
    endpoint: "/api/v1/users/me/profile-settings",
    rows: [
      "이메일과 전화번호는 마스킹된 표시값만 노출",
      "커뮤니티 표시명은 raw personal data 없이 별도 필드로 저장",
      "금융 금액은 프로필 광고나 파트너 타겟팅에 사용하지 않음",
    ],
    subtitle: "프로필",
    title: "프로필 설정",
  },
  support: {
    actionLabel: "문의 작성",
    description:
      "1:1 문의와 첨부는 본문을 검열한 뒤 지원 티켓 API로 접수합니다.",
    endpoint: "/api/v1/support/tickets",
    rows: [
      "문의 본문에서 계좌, 카드, 토큰, 주민번호 형태를 사전 차단",
      "지원 답변 알림에는 티켓 번호와 상태만 포함",
      "운영자 열람은 사유, RBAC, 감사 로그가 있는 경계에서만 허용",
    ],
    subtitle: "고객지원",
    title: "고객지원",
  },
};

export type ProfileDetailScreenProps = Readonly<{
  variant: ProfileDetailVariant;
}>;

export function ProfileDetailScreen({
  variant,
}: ProfileDetailScreenProps): React.ReactElement {
  const content = contentByVariant[variant];

  return (
    <AppShell
      accessibilityLabel={`급여납치 프로필 ${variant}`}
      header={<AppHeader subtitle={content.subtitle} title={content.title} />}
    >
      <ProfileHeader
        avatarEmoji="SH"
        displayName="급여지킴이"
        levelTitle="LV 7 예산 빌더"
        maskedEmail="sa***@example.com"
        rawPersonalDataExposed={false}
      />

      {variant === "level" ? (
        <ProfileStatGrid
          stats={{
            currentLevel: 7,
            levelXp: 1240,
            nextLevelXp: 1600,
            selfCareScore: 82,
            totalHijackSaved: 420000,
          }}
        />
      ) : null}

      <SurfaceCard accessibilityLabel={`${content.title} 상세`}>
        <Text style={styles.endpoint}>{content.endpoint}</Text>
        <Text style={styles.description}>{content.description}</Text>
        <View style={styles.rows}>
          {content.rows.map((row) => (
            <View key={row} style={styles.row}>
              <Text style={styles.bullet}>-</Text>
              <Text style={styles.rowText}>{row}</Text>
            </View>
          ))}
        </View>
        <PrimaryButton
          accessibilityLabel={content.actionLabel}
          label={content.actionLabel}
          onPress={() => undefined}
        />
      </SurfaceCard>

      {variant === "level" ? (
        <SurfaceCard accessibilityLabel="레벨 진행 상세">
          <Text style={styles.cardTitle}>이번 주 XP 진행</Text>
          <ProgressBar accessibilityLabel="주간 XP 진행률" value={78} />
          <Text style={styles.guard}>서버 기준으로 반영돼요</Text>
        </SurfaceCard>
      ) : null}

      <Text style={styles.guard}>
        프로필 변경은 서버 기록 기준으로 관리돼요
      </Text>
      <Text style={styles.guard}>금융 원문은 광고 추천에 사용하지 않아요</Text>
    </AppShell>
  );
}

export function profileDetailEndpoint(variant: ProfileDetailVariant): string {
  return contentByVariant[variant].endpoint;
}

const styles = StyleSheet.create({
  bullet: {
    color: componentColors.primaryGreenDark,
    fontSize: 14,
    fontWeight: "900",
  },
  cardTitle: {
    color: componentColors.textPrimary,
    fontSize: 16,
    fontWeight: "900",
  },
  description: {
    color: componentColors.textPrimary,
    fontSize: 15,
    lineHeight: 22,
  },
  endpoint: {
    color: componentColors.textSecondary,
    fontSize: 11,
    fontWeight: "800",
  },
  guard: {
    color: componentColors.textSecondary,
    fontSize: 11,
    fontWeight: "800",
  },
  row: {
    flexDirection: "row",
    gap: 8,
  },
  rowText: {
    flex: 1,
    color: componentColors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  rows: {
    gap: 8,
  },
});
