import { useState } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";

import {
  AppHeader,
  AppShell,
  PrimaryButton,
  SurfaceCard,
  componentColors,
  salaryHijackingDesignSystem,
} from "../../../shared/components";
import type { NotificationPreferenceState } from "../controller";

const designSystem = salaryHijackingDesignSystem;

export type NotificationSettingsScreenProps = Readonly<{
  notificationDeviceCount?: number | undefined;
  notificationDeviceMessage?: string | undefined;
  notificationDeviceStatus?:
    | "denied"
    | "error"
    | "idle"
    | "registered"
    | "registering"
    | undefined;
  onBack?: (() => void) | undefined;
  onOpenSystemSettings?: (() => void) | undefined;
  onPreferencesChange?:
    | ((preferences: NotificationPreferenceState) => void)
    | undefined;
  onRegisterDevice?: (() => Promise<void> | void) | undefined;
  onSavePreferences?:
    | ((preferences: NotificationPreferenceState) => Promise<void> | void)
    | undefined;
  preferences?: NotificationPreferenceState | undefined;
}>;

type PreferenceKey =
  | "push"
  | "salary"
  | "budget"
  | "level"
  | "community"
  | "marketing"
  | "quietHours";

const initialPreferences: Record<PreferenceKey, boolean> = {
  budget: true,
  community: true,
  level: true,
  marketing: false,
  push: true,
  quietHours: true,
  salary: true,
};

export function NotificationSettingsScreen({
  notificationDeviceCount = 0,
  notificationDeviceMessage,
  notificationDeviceStatus = "idle",
  onBack,
  onOpenSystemSettings,
  onPreferencesChange,
  onRegisterDevice,
  onSavePreferences,
  preferences: serverPreferences,
}: NotificationSettingsScreenProps): React.ReactElement {
  const [localPreferences, setLocalPreferences] =
    useState<Record<PreferenceKey, boolean>>(initialPreferences);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const preferences = serverPreferences ?? localPreferences;

  function toggle(key: PreferenceKey): void {
    const nextPreferences = { ...preferences, [key]: !preferences[key] };
    if (onPreferencesChange) {
      onPreferencesChange(nextPreferences);
    } else {
      setLocalPreferences(nextPreferences);
    }
    setStatus("idle");
  }

  async function save(): Promise<void> {
    setStatus("saving");
    try {
      if (onSavePreferences) {
        await onSavePreferences(preferences);
      } else {
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 80);
        });
      }
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }

  return (
    <AppShell
      accessibilityLabel="급여납치 알림 설정 독립 화면"
      header={
        <AppHeader
          rightAccessory={
            onBack ? (
              <Pressable
                accessibilityLabel="알림 화면으로 돌아가기"
                accessibilityRole="button"
                hitSlop={designSystem.spacing[3]}
                onPress={onBack}
                style={({ pressed }) => [
                  styles.headerAction,
                  pressed && styles.pressed,
                ]}
              >
                <Text allowFontScaling={false} style={styles.headerActionText}>
                  뒤로
                </Text>
              </Pressable>
            ) : null
          }
          subtitle="푸시/급여/LV/커뮤니티"
          title="알림 설정"
        />
      }
    >
      <View testID="notification-settings-standalone-screen">
        <SurfaceCard accessibilityLabel="알림 설정 요약">
          <Text allowFontScaling={false} style={styles.summaryTitle}>
            필요한 알림만 안전하게 받을게요
          </Text>
          <Text style={styles.summaryText}>
            급여, 예산, LV UP, 커뮤니티 알림을 직접 켜고 끌 수 있습니다. 푸시
            토큰과 민감 금융 원문은 화면에 표시하지 않습니다.
          </Text>
        </SurfaceCard>

        <SurfaceCard accessibilityLabel="알림 수신 항목">
          <PreferenceRow
            description="앱 밖에서도 중요한 알림을 받습니다."
            enabled={preferences.push}
            label="푸시 알림"
            onToggle={() => toggle("push")}
          />
          <PreferenceRow
            description="급여일, 누적 납치금액, 목표 달성 알림"
            enabled={preferences.salary}
            label="급여/납치금액"
            onToggle={() => toggle("salary")}
          />
          <PreferenceRow
            description="일일 예산 임박, 예산 초과, 사용 예정 알림"
            enabled={preferences.budget}
            label="예산/지출"
            onToggle={() => toggle("budget")}
          />
          <PreferenceRow
            description="독서, 뉴스, 영어, 건강 미션과 XP 알림"
            enabled={preferences.level}
            label="LV UP"
            onToggle={() => toggle("level")}
          />
          <PreferenceRow
            description="댓글, 좋아요, 신고 처리, 공지 알림"
            enabled={preferences.community}
            label="커뮤니티"
            onToggle={() => toggle("community")}
          />
          <PreferenceRow
            description="이벤트와 제휴 혜택. 금융 원문 기반 타겟팅은 금지합니다."
            enabled={preferences.marketing}
            label="이벤트 마케팅"
            onToggle={() => toggle("marketing")}
          />
          <PreferenceRow
            description="밤 시간대에는 긴급하지 않은 알림을 조용하게 합니다."
            enabled={preferences.quietHours}
            label="방해 금지 시간"
            onToggle={() => toggle("quietHours")}
          />
        </SurfaceCard>

        <SurfaceCard accessibilityLabel="푸시 기기">
          <Text allowFontScaling={false} style={styles.summaryTitle}>
            푸시 기기
          </Text>
          <Text style={styles.summaryText}>
            {notificationDeviceCount > 0
              ? `등록된 기기 ${notificationDeviceCount}대`
              : "기기 등록 전에는 원문 푸시 토큰을 보관하지 않아요."}
          </Text>
          <Text accessibilityLiveRegion="polite" style={styles.deviceStatus}>
            {notificationDeviceMessage ??
              notificationDeviceStatusMessage(notificationDeviceStatus)}
          </Text>
          <PrimaryButton
            accessibilityLabel={
              notificationDeviceCount > 0
                ? "푸시 기기 다시 등록"
                : "푸시 기기 등록"
            }
            disabled={
              notificationDeviceStatus === "registering" || !onRegisterDevice
            }
            label={
              notificationDeviceStatus === "registering"
                ? "등록 중"
                : notificationDeviceCount > 0
                  ? "다시 등록"
                  : "기기 등록"
            }
            onPress={() => {
              void onRegisterDevice?.();
            }}
            variant={notificationDeviceCount > 0 ? "secondary" : "primary"}
          />
        </SurfaceCard>

        <View style={styles.actionStack}>
          <PrimaryButton
            accessibilityLabel="알림 설정 저장"
            disabled={status === "saving"}
            label={status === "saving" ? "저장 중" : "저장"}
            onPress={() => {
              void save();
            }}
          />

          {status === "saved" ? (
            <Text accessibilityLiveRegion="polite" style={styles.savedText}>
              알림 설정을 저장했습니다.
            </Text>
          ) : null}
          {status === "error" ? (
            <Text accessibilityLiveRegion="polite" style={styles.errorText}>
              저장하지 못했습니다. 네트워크 상태를 확인하고 다시 시도해 주세요.
            </Text>
          ) : null}

          <Pressable
            accessibilityLabel="Android 시스템 알림 설정 열기"
            accessibilityRole="button"
            onPress={onOpenSystemSettings}
            style={({ pressed }) => [
              styles.systemButton,
              pressed && styles.pressed,
            ]}
          >
            <Text allowFontScaling={false} style={styles.systemButtonText}>
              시스템 알림 설정 열기
            </Text>
          </Pressable>
        </View>
      </View>
    </AppShell>
  );
}

function notificationDeviceStatusMessage(
  status: NonNullable<
    NotificationSettingsScreenProps["notificationDeviceStatus"]
  >,
): string {
  if (status === "registered") {
    return "서버에 푸시 기기 등록을 저장했어요.";
  }
  if (status === "denied") {
    return "알림 권한이 꺼져 있어요. 앱은 계속 사용할 수 있습니다.";
  }
  if (status === "error") {
    return "푸시 기기를 등록하지 못했어요. 잠시 후 다시 시도해 주세요.";
  }
  if (status === "registering") {
    return "푸시 기기 등록을 서버에 저장하고 있어요.";
  }
  return "알림을 켜면 이 기기에 안전하게 전송할 준비를 합니다.";
}

function PreferenceRow({
  description,
  enabled,
  label,
  onToggle,
}: Readonly<{
  description: string;
  enabled: boolean;
  label: string;
  onToggle: () => void;
}>): React.ReactElement {
  return (
    <View style={styles.preferenceRow}>
      <View style={styles.preferenceCopy}>
        <Text allowFontScaling={false} style={styles.preferenceLabel}>
          {label}
        </Text>
        <Text style={styles.preferenceDescription}>{description}</Text>
      </View>
      <Switch
        accessibilityLabel={`${label} ${enabled ? "켜짐" : "꺼짐"}`}
        onValueChange={onToggle}
        thumbColor={designSystem.colors.text.inverse}
        trackColor={{
          false: designSystem.colors.border.strong,
          true: designSystem.colors.brand.primary,
        }}
        value={enabled}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  actionStack: {
    gap: designSystem.spacing[3],
    paddingTop: designSystem.spacing[5],
  },
  errorText: {
    color: designSystem.colors.semantic.dangerStrong,
    textAlign: "center",
    ...designSystem.typography.labelM,
  },
  deviceStatus: {
    color: componentColors.textSecondary,
    ...designSystem.typography.caption,
  },
  headerAction: {
    alignItems: "center",
    backgroundColor: componentColors.primaryGreenSoft,
    borderRadius: designSystem.radius.md,
    justifyContent: "center",
    minHeight: designSystem.layout.touchTarget,
    minWidth: designSystem.layout.touchTarget + designSystem.spacing[4],
    paddingHorizontal: designSystem.spacing[3],
  },
  headerActionText: {
    color: componentColors.primaryGreen,
    ...designSystem.typography.labelM,
  },
  preferenceCopy: {
    flex: 1,
    gap: designSystem.spacing[1],
    minWidth: designSystem.spacing[0],
  },
  preferenceDescription: {
    color: componentColors.textSecondary,
    ...designSystem.typography.caption,
  },
  preferenceLabel: {
    color: componentColors.textPrimary,
    ...designSystem.typography.bodyL,
  },
  preferenceRow: {
    alignItems: "center",
    borderBottomColor: componentColors.line,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: designSystem.spacing[3],
    minHeight: designSystem.layout.touchTarget + designSystem.spacing[8],
    paddingVertical: designSystem.spacing[3],
  },
  pressed: {
    opacity: 0.82,
  },
  savedText: {
    color: componentColors.primaryGreen,
    textAlign: "center",
    ...designSystem.typography.labelM,
  },
  summaryText: {
    color: componentColors.textSecondary,
    ...designSystem.typography.bodyS,
  },
  summaryTitle: {
    color: componentColors.textPrimary,
    ...designSystem.typography.titleM,
  },
  systemButton: {
    alignItems: "center",
    backgroundColor: componentColors.surface,
    borderColor: componentColors.line,
    borderRadius: designSystem.radius.md,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: designSystem.layout.touchTarget + designSystem.spacing[2],
  },
  systemButtonText: {
    color: componentColors.textPrimary,
    ...designSystem.typography.labelM,
  },
});
