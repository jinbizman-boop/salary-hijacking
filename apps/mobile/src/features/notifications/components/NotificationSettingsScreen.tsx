import { useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { appIconAssets } from "../../../shared/assets/icons";
import type { NotificationPreferenceState } from "../controller";

const BRAND_GREEN = "#209252";
const TEXT_BLACK = "#191B1F";
const MUTED = "#6D737A";
const LINE = "#E7EBEF";
const SOFT_GREEN = "#EAF8EF";

export type NotificationSettingsScreenProps = Readonly<{
  onBack?: (() => void) | undefined;
  onOpenSystemSettings?: (() => void) | undefined;
  onPreferencesChange?:
    | ((preferences: NotificationPreferenceState) => void)
    | undefined;
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
  onBack,
  onOpenSystemSettings,
  onPreferencesChange,
  onSavePreferences,
  preferences: serverPreferences,
}: NotificationSettingsScreenProps): React.ReactElement {
  const insets = useOptionalSafeAreaInsets();
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(width, 430);
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
    <View style={styles.screen}>
      <View style={[styles.safeTop, { paddingTop: insets.top }]}>
        <View style={[styles.topBar, { width: contentWidth }]}>
          <Pressable
            accessibilityLabel="알림 화면으로 돌아가기"
            accessibilityRole="button"
            hitSlop={12}
            onPress={onBack}
            style={styles.headerButton}
          >
            <Image
              accessibilityIgnoresInvertColors
              resizeMode="contain"
              source={appIconAssets.common.left}
              style={styles.headerIcon}
            />
          </Pressable>
          <Text allowFontScaling={false} style={styles.headerTitle}>
            알림 설정
          </Text>
          <View style={styles.headerSpacer} />
        </View>
      </View>

      <ScrollView
        accessibilityLabel="급여납치 알림 설정 화면"
        bounces={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 28, width: contentWidth },
        ]}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.summaryCard}>
          <Text allowFontScaling={false} style={styles.summaryTitle}>
            필요한 알림만 안전하게 받을게요
          </Text>
          <Text style={styles.summaryText}>
            급여, 예산, LV UP, 커뮤니티 알림을 직접 켜고 끌 수 있습니다. 푸시
            토큰과 민감 금융 원문은 화면에 표시하지 않습니다.
          </Text>
        </View>

        <View style={styles.card}>
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
            description="이벤트와 제휴 혜택. 금융 원문 기반 타겟팅은 금지됩니다."
            enabled={preferences.marketing}
            label="이벤트/마케팅"
            onToggle={() => toggle("marketing")}
          />
          <PreferenceRow
            description="밤 시간대에는 긴급하지 않은 알림을 쉬게 합니다."
            enabled={preferences.quietHours}
            label="방해 금지 시간"
            onToggle={() => toggle("quietHours")}
          />
        </View>

        <Pressable
          accessibilityLabel="알림 설정 저장"
          accessibilityRole="button"
          onPress={() => {
            void save();
          }}
          style={styles.saveButton}
        >
          <Text allowFontScaling={false} style={styles.saveButtonText}>
            {status === "saving" ? "저장 중" : "저장"}
          </Text>
        </Pressable>

        {status === "saved" ? (
          <Text accessibilityLiveRegion="polite" style={styles.savedText}>
            알림 설정을 저장했습니다.
          </Text>
        ) : null}
        {status === "error" ? (
          <Text accessibilityLiveRegion="polite" style={styles.errorText}>
            저장하지 못했습니다. 네트워크 상태를 확인한 뒤 다시 시도해 주세요.
          </Text>
        ) : null}

        <Pressable
          accessibilityLabel="Android 시스템 알림 설정 열기"
          accessibilityRole="button"
          onPress={onOpenSystemSettings}
          style={styles.systemButton}
        >
          <Text allowFontScaling={false} style={styles.systemButtonText}>
            시스템 알림 설정 열기
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
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
        thumbColor="#FFFFFF"
        trackColor={{ false: "#D5DDD7", true: BRAND_GREEN }}
        value={enabled}
      />
    </View>
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
  card: {
    backgroundColor: "#FFFFFF",
    borderColor: LINE,
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  content: {
    alignSelf: "center",
    gap: 14,
    paddingHorizontal: 18,
    paddingTop: 14,
  },
  errorText: {
    color: "#BA1A1A",
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 19,
    textAlign: "center",
  },
  headerButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
    minWidth: 46,
  },
  headerIcon: {
    height: 25,
    tintColor: TEXT_BLACK,
    width: 25,
  },
  headerSpacer: {
    minWidth: 46,
  },
  headerTitle: {
    color: TEXT_BLACK,
    fontSize: 20,
    fontWeight: "900",
  },
  preferenceCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  preferenceDescription: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
  },
  preferenceLabel: {
    color: TEXT_BLACK,
    fontSize: 16,
    fontWeight: "900",
  },
  preferenceRow: {
    alignItems: "center",
    borderBottomColor: LINE,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 12,
    minHeight: 76,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  safeTop: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderBottomColor: LINE,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  saveButton: {
    alignItems: "center",
    backgroundColor: BRAND_GREEN,
    borderRadius: 13,
    justifyContent: "center",
    minHeight: 52,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  savedText: {
    color: BRAND_GREEN,
    fontSize: 13,
    fontWeight: "900",
    textAlign: "center",
  },
  screen: {
    backgroundColor: "#F7F9FF",
    flex: 1,
  },
  summaryCard: {
    backgroundColor: SOFT_GREEN,
    borderColor: "#D9F0E3",
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  summaryText: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 20,
  },
  summaryTitle: {
    color: TEXT_BLACK,
    fontSize: 18,
    fontWeight: "900",
  },
  systemButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: LINE,
    borderRadius: 13,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 50,
  },
  systemButtonText: {
    color: TEXT_BLACK,
    fontSize: 14,
    fontWeight: "900",
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 58,
    paddingHorizontal: 12,
  },
});
