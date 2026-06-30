import { StyleSheet, Text, View } from "react-native";

import type {
  CommunityValidationIssue,
  ModerationStatus,
} from "../community.types";

export type CommunityModerationBannerProps = Readonly<{
  status: ModerationStatus;
  issues?: readonly CommunityValidationIssue[];
}>;

const COPY: Readonly<Record<ModerationStatus, string>> = {
  SAFE: "커뮤니티 공개 기준을 통과했습니다.",
  REVIEW: "서버 검토 후 공개 상태가 결정됩니다.",
  BLOCKED: "공개할 수 없는 내용이 포함되어 있습니다.",
  HIDDEN: "운영 정책에 따라 숨김 처리되었습니다.",
  DELETED: "삭제된 콘텐츠입니다.",
};

export function CommunityModerationBanner({
  status,
  issues = [],
}: CommunityModerationBannerProps): React.ReactElement {
  const critical =
    status === "BLOCKED" || status === "HIDDEN" || status === "DELETED";
  return (
    <View
      accessibilityRole={critical ? "alert" : "text"}
      style={[
        styles.container,
        critical ? styles.critical : styles.informational,
      ]}
    >
      <Text style={[styles.title, critical && styles.criticalText]}>
        {COPY[status]}
      </Text>
      {issues.map((issue, index) => (
        <Text
          key={`${issue.code}:${issue.field}:${index}`}
          style={[styles.issue, critical && styles.criticalText]}
        >
          {issue.message}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
    padding: 12,
    borderRadius: 8,
  },
  informational: {
    backgroundColor: "#EDF7F4",
  },
  critical: {
    backgroundColor: "#FFF1F1",
  },
  title: {
    color: "#155E52",
    fontSize: 13,
    fontWeight: "700",
  },
  issue: {
    color: "#355F57",
    fontSize: 12,
    lineHeight: 18,
  },
  criticalText: {
    color: "#9B1C1C",
  },
});
