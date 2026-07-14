export type LevelDashboardNormalizationInput = Readonly<{
  profile?: Readonly<{
    level?: number;
    totalExp?: number;
  }>;
  financialRawDataExposed?: boolean;
}>;

export type LevelDashboardNormalized = Readonly<{
  profile: Readonly<{
    level: number;
    title: string;
    totalXp: number;
  }>;
  tasks: readonly never[];
  stats: Readonly<{
    privacyPassRate: string;
  }>;
}>;

export function normalizeGrowthDashboardForLevel(
  input: LevelDashboardNormalizationInput,
): LevelDashboardNormalized {
  return {
    profile: {
      level: Math.max(1, Math.trunc(input.profile?.level ?? 1)),
      title: "루틴 지킴이",
      totalXp: Math.max(0, Math.trunc(input.profile?.totalExp ?? 0)),
    },
    tasks: [],
    stats: {
      privacyPassRate: input.financialRawDataExposed ? "0.00%" : "100.00%",
    },
  };
}
