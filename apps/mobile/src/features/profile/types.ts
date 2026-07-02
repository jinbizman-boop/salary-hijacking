export type ProfileExportStatus = "NONE" | "REQUESTED" | "READY" | "EXPIRED";

export type ProfileUser = Readonly<{
  idHash: string;
  nickname: string;
  role: string;
  emailVerified: boolean;
  onboardingCompleted: boolean;
  joinedAt: string;
  level: number;
  title: string;
  avatarEmoji: string;
  marketingConsent: boolean;
  notificationConsent: boolean;
  communityDisplayName: string;
  rawEmailExposed: false;
  rawPhoneExposed: false;
  rawFinancialDataExposed: false;
  rawPushTokenExposed: false;
  adsFinancialTargetingUsed: false;
}>;

export type ProfileSummary = Readonly<{
  totalHijackSaved: number;
  currentMonthHijack: number;
  currentLevel: number;
  levelXp: number;
  nextLevelXp: number;
  selfCareScore: number;
  completedGrowthTasks: number;
  communityPosts: number;
  communityComments: number;
  notificationUnread: number;
  privacyPassRate: string;
}>;

export type ProfilePrivacy = Readonly<{
  exportStatus: ProfileExportStatus;
  exportRequestedAt: string | null;
  withdrawalRequested: boolean;
  adPersonalization: false;
  financialDataForAds: false;
  rawPushTokenLogging: false;
  tokenHashOnly: true;
}>;

export type ProfileActivity = Readonly<{
  id: string;
  kind: "NOTICE" | "SECURITY";
  title: string;
  description: string;
  createdAt: string;
  route: string;
  rawFinancialDataExposed: false;
  rawPersonalDataExposed: false;
  adsFinancialTargetingUsed: false;
}>;

export type ProfileSnapshot = Readonly<{
  user: ProfileUser;
  summary: ProfileSummary;
  privacy: ProfilePrivacy;
  activities: readonly ProfileActivity[];
}>;

export type ProfileActionRequest = Readonly<{
  reason: string;
}>;

export type ProfileApiClient = Readonly<{
  getProfile: () => Promise<ProfileSnapshot>;
  requestPrivacyExport: (
    request: ProfileActionRequest,
  ) => Promise<ProfileSnapshot>;
  requestWithdrawalRequest: (
    request: ProfileActionRequest,
  ) => Promise<ProfileSnapshot>;
}>;
