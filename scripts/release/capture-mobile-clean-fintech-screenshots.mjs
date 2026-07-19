import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);
const distDir = path.join(rootDir, "apps", "mobile", "dist");
const screenshotDir = path.join(rootDir, "release", "screenshots");
const mobileUiEvidenceDir = path.join(
  rootDir,
  "release",
  "evidence",
  "mobile-ui",
);
const officialLogoPath = path.join(
  rootDir,
  "apps",
  "mobile",
  "src",
  "shared",
  "assets",
  "images",
  "brand",
  "salary-hijacking-platform-logo.png",
);
const webPort = 4175;
const apiPort = 8787;
const phoneViewport = "506,1096";
const phoneScale = "0.85";
const storePhoneScale = "2";

const storeCaptures = [
  ["/capture/salary", "01_home_salary.png", phoneViewport, storePhoneScale],
  [
    "/capture/salary?focus=daily-budget",
    "02_daily_budget.png",
    phoneViewport,
    storePhoneScale,
  ],
  ["/capture/plan", "03_plan_setting.png", phoneViewport, storePhoneScale],
  [
    "/capture/notifications",
    "04_notifications.png",
    phoneViewport,
    storePhoneScale,
  ],
  ["/capture/level", "05_level_up.png", phoneViewport, storePhoneScale],
  ["/__feature-graphic", "feature_graphic_google_play.png", "1024,500", "1"],
];

const mobileUiEvidenceCaptures = [
  ["/capture/splash", "01_splash.png"],
  ["/capture/login", "02_login.png"],
  ["/capture/signup", "03_signup.png"],
  ["/onboarding", "04_onboarding.png"],
  ["/capture/salary", "05_salary_home.png"],
  ["/capture/salary?focus=daily-budget", "06_daily_budget.png"],
  ["/capture/plan", "07_plan_setting.png"],
  ["/capture/notifications", "08_notifications.png"],
  ["/capture/level", "09_level_hub.png"],
  ["/capture/reading", "10_level_reading.png"],
  ["/capture/news", "11_level_news.png"],
  ["/capture/english", "12_level_english.png"],
  ["/capture/health", "13_level_health.png"],
  ["/capture/community", "14_community.png"],
  ["/capture/community-write", "15_community_write.png"],
  ["/capture/profile", "16_profile.png"],
  ["/capture/profile-level", "17_profile_level.png"],
  ["/capture/profile-settings", "18_profile_settings.png"],
  ["/capture/profile-account", "19_profile_account.png"],
  ["/capture/profile-community", "20_profile_community.png"],
  ["/capture/profile-support", "21_profile_support.png"],
  ["/capture/profile-notices", "22_profile_notices.png"],
  ["/capture/community-post-detail", "23_community_post_detail.png"],
  ["/capture/notification-settings", "24_notification_settings.png"],
  ["/capture/common-loading", "25_common_loading.png"],
  ["/capture/common-empty", "26_common_empty.png"],
  ["/capture/common-error", "27_common_error.png"],
  ["/capture/common-offline", "28_common_offline.png"],
  ["/capture/terms-consent", "29_terms_consent.png"],
  ["/capture/expense-form-state", "30_expense_form_state.png"],
];

const responsiveCheckRoutes = [
  "/capture/splash",
  "/capture/login",
  "/capture/signup",
  "/capture/salary",
  "/capture/salary?focus=daily-budget",
  "/capture/plan",
  "/capture/notifications",
  "/capture/level",
  "/capture/reading",
  "/capture/news",
  "/capture/english",
  "/capture/health",
  "/capture/community",
  "/capture/community-write",
  "/capture/profile",
];

const responsiveViewportWidths = [320, 360, 375, 390, 393, 412, 430, 768];

const contentTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".svg", "image/svg+xml"],
]);

const chrome = findChrome();
const apiServer = createApiServer();
const webServer = createWebServer();

await ensureWebExportReady();
await listen(apiServer, apiPort);
await listen(webServer, webPort);

let browser = null;
try {
  const { chromium } = await loadPlaywright();
  browser = await chromium.launch({
    executablePath: chrome,
    headless: true,
  });

  await mkdir(screenshotDir, { recursive: true });
  await mkdir(mobileUiEvidenceDir, { recursive: true });

  for (const [
    route,
    fileName,
    viewport = phoneViewport,
    scale = phoneScale,
  ] of storeCaptures) {
    const outputPath = path.join(screenshotDir, fileName);
    await capture(browser, route, outputPath, viewport, scale);
  }

  const responsiveChecks = [];
  for (const route of responsiveCheckRoutes) {
    for (const width of responsiveViewportWidths) {
      responsiveChecks.push(await checkResponsive(browser, route, width));
    }
  }

  for (const [
    route,
    fileName,
    viewport = phoneViewport,
    scale = phoneScale,
  ] of mobileUiEvidenceCaptures) {
    const outputPath = path.join(mobileUiEvidenceDir, fileName);
    await capture(browser, route, outputPath, viewport, scale);
  }

  const summary = [];
  for (const [, fileName] of storeCaptures) {
    const filePath = path.join(screenshotDir, fileName);
    const png = await readFile(filePath);
    summary.push({
      group: "store",
      file: fileName,
      ...pngSize(png),
      bytes: png.length,
    });
  }
  for (const [, fileName] of mobileUiEvidenceCaptures) {
    const filePath = path.join(mobileUiEvidenceDir, fileName);
    const png = await readFile(filePath);
    summary.push({
      group: "mobile-ui",
      file: fileName,
      ...pngSize(png),
      bytes: png.length,
    });
  }
  await writeFile(
    path.join(mobileUiEvidenceDir, "capture-summary.json"),
    `${JSON.stringify(
      {
        ok: true,
        generatedAt: new Date().toISOString(),
        screenshotDir: path.relative(rootDir, screenshotDir),
        mobileUiEvidenceDir: path.relative(rootDir, mobileUiEvidenceDir),
        count: summary.length,
        storeCount: storeCaptures.length,
        mobileUiEvidenceCount: mobileUiEvidenceCaptures.length,
        responsiveCheckCount: responsiveChecks.length,
        responsiveChecks,
        summary,
      },
      null,
      2,
    )}\n`,
  );
  console.log(JSON.stringify({ ok: true, responsiveChecks, summary }, null, 2));
} finally {
  if (browser !== null) await browser.close();
  await close(webServer);
  await close(apiServer);
}

function createApiServer() {
  return createServer((request, response) => {
    setApiCorsHeaders(request, response);

    if (request.method === "OPTIONS") {
      response.writeHead(204);
      response.end();
      return;
    }

    const url = new URL(request.url ?? "/", `http://127.0.0.1:${apiPort}`);
    if (url.pathname === "/api/v1/growth/contents") {
      json(response, 200, {
        data: {
          items: mockGrowthContents(
            url.searchParams.get("contentType") ?? "READING",
          ),
          page: 1,
          pageSize: 20,
          total: 1,
        },
      });
      return;
    }

    if (url.pathname === "/api/v1/public/app-config") {
      json(response, 200, mockPublicAppConfig());
      return;
    }

    if (url.pathname === "/api/v1/daily-budgets/today") {
      json(response, 200, mockDailyBudget());
      return;
    }

    if (url.pathname === "/api/v1/variable-expenses") {
      json(response, 200, mockVariableExpenses());
      return;
    }

    if (url.pathname === "/api/v1/fixed-expenses") {
      json(response, 200, mockFixedExpenses());
      return;
    }

    if (url.pathname === "/api/v1/savings") {
      json(response, 200, mockSavingsGoals());
      return;
    }

    if (url.pathname === "/api/v1/payroll/current") {
      json(response, 200, mockCurrentPayroll());
      return;
    }

    if (url.pathname === "/api/v1/notifications") {
      json(response, 200, mockNotifications());
      return;
    }

    if (url.pathname === "/api/v1/notifications/unread-count") {
      json(response, 200, { data: { unreadCount: 2, serverAuthority: true } });
      return;
    }

    if (url.pathname === "/api/v1/notifications/preferences") {
      json(response, 200, mockNotificationPreferences());
      return;
    }

    if (url.pathname === "/api/v1/notifications/devices") {
      json(response, 200, mockNotificationDevices());
      return;
    }

    if (url.pathname === "/api/v1/users/me/profile") {
      json(response, 200, mockUserProfile());
      return;
    }

    if (url.pathname === "/api/v1/users/me/my-page-summary") {
      json(response, 200, mockMyPageSummary());
      return;
    }

    if (url.pathname === "/api/v1/users/me/privacy-exports") {
      json(response, 200, {
        data: { items: [], page: 1, pageSize: 20, total: 0 },
      });
      return;
    }

    if (url.pathname === "/api/v1/users/consents") {
      json(response, 200, mockUserConsents());
      return;
    }

    if (url.pathname === "/api/v1/community/posts") {
      json(response, 200, mockCommunityPosts());
      return;
    }

    if (url.pathname === "/api/v1/community/bookmarks") {
      json(response, 200, {
        data: { items: [], page: 1, pageSize: 20, total: 0 },
      });
      return;
    }

    if (url.pathname !== "/api/v1/mobile/bootstrap") {
      json(response, 404, { error: { message: "mock route not found" } });
      return;
    }

    json(response, 200, {
      data: {
        session: {
          authenticated: true,
          userIdHash: "sha256:store-screenshot-sample",
          role: "USER",
          emailVerified: true,
          onboardingCompleted: true,
          mfaRequired: false,
          sessionExpiresAt: null,
          rawFinancialDataExposed: false,
          rawPersonalDataExposed: false,
          rawPushTokenExposed: false,
          adsFinancialTargetingUsed: false,
        },
        config: {
          apiVersion: "v1",
          environment: "development",
          maintenanceMode: false,
          minSupportedBuild: "0",
          defaultRoute: "/salary",
          featureFlags: {
            payroll: true,
            dailyBudgets: true,
            fixedExpenses: true,
            variableExpenses: true,
            savings: true,
            notifications: true,
            growth: true,
            community: true,
            contextualAdsOnly: true,
          },
          serverAuthorityEnabled: true,
          privacyMode: "STRICT",
          adsFinancialTargetingAllowed: false,
        },
        push: {
          consent: "GRANTED",
          tokenRegistered: true,
          quietHoursEnabled: true,
          rawPushTokenExposed: false,
          adsFinancialTargetingUsed: false,
        },
      },
    });
  });
}

function setApiCorsHeaders(request, response) {
  const origin = request.headers.origin ?? `http://127.0.0.1:${webPort}`;
  response.setHeader("access-control-allow-origin", origin);
  response.setHeader("access-control-allow-credentials", "true");
  response.setHeader(
    "access-control-allow-methods",
    "GET,POST,PATCH,DELETE,OPTIONS",
  );
  response.setHeader("access-control-allow-headers", "*");
  response.setHeader("vary", "origin");
  response.setHeader("cache-control", "no-store");
}

function mockPublicAppConfig() {
  return {
    data: {
      links: {
        landingUrl: "https://salaryhijacking.com/",
        partnerBenefitsUrl: "https://salaryhijacking.com/partners",
        privacyUrl: "https://salaryhijacking.com/privacy",
        supportUrl: "https://salaryhijacking.com/support",
        termsUrl: "https://salaryhijacking.com/terms",
      },
      privacy: {
        rawPayrollDataForAds: false,
        rawExpenseDataForAds: false,
        rawSavingsDataForAds: false,
        advertiserUserIdentifierExposure: false,
      },
      ads: {
        contextualOnly: true,
        adLabelRequired: true,
        financialTargetingUsed: false,
        sensitiveFinancialTargetingAllowed: false,
        partnerDisclosureRequired: true,
      },
      serverAuthority: {
        apiPrefix: "/api/v1",
        payrollBudgetExpenseSavingsSource: "server",
        clientMayCalculateAuthoritativeMoney: false,
        krwIntegerOnly: true,
        negativeMoneyAllowed: false,
        fractionalMoneyAllowed: false,
      },
    },
  };
}

function mockDailyBudget() {
  return {
    data: {
      budgetDate: "2026-07-11",
      plannedAmountMinor: 30000,
      adjustmentAmountMinor: 0,
      availableAmountMinor: 30000,
      spentAmountMinor: 23000,
      remainingAmountMinor: 7000,
      usageRate: 0.77,
      status: "WATCH",
      updatedAt: "2026-07-10T18:00:00.000Z",
      serverAuthority: true,
    },
  };
}

function mockVariableExpenses() {
  return {
    data: {
      items: [
        {
          expenseId: "vex_lunch",
          title: "Lunch",
          category: "FOOD",
          amountMinor: 12000,
          spentAt: "2026-07-11T03:20:00.000Z",
          memo: null,
          serverAuthority: true,
          financialRawDataExposed: false,
        },
        {
          expenseId: "vex_coffee",
          title: "Coffee",
          category: "CAFE",
          amountMinor: 4500,
          spentAt: "2026-07-11T05:10:00.000Z",
          memo: null,
          serverAuthority: true,
          financialRawDataExposed: false,
        },
      ],
      page: 1,
      pageSize: 20,
      total: 2,
    },
  };
}

function mockFixedExpenses() {
  return {
    data: {
      items: [
        {
          expenseId: "expense_subscription",
          title: "Subscription",
          category: "SUBSCRIPTION",
          amountMinor: 30000,
          frequency: "MONTHLY",
          paymentDay: 20,
          status: "ACTIVE",
          serverAuthority: true,
          financialRawDataExposed: false,
        },
        {
          expenseId: "expense_utility",
          title: "Utility",
          category: "UTILITY",
          amountMinor: 70000,
          frequency: "MONTHLY",
          paymentDay: 25,
          status: "ACTIVE",
          serverAuthority: true,
          financialRawDataExposed: false,
        },
      ],
      page: 1,
      pageSize: 20,
      total: 2,
    },
  };
}

function mockSavingsGoals() {
  return {
    data: {
      items: [
        {
          goalId: "goal_emergency",
          title: "Emergency reserve",
          goalType: "EMERGENCY_FUND",
          targetAmountMinor: 1000000,
          currentAmountMinor: 120000,
          fixedSaveAmountMinor: 150000,
          status: "ACTIVE",
          serverAuthority: true,
          financialRawAccountDataExposed: false,
        },
        {
          goalId: "goal_growth",
          title: "Growth fund",
          goalType: "CUSTOM",
          targetAmountMinor: 2000000,
          currentAmountMinor: 500000,
          fixedSaveAmountMinor: 200000,
          status: "ACTIVE",
          serverAuthority: true,
          financialRawAccountDataExposed: false,
        },
      ],
      page: 1,
      pageSize: 20,
      total: 2,
    },
  };
}

function mockCurrentPayroll() {
  return {
    data: {
      planId: "plan_2026_07",
      title: "July payroll plan",
      incomeType: "NET",
      payrollCycle: "MONTHLY",
      payrollAmountMinor: 2700000,
      payday: 25,
      firstPayrollDate: "2026-07-25",
      periodStartDate: "2026-07-01",
      periodEndDate: "2026-07-31",
      fixedExpenseTotalMinor: 650000,
      fixedSavingsTotalMinor: 500000,
      variableExpenseReserveMinor: 620000,
      emergencyBufferMinor: 100000,
      carryOverAmountMinor: 50000,
      reservePolicy: "ZERO_BASE",
      memo: null,
      status: "ACTIVE",
      calculation: {
        periodStartDate: "2026-07-01",
        periodEndDate: "2026-07-31",
        dayCount: 31,
        payrollAmountMinor: 2700000,
        fixedExpenseTotalMinor: 650000,
        fixedSavingsTotalMinor: 500000,
        variableExpenseReserveMinor: 620000,
        emergencyBufferMinor: 100000,
        carryOverAmountMinor: 50000,
        alreadySpentAmountMinor: 0,
        totalDeductionsMinor: 1870000,
        availableBeforeSpentMinor: 880000,
        availableForDailyBudgetMinor: 880000,
        recommendedDailyBudgetMinor: 28387,
        remainderMinor: 3,
        hijackRate: 0.6926,
        serverAuthority: true,
        financialRawDataExposed: false,
      },
      serverAuthority: true,
      financialRawDataExposed: false,
      adTargetingSeparated: true,
    },
  };
}

function mockNotifications() {
  return {
    data: {
      items: [
        {
          notificationId: "ntf_budget_warning",
          type: "BUDGET_WARNING",
          title: "Budget watch",
          message: "Today's remaining budget is low. Check before spending.",
          priority: "HIGH",
          channels: "IN_APP,PUSH",
          deeplink: "/salary",
          status: "UNREAD",
          scheduledAt: null,
          expiresAt: null,
          metadata: { category: "budget" },
          createdAt: "2026-07-10T23:00:00.000Z",
          readAt: null,
          archivedAt: null,
          sensitiveFinancialDataExposed: false,
          adTargetingSeparated: true,
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
    },
  };
}

function mockNotificationPreferences() {
  return {
    data: {
      inAppEnabled: true,
      pushEnabled: true,
      emailEnabled: false,
      paydayEnabled: true,
      paymentDueEnabled: true,
      budgetWarningEnabled: true,
      budgetExceededEnabled: true,
      savingsGoalEnabled: true,
      levelUpEnabled: true,
      communityEnabled: true,
      securityEnabled: true,
      contentRecommendationEnabled: false,
      adPartnerEnabled: false,
      quietHoursStart: "22:00",
      quietHoursEnd: "08:00",
      timezone: "Asia/Seoul",
      sensitiveFinancialTargetingConsent: false,
      updatedAt: "2026-07-10T23:10:00.000Z",
    },
  };
}

function mockNotificationDevices() {
  return {
    data: {
      items: [
        {
          deviceId: "device_preview_web",
          platform: "web",
          pushProvider: "EXPO",
          status: "ACTIVE",
          registeredAt: "2026-07-10T23:10:00.000Z",
          lastSeenAt: "2026-07-10T23:20:00.000Z",
          rawPushTokenExposed: false,
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
    },
  };
}

function mockUserProfile() {
  return {
    data: {
      user: {
        idHash: "sha256:1234567890abcdef1234567890abcdef",
        nickname: "Salary Guardian",
        role: "USER",
        emailVerified: true,
        onboardingCompleted: true,
        joinedAt: "2026-07-02T09:00:00.000Z",
        level: 18,
        title: "Salary Guardian",
        avatarEmoji: "SH",
        marketingConsent: false,
        notificationConsent: true,
        communityDisplayName: "Guardian",
        rawEmailExposed: false,
        rawPhoneExposed: false,
        rawFinancialDataExposed: false,
        rawPushTokenExposed: false,
        adsFinancialTargetingUsed: false,
      },
      summary: {
        totalHijackSaved: 5780000,
        currentMonthHijack: 1927000,
        currentLevel: 18,
        levelXp: 420,
        nextLevelXp: 999,
        selfCareScore: 91,
        completedGrowthTasks: 11,
        communityPosts: 3,
        communityComments: 4,
        notificationUnread: 2,
        privacyPassRate: "100.00%",
      },
      privacy: {
        exportStatus: "NONE",
        exportRequestedAt: null,
        withdrawalRequested: false,
        adPersonalization: false,
        financialDataForAds: false,
        rawPushTokenLogging: false,
        tokenHashOnly: true,
      },
      activities: [
        {
          id: "activity_profile_viewed",
          kind: "NOTICE",
          title: "PROFILE_VIEWED",
          description: "Account activity processed by the server.",
          createdAt: "2026-07-10T23:10:00.000Z",
          route: "/profile",
          rawFinancialDataExposed: false,
          rawPersonalDataExposed: false,
          adsFinancialTargetingUsed: false,
        },
      ],
    },
  };
}

function mockMyPageSummary() {
  return {
    data: {
      adPartnerAccepted: false,
      adsFinancialTargetingUsed: false,
      communityComments: 4,
      communityPosts: 3,
      contentRecommendationAccepted: true,
      financialRawDataExposed: false,
      latestExportRequestedAt: "2026-07-03T06:00:00.000Z",
      latestExportStatus: "READY",
      level: 18,
      levelXp: 420,
      nextActions: "Profile ready; review LV UP routine",
      notificationUnread: 2,
      privacyExportCount: 2,
      profileCompleted: true,
      rawPersonalDataExposed: false,
      rawTokenExposed: false,
      selfCareScore: 91,
      sensitiveFinancialTargetingAccepted: false,
      status: "ACTIVE",
      theme: "DARK",
      totalExp: 1740,
    },
  };
}

function mockUserConsents() {
  return {
    data: {
      marketingConsent: false,
      notificationConsent: true,
      adPersonalizationConsent: false,
      sensitiveFinancialTargetingConsent: false,
      updatedAt: "2026-07-10T23:10:00.000Z",
    },
  };
}

function mockCommunityPosts() {
  return {
    data: {
      items: [
        {
          postId: "post_preview_1",
          boardType: "FREE",
          title: "Budget routine check",
          excerpt: "Share one small routine that helped this week.",
          authorDisplayName: "Guardian",
          likeCount: 12,
          commentCount: 3,
          bookmarked: false,
          liked: false,
          createdAt: "2026-07-10T23:10:00.000Z",
          sensitiveFinancialDataExposed: false,
          rawPersonalDataExposed: false,
          adsFinancialTargetingUsed: false,
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
    },
  };
}

function mockGrowthContents(contentType) {
  const normalized = String(contentType).toUpperCase();
  const itemByType = {
    READING: {
      contentId: "00000000-0000-4000-8000-000000002501",
      contentType: "READING",
      title: "Money habit checklist reading",
      subtitle: "Read an operator summary and choose one habit to test.",
      category: "ECONOMY_BUSINESS",
      difficulty: "EASY",
      estimatedMinutes: 8,
      topics: ["budget", "habit", "reflection"],
      summary:
        "Owned operator summary about noticing one repeat spending habit before payday.",
      missionPrompt:
        "Choose one budget habit from the summary and write how you will test it today.",
      recordQuestion: "Which one spending habit will you observe today?",
      sourceTitle: "Salary Hijacking owned reading brief",
      sourceAuthor: "Salary Hijacking Editorial",
      sourceName: "Salary Hijacking",
      sourceUrl:
        "https://salaryhijacking.com/level/reading/money-habit-checklist",
      licenseType: "OWNED_CONTENT",
      safetyLevel: "GENERAL",
      viewpointTag: null,
      xpReward: 20,
      status: "PUBLISHED",
    },
    NEWS: {
      contentId: "00000000-0000-4000-8000-000000002502",
      contentType: "NEWS",
      title: "Balanced money news brief",
      subtitle: "Practice source-centered reading without political labels.",
      category: "NEWS_LITERACY",
      difficulty: "NORMAL",
      estimatedMinutes: 10,
      topics: ["news", "source", "budget"],
      summary:
        "Owned brief about comparing facts, uncertainty, and source evidence before budget decisions.",
      missionPrompt:
        "Write one fact, one uncertainty, and one budget action you would delay.",
      recordQuestion: "What fact did the source actually support?",
      sourceTitle: "Salary Hijacking source balance method",
      sourceAuthor: "Salary Hijacking Editorial",
      sourceName: "Salary Hijacking",
      sourceUrl: "https://salaryhijacking.com/level/news/source-balance-method",
      licenseType: "OWNED_CONTENT",
      safetyLevel: "GENERAL",
      viewpointTag: "FACT_BRIEF",
      xpReward: 25,
      status: "PUBLISHED",
    },
    ENGLISH: {
      contentId: "00000000-0000-4000-8000-000000002503",
      contentType: "ENGLISH",
      title: "Payday five sentence practice",
      subtitle: "Listen, read, speak, and write five owned sentences.",
      category: "ENGLISH_FINANCE",
      difficulty: "EASY",
      estimatedMinutes: 7,
      topics: ["english", "payday", "sentence"],
      summary:
        "Owned English practice with five salary and budget sentences for private learning.",
      missionPrompt:
        "Practice the five sentences, then write one sentence about your next payday plan.",
      recordQuestion: "Which sentence was easiest to say aloud?",
      sourceTitle: "Salary Hijacking owned English set",
      sourceAuthor: "Salary Hijacking Editorial",
      sourceName: "Salary Hijacking",
      sourceUrl:
        "https://salaryhijacking.com/level/english/payday-five-sentences",
      licenseType: "OWNED_CONTENT",
      safetyLevel: "GENERAL",
      viewpointTag: null,
      xpReward: 20,
      status: "PUBLISHED",
    },
    HEALTH: {
      contentId: "00000000-0000-4000-8000-000000002504",
      contentType: "HEALTH",
      title: "Desk recovery starter routine",
      subtitle: "A beginner safe timer checklist for light movement.",
      category: "HEALTH_ROUTINE",
      difficulty: "EASY",
      estimatedMinutes: 9,
      topics: ["health", "timer", "recovery"],
      summary:
        "Owned beginner routine for gentle desk recovery. Stop if pain appears.",
      missionPrompt:
        "Run the timer checklist once and record whether any movement felt uncomfortable.",
      recordQuestion: "Did any movement cause pain or discomfort?",
      sourceTitle: "Salary Hijacking owned desk recovery routine",
      sourceAuthor: "Salary Hijacking Editorial",
      sourceName: "Salary Hijacking",
      sourceUrl:
        "https://salaryhijacking.com/level/health/desk-recovery-routine",
      licenseType: "OWNED_CONTENT",
      safetyLevel: "BEGINNER_SAFE",
      viewpointTag: null,
      xpReward: 20,
      status: "PUBLISHED",
    },
  };
  const item = itemByType[normalized] ?? itemByType.READING;
  return [
    {
      ...item,
      fullTextStored: false,
      adTargetingSeparated: true,
      recommendationUsesSensitiveFinancialData: false,
      financialRawDataExposed: false,
      serverAuthority: true,
      auditReasonRequired: true,
    },
  ];
}

function createWebServer() {
  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", `http://127.0.0.1:${webPort}`);
      if (url.pathname === "/__feature-graphic") {
        response.writeHead(200, {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store",
        });
        response.end(officialFeatureGraphicHtml());
        return;
      }

      if (url.pathname === "/__brand-logo") {
        const logo = await readFile(officialLogoPath);
        response.writeHead(200, {
          "content-type": "image/png",
          "cache-control": "no-store",
        });
        response.end(logo);
        return;
      }

      const requested = decodeURIComponent(url.pathname);
      const target = path.resolve(
        distDir,
        requested === "/" ? "index.html" : requested.slice(1),
      );
      const safeTarget = target.startsWith(distDir) ? target : "";
      const resolved =
        safeTarget && (await existsFile(safeTarget))
          ? safeTarget
          : path.join(distDir, "index.html");
      const body = await readFile(resolved);
      response.writeHead(200, {
        "content-type":
          contentTypes.get(path.extname(resolved)) ??
          "application/octet-stream",
        "cache-control": "no-store",
      });
      response.end(body);
    } catch (error) {
      response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      response.end(error instanceof Error ? error.message : "server error");
    }
  });
}

async function capture(browser, route, outputPath, viewport, scale) {
  const [routeWithoutHash, hash = ""] = route.split("#");
  const separator = routeWithoutHash.includes("?") ? "&" : "?";
  const url =
    `http://127.0.0.1:${webPort}${routeWithoutHash}${separator}capture=${Date.now()}` +
    (hash ? `#${hash}` : "");
  const [width, height] = viewport.split(",").map((value) => Number(value));
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: Number(scale),
  });
  const pageErrors = [];
  page.on("pageerror", (error) => {
    pageErrors.push(error instanceof Error ? error.message : String(error));
  });

  try {
    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });
    if (response !== null && response.status() >= 400) {
      throw new Error(
        `HTTP ${response.status()} while capturing ${route}. Run export:web before capture if apps/mobile/dist/index.html is missing.`,
      );
    }
    await page
      .waitForFunction(() => document.body.innerText.trim().length > 0, null, {
        timeout: 15000,
      })
      .catch(() => undefined);
    await page.waitForTimeout(1200);
    const bodyText = await page.evaluate(() => document.body.innerText);
    if (isServerErrorText(bodyText)) {
      throw new Error(
        `Server error page while capturing ${route}: ${bodyText.slice(0, 240)}`,
      );
    }
    if (pageErrors.length > 0) {
      throw new Error(
        `Page errors while capturing ${route}: ${pageErrors.join("; ")}`,
      );
    }
    await page.screenshot({
      animations: "disabled",
      fullPage: false,
      path: outputPath,
    });
  } finally {
    await page.close();
  }
}

async function checkResponsive(browser, route, width) {
  const routeWithoutHash = route.split("#")[0] ?? route;
  const separator = routeWithoutHash.includes("?") ? "&" : "?";
  const url = `http://127.0.0.1:${webPort}${routeWithoutHash}${separator}responsive=${width}`;
  const page = await browser.newPage({
    viewport: { width, height: 932 },
    deviceScaleFactor: 1,
  });
  const pageErrors = [];
  page.on("pageerror", (error) => {
    pageErrors.push(error instanceof Error ? error.message : String(error));
  });

  try {
    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });
    if (response !== null && response.status() >= 400) {
      throw new Error(`HTTP ${response.status()} while checking ${route}`);
    }
    await page
      .waitForFunction(() => document.body.innerText.trim().length > 0, null, {
        timeout: 15000,
      })
      .catch(() => undefined);
    await page.waitForTimeout(500);
    const metrics = await page.evaluate(() => {
      const body = document.body;
      const root = document.documentElement;
      const maxRight = Math.max(
        body.scrollWidth,
        root.scrollWidth,
        ...[...document.querySelectorAll("*")].map((element) => {
          const rect = element.getBoundingClientRect();
          return Number.isFinite(rect.right) ? rect.right : 0;
        }),
      );
      const minLeft = Math.min(
        0,
        ...[...document.querySelectorAll("*")].map((element) => {
          const rect = element.getBoundingClientRect();
          return Number.isFinite(rect.left) ? rect.left : 0;
        }),
      );
      return {
        bodyTextLength: body.innerText.trim().length,
        maxRight,
        minLeft,
        scrollHeight: Math.max(body.scrollHeight, root.scrollHeight),
        scrollWidth: Math.max(body.scrollWidth, root.scrollWidth),
        viewportWidth: window.innerWidth,
      };
    });
    const horizontalOverflow =
      metrics.scrollWidth > width + 2 ||
      metrics.maxRight > width + 2 ||
      metrics.minLeft < -2;
    if (pageErrors.length > 0 || metrics.bodyTextLength === 0) {
      throw new Error(
        `Responsive check failed for ${route} at ${width}: ${pageErrors.join("; ")}`,
      );
    }
    return {
      horizontalOverflow,
      ok: !horizontalOverflow,
      route,
      width,
      ...metrics,
    };
  } finally {
    await page.close();
  }
}

async function ensureWebExportReady() {
  const indexPath = path.join(distDir, "index.html");
  if (!(await existsFile(indexPath))) {
    throw new Error(
      `Missing Expo web export at apps/mobile/dist/index.html. Run export:web before capture.`,
    );
  }
}

function isServerErrorText(text) {
  return /ENOENT|server error|apps[/\\]mobile[/\\]dist[/\\]index\.html/i.test(
    text,
  );
}

async function loadPlaywright() {
  try {
    return await import("playwright");
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("playwright")) {
      throw error;
    }
  }

  const pnpmDir = path.join(rootDir, "node_modules", ".pnpm");
  const entries = await readdir(pnpmDir, { withFileTypes: true });
  const playwrightEntry = entries
    .filter(
      (entry) => entry.isDirectory() && entry.name.startsWith("playwright@"),
    )
    .map((entry) => entry.name)
    .sort()
    .at(-1);
  if (!playwrightEntry) {
    throw new Error("Unable to locate Playwright in node_modules/.pnpm.");
  }
  return import(
    pathToFileURL(
      path.join(
        pnpmDir,
        playwrightEntry,
        "node_modules",
        "playwright",
        "index.mjs",
      ),
    ).href
  );
}

function officialFeatureGraphicHtml() {
  return `<!doctype html>
<html lang="ko">
<meta charset="utf-8" />
<style>
body{margin:0;width:1024px;height:500px;background:#f7f8fa;font-family:Arial,'Noto Sans KR',sans-serif;color:#202327;overflow:hidden}
.wrap{display:flex;height:100%;align-items:center;gap:44px;padding:0 58px;box-sizing:border-box}
.copy{flex:1}.brand{display:flex;align-items:center;gap:20px}.brand img{width:136px;height:136px;object-fit:contain;border-radius:44px;background:white;box-shadow:0 14px 36px rgba(15,35,25,.12)}.k{color:#209252;font-weight:900;font-size:18px;letter-spacing:.08em}.h{font-size:50px;line-height:1.13;font-weight:900;margin:24px 0 14px}.p{font-size:21px;line-height:1.45;color:#4b535b;font-weight:700}.pill{display:inline-block;margin-top:20px;padding:12px 18px;border-radius:999px;background:#eaf6ef;color:#12663a;font-weight:900}
.phone{width:262px;height:430px;border-radius:34px;background:white;border:1px solid #e7ebef;box-shadow:0 18px 46px rgba(15,35,25,.16);overflow:hidden}
.bar{height:48px;background:#fff;border-bottom:1px solid #eef0f2;display:flex;align-items:center;gap:8px;padding:0 18px;box-sizing:border-box}.bar img{width:28px;height:28px;object-fit:contain;border-radius:10px}.bar b{font-size:11px;color:#209252}
.card{margin:18px;padding:18px;border-radius:20px;background:#fff;border:1px solid #eef0f2;box-shadow:0 8px 24px rgba(15,35,25,.06)}.money{font-size:30px;font-weight:900}.muted{color:#6d737a;font-size:14px;font-weight:700}.line{height:10px;background:#eaf6ef;border-radius:999px;margin-top:14px}.line b{display:block;width:72%;height:100%;background:#209252;border-radius:999px}.mini{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:0 18px}.mini div{border:1px solid #eef0f2;border-radius:16px;padding:10px;font-size:12px;font-weight:800;color:#4b535b}.mini strong{display:block;color:#202327;font-size:13px;margin-top:4px;white-space:nowrap}
</style>
<div class="wrap"><div class="copy"><div class="brand"><img src="/__brand-logo" alt="Salary Hijacking official BI"/><div><div class="k">SALARY HIJACKING</div><div class="p">Clean Fintech v1</div></div></div><div class="h">&#xC6D4;&#xAE09;&#xC774; &#xC0AC;&#xB77C;&#xC9C0;&#xAE30; &#xC804;&#xC5D0;<br/>&#xBA3C;&#xC800; &#xBD99;&#xC7A1;&#xC544;&#xC694;</div><div class="p">&#xAE09;&#xC5EC;&middot;&#xC608;&#xC0B0;&middot;&#xC9C0;&#xCD9C;&middot;&#xC800;&#xCD95;&#xC744; &#xD55C; &#xBC88;&#xC5D0; &#xC815;&#xB9AC;&#xD558;&#xB294; green fintech &#xC571;</div><div class="pill">&#xC774;&#xBC88; &#xB2EC; &#xB0B4;&#xAC00; &#xC9C0;&#xCF1C;&#xB0B8; &#xB3C8; 5,780,000&#xC6D0;</div></div><div class="phone"><div class="bar"><img src="/__brand-logo" alt=""/><b>SALARY HIJACKING</b></div><div class="card"><div class="muted">&#xC774;&#xBC88; &#xB2EC; &#xB0B4;&#xAC00; &#xC9C0;&#xCF1C;&#xB0B8; &#xB3C8;</div><div class="money">5,780,000&#xC6D0;</div><div class="line"><b></b></div></div><div class="card"><div class="muted">&#xC624;&#xB298; &#xC4F8; &#xC218; &#xC788;&#xB294; &#xB3C8;</div><div class="money">7,000&#xC6D0;</div><div class="line"><b style="width:65%"></b></div></div><div class="mini"><div>&#xC218;&#xB839;<strong>2,700,000&#xC6D0;</strong></div><div>&#xB0A9;&#xCE58;<strong>1,927,000&#xC6D0;</strong></div></div></div></div>
</html>`;
}

function json(response, status, value) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(value));
}

async function existsFile(filePath) {
  try {
    return (await stat(filePath)).isFile();
  } catch {
    return false;
  }
}

function pngSize(buffer) {
  if (
    buffer.length < 24 ||
    buffer.readUInt32BE(0) !== 0x89504e47 ||
    buffer.readUInt32BE(4) !== 0x0d0a1a0a
  ) {
    throw new Error("invalid PNG output");
  }
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function listen(server, port) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
}

function close(server) {
  return new Promise((resolve) => server.close(() => resolve()));
}

function findChrome() {
  const candidates = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  ];
  for (const candidate of candidates) {
    if (process.platform === "win32") {
      if (existsSync(candidate)) return candidate;
    }
  }
  return process.env.CHROME_BIN ?? "chrome";
}
