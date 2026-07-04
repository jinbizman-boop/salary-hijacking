import { Pressable, StyleSheet, Text, View } from "react-native";

import type { CommunityAdDisclosureModel } from "../community.types";

export type CommunityAdDisclosureProps = Readonly<{
  model: CommunityAdDisclosureModel;
  onPress?: (model: CommunityAdDisclosureModel) => void;
}>;

function isSafeAdDestinationUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" && url.username === "" && url.password === ""
    );
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
    gap: 6,
    padding: 14,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
  },
  pressed: {
    opacity: 0.78,
  },
  header: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  label: {
    color: "#713F12",
    fontSize: 12,
    fontWeight: "800",
  },
  context: {
    flexShrink: 1,
    color: "#6B7280",
    fontSize: 11,
  },
  title: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "700",
  },
  description: {
    color: "#4B5563",
    fontSize: 13,
    lineHeight: 19,
  },
});
