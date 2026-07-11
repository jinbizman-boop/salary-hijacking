import { StyleSheet, Text, View } from "react-native";

import {
  PrimaryButton,
  SurfaceCard,
  componentColors,
  componentSpacing,
} from "../../../shared/components";
import type { AuthSocialProvider } from "../types";

const SOCIAL_PROVIDERS: readonly AuthSocialProvider[] = [
  "KAKAO",
  "NAVER",
  "GOOGLE",
  "APPLE",
];

export type SocialLoginButtonsProps = Readonly<{
  onSelectProvider: (provider: AuthSocialProvider) => void;
}>;

export function SocialLoginButtons({
  onSelectProvider,
}: SocialLoginButtonsProps): React.ReactElement {
  return (
    <SurfaceCard accessibilityLabel="social-login-buttons">
      <Text style={styles.title}>소셜 로그인</Text>
      <View style={styles.grid}>
        {SOCIAL_PROVIDERS.map((provider) => (
          <PrimaryButton
            accessibilityLabel={`${provider} 소셜 로그인`}
            key={provider}
            label={provider}
            onPress={() => onSelectProvider(provider)}
            variant="secondary"
          />
        ))}
      </View>
      <Text style={styles.guard}>oauthTokenRendered=false</Text>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  title: {
    color: componentColors.textPrimary,
    fontSize: 18,
    fontWeight: "900",
  },
  grid: {
    gap: componentSpacing.sm,
  },
  guard: {
    color: componentColors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
});
