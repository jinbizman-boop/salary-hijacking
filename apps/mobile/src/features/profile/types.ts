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

export type ProfileMyPageSummary = Readonly<{
  adPartnerAccepted: boolean;
  adsFinancialTargetingUsed: false;
  communityComments: number;
  communityPosts: number;
  contentRecommendationAccepted: boolean;
  financialRawDataExposed: false;
  latestExportRequestedAt: string | null;
  latestExportStatus: string | null;
  level: number;
  levelXp: number;
  nextActions: string;
  notificationUnread: number;
  privacyExportCount: number;
  profileCompleted: boolean;
  rawPersonalDataExposed: false;
  rawTokenExposed: false;
  selfCareScore: number;
  sensitiveFinancialTargetingAccepted: false;
  status: string;
  theme: string;
  totalExp: number;
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

export type ProfileAccountSettingsRequest = Readonly<{
  adPartnerAccepted: boolean;
  analyticsAccepted: boolean;
  consentVersion: string;
  contentRecommendationAccepted: boolean;
  marketingAccepted: boolean;
  privacyAccepted: boolean;
  termsAccepted: boolean;
}>;

export type ProfileAccountSettings = ProfileAccountSettingsRequest &
  Readonly<{
    adPartnerFinancialRawDataUsed: false;
    sensitiveFinancialTargetingAccepted: false;
    updatedAt: string | null;
  }>;

export type ProfileUpdateRequest = Readonly<{
  avatarAttachmentId?: string | null;
  birthYear?: number | null;
  displayBio?: string | null;
  nickname?: string;
  occupationCategory?: string | null;
}>;

export type ProfileSupportTicketCategory =
  | "ACCOUNT"
  | "PAYMENT"
  | "PRIVACY"
  | "BUG"
  | "OTHER";

export type ProfileSupportTicketRequest = Readonly<{
  category: ProfileSupportTicketCategory;
  message: string;
  subject: string;
}>;

export type ProfileSupportTicket = Readonly<{
  category: ProfileSupportTicketCategory;
  createdAt: string;
  id: string;
  rawFinancialDataExposed: false;
  rawPersonalDataExposed: false;
  rawPushTokenExposed: false;
  adsFinancialTargetingUsed: false;
  status: "OPEN" | "IN_PROGRESS" | "ANSWERED" | "CLOSED";
  subject: string;
}>;

export type ProfileApiClient = Readonly<{
  getProfile: () => Promise<ProfileSnapshot>;
  getMyPageSummary: () => Promise<ProfileMyPageSummary>;
  updateAccountSettings: (
    request: ProfileAccountSettingsRequest,
  ) => Promise<ProfileAccountSettings>;
  updateProfile: (request: ProfileUpdateRequest) => Promise<ProfileSnapshot>;
  completeOnboarding: () => Promise<ProfileSnapshot>;
  requestPrivacyExport: (
    request: ProfileActionRequest,
  ) => Promise<ProfileSnapshot>;
  requestWithdrawalRequest: (
    request: ProfileActionRequest,
  ) => Promise<ProfileSnapshot>;
  createSupportTicket: (
    request: ProfileSupportTicketRequest,
  ) => Promise<ProfileSupportTicket>;
}>;
