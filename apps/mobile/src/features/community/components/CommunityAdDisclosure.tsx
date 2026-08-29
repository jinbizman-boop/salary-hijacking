import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  isValidUrlString,
  parseMobileBaseUrlParts,
} from "../../../shared/api/url-validation";
import {
  componentColors,
  componentRadius,
  componentSpacing,
  salaryHijackingDesignSystem,
} from "../../../shared/components";
import type { CommunityAdDisclosureModel } from "../community.types";

const typography = salaryHijackingDesignSystem.typography;

export type CommunityAdDisclosureProps = Readonly<{
  model: CommunityAdDisclosureModel;
  onPress?: (model: CommunityAdDisclosureModel) => void;
}>;

function isSafeAdDestinationUrl(value: string): boolean {
  try {
    if (!isValidUrlString(value)) throw new Error("INVALID_URL");
    const urlParts = parseMobileBaseUrlParts(value);
    return urlParts?.protocol === "https:" && !urlParts.containsCredentials;
  } catch {
    return false;
  }
}

function isSafePressableAd(model: CommunityAdDisclosureModel): boolean {
  return (
    model.contextualOnly === true &&
    model.rawFinancialDataExposed === false &&
    model.rawPersonalDataExposed === false &&
    model.adsFinancialTargetingUsed === false &&
    isSafeAdDestinationUrl(model.destinationUrl)
  );
}

export function CommunityAdDisclosure({
  model,
  onPress,
}: CommunityAdDisclosureProps): React.ReactElement {
  const content = (
    <>
      <View style={styles.header}>
        <Text style={styles.label}>{model.label}</Text>
        <Text style={styles.context}>
          개인 금융정보를 사용하지 않은 문맥형 광고
        </Text>
      </View>
      <Text style={styles.title}>{model.title}</Text>
      <Text style={styles.description}>{model.description}</Text>
    </>
  );

  if (!onPress || !isSafePressableAd(model)) {
    return (
      <View
        accessibilityLabel={`${model.label} ${model.title}`}
        style={styles.container}
      >
        {content}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityLabel={`${model.label} ${model.title} 열기`}
      accessibilityRole="link"
      onPress={() => onPress(model)}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: componentSpacing.xs,
    padding: componentSpacing.sm,
    borderWidth: 1,
    borderColor: componentColors.line,
    borderRadius: componentRadius.card,
    backgroundColor: componentColors.surfaceSoft,
  },
  pressed: {
    opacity: 0.78,
  },
  header: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: componentSpacing.sm,
  },
  label: {
    color: componentColors.warningOrange,
    fontSize: typography.labelS.fontSize,
    fontWeight: typography.labelS.fontWeight,
  },
  context: {
    flexShrink: 1,
    color: componentColors.textSecondary,
    fontSize: typography.caption.fontSize,
  },
  title: {
    color: componentColors.textPrimary,
    fontSize: typography.labelL.fontSize,
    fontWeight: typography.labelL.fontWeight,
  },
  description: {
    color: componentColors.textSecondary,
    fontSize: typography.bodyS.fontSize,
    lineHeight: typography.bodyS.lineHeight,
  },
});
