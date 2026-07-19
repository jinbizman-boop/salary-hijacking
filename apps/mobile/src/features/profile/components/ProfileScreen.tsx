import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text } from "react-native";

import { createMobileProfileApi } from "../../../shared/api/mobile-api";
import {
  AppHeader,
  AppShell,
  componentColors,
} from "../../../shared/components";
import type { ProfileApiClient, ProfileSnapshot } from "../types";
import { ProfileHeader } from "./ProfileHeader";
import { ProfileMenuCard, type ProfileMenuKey } from "./ProfileMenuCard";
import { ProfileStatGrid, type ProfileStats } from "./ProfileStatGrid";

export type ProfileScreenProps = Readonly<{
  onSelectMenu: (key: ProfileMenuKey) => void;
  profileApi?: Partial<Pick<ProfileApiClient, "getProfile">> | null;
}>;

const fallbackStats: ProfileStats = {
  currentLevel: 0,
  levelXp: 0,
  nextLevelXp: 1000,
  selfCareScore: 0,
  totalHijackSaved: 0,
};

export function ProfileScreen({
  onSelectMenu,
  profileApi,
}: ProfileScreenProps): React.ReactElement {
  const [snapshot, setSnapshot] = useState<ProfileSnapshot | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const serverProfileApi = useMemo(
    () =>
      profileApi ??
      (process.env.JEST_WORKER_ID ? null : createMobileProfileApi()),
    [profileApi],
  );

  useEffect(() => {
    let mounted = true;
    if (serverProfileApi?.getProfile === undefined) return undefined;
    void serverProfileApi
      .getProfile()
      .then((nextSnapshot) => {
        if (!mounted) return;
        setSnapshot(nextSnapshot);
        setLoadFailed(false);
      })
      .catch(() => {
        if (mounted) setLoadFailed(true);
      });
    return () => {
      mounted = false;
    };
  }, [serverProfileApi]);

  const stats = profileStatsFromSnapshot(snapshot);
  const user = snapshot?.user;

  return (
    <AppShell
      accessibilityLabel="Salary Hijacking profile tab"
      header={
        <AppHeader
          brandLabel="SALARY HIJACKING"
          subtitle="MY"
          title="마이페이지"
        />
      }
    >
      {loadFailed ? (
        <Text accessibilityRole="alert" style={styles.errorText}>
          서버 프로필을 불러오지 못해 안전한 기본 화면을 표시합니다.
        </Text>
      ) : null}
      <ProfileHeader
        avatarEmoji={user?.avatarEmoji ?? "SH"}
        displayName={user?.nickname ?? "급여납치 사용자"}
        levelTitle={user?.title ?? `급여지킴이 ${stats.currentLevel}Lv`}
        maskedEmail="개인정보와 금융 원문은 숨김 처리됩니다."
        rawPersonalDataExposed={false}
      />
      <ProfileStatGrid stats={stats} />
      <ProfileMenuCard onSelect={onSelectMenu} />
    </AppShell>
  );
}

function profileStatsFromSnapshot(
  snapshot: ProfileSnapshot | null,
): ProfileStats {
  if (!snapshot) return fallbackStats;
  return {
    currentLevel: snapshot.summary.currentLevel,
    levelXp: snapshot.summary.levelXp,
    nextLevelXp: snapshot.summary.nextLevelXp,
    selfCareScore: snapshot.summary.selfCareScore,
    totalHijackSaved: snapshot.summary.totalHijackSaved,
  };
}

const styles = StyleSheet.create({
  errorText: {
    backgroundColor: "#FFF4F1",
    borderColor: "#F1B7A8",
    borderRadius: 6,
    borderWidth: 1,
    color: componentColors.dangerRed,
    fontSize: 13,
    fontWeight: "800",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
