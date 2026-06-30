import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { salaryHijackingTheme } from "../clean-fintech-theme";

const appRoot = join(process.cwd(), "app");

function source(path: string): string {
  return readFileSync(join(appRoot, path), "utf8");
}

function mobileSource(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("Salary Hijacking Clean Fintech v1 mobile design contract", () => {
  it("exposes the approved green fintech theme tokens", () => {
    expect(salaryHijackingTheme.name).toBe("Salary Hijacking Clean Fintech v1");
    expect(salaryHijackingTheme.color.brand.primary).toBe("#209252");
    expect(salaryHijackingTheme.color.brand.secondary).toBe("#2FA86A");
    expect(salaryHijackingTheme.color.brand.soft).toBe("#EAF6EF");
    expect(salaryHijackingTheme.color.surface.app).toBe("#F7F8FA");
    expect(salaryHijackingTheme.color.surface.card).toBe("#FFFFFF");
    expect(salaryHijackingTheme.color.semantic.danger).toBe("#D74B4B");
    expect(salaryHijackingTheme.layout.bottomTabHeight).toBe(76);
    expect(salaryHijackingTheme.layout.touchTarget).toBe(44);
    expect(salaryHijackingTheme.font.native.regular).toBe(
      "Freesentation-4Regular",
    );
    expect(salaryHijackingTheme.font.native.black).toBe("Freesentation-9Black");
  });

  it("keeps Freesentation font assets bundled and loaded by the root layout", () => {
    const rootLayout = source("_layout.tsx");
    const expectedFonts = [
      "Freesentation-4Regular.ttf",
      "Freesentation-5Medium.ttf",
      "Freesentation-6SemiBold.ttf",
      "Freesentation-7Bold.ttf",
      "Freesentation-8ExtraBold.ttf",
      "Freesentation-9Black.ttf",
    ];

    expect(rootLayout).toContain("expo-font");
    expect(rootLayout).toContain("useFonts");

    for (const fontFile of expectedFonts) {
      const fontPath = join(process.cwd(), "assets", "fonts", fontFile);
      expect(existsSync(fontPath)).toBe(true);
      expect(statSync(fontPath).size).toBeGreaterThan(2_000_000);
      expect(rootLayout).toContain(fontFile);
    }
  });

  it("keeps the official BI logo bundled and used by app and release branding", () => {
    const brandLogo = join(
      process.cwd(),
      "assets",
      "brand",
      "salary-hijacking-platform-logo.png",
    );
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );
    const rootLayout = source("_layout.tsx");
    const screenshotScript = readFileSync(
      join(
        process.cwd(),
        "..",
        "..",
        "scripts",
        "release",
        "capture-mobile-clean-fintech-screenshots.mjs",
      ),
      "utf8",
    );

    expect(existsSync(brandLogo)).toBe(true);
    expect(statSync(brandLogo).size).toBeGreaterThan(500_000);
    expect(cleanScreens).toContain("salary-hijacking-platform-logo.png");
    expect(rootLayout).toContain("salary-hijacking-platform-logo.png");
    expect(screenshotScript).toContain("salary-hijacking-platform-logo.png");
    expect(screenshotScript).toContain("/__brand-logo");
  });

  it("keeps the daily budget screenshot anchor available for store capture", () => {
    const cleanScreens = mobileSource(
      "src/shared/styles/clean-fintech-screens.tsx",
    );

    expect(cleanScreens).toContain('nativeID="daily-budget"');
    expect(cleanScreens).toContain("scrollIntoView");
    expect(cleanScreens).toContain("#daily-budget");
    expect(cleanScreens).toContain("focus=daily-budget");
  });

  it("keeps bottom navigation on the launch IA and clean color system", () => {
    const tabs = source("(tabs)/_layout.tsx");

    for (const label of ["급여", "계획", "LV", "커뮤니티", "MY"]) {
      expect(tabs).toContain(label);
    }

    expect(tabs).toContain("#209252");
    expect(tabs).toContain("#ADB3B8");
    expect(tabs).toContain("#FFFFFF");
    expect(tabs).not.toContain("#020617");
  });

  it("keeps Expo launch surfaces aligned with the clean fintech theme", () => {
    const config = mobileSource("app.config.ts");

    expect(config).toContain("#209252");
    expect(config).toContain("#F7F8FA");
    expect(config).not.toContain("#020617");
    expect(config).not.toContain("#67E8F9");
  });

  it("keeps the salary home value-first and server-authority messaging visible", () => {
    const salary = source("(tabs)/salary/index.tsx");

    for (const marker of [
      "이번 달 내가 지켜낸 돈",
      "오늘 쓸 수 있는 돈",
      "수령금액",
      "지출금액",
      "이번 달 납치금액",
      "다음 급여일 D-day",
      "지출 추가하기",
      "제휴/광고",
      "serverAuthority=true",
      "adsFinancialTargeting=false",
    ]) {
      expect(salary).toContain(marker);
    }
  });

  it("keeps plan, level, notifications, community, compose, and profile launch markers visible", () => {
    const plan = source("(tabs)/plan/index.tsx");
    const level = source("(tabs)/level/index.tsx");
    const notifications = source("notifications/index.tsx");
    const community = source("(tabs)/community/index.tsx");
    const write = source("community/write.tsx");
    const profile = source("(tabs)/profile/index.tsx");

    expect(plan).toContain("목표 달성률");
    expect(plan).toContain("급여 계획");
    expect(plan).toContain("고정지출");
    expect(plan).toContain("고정저축");
    expect(plan).toContain("생활비");

    for (const marker of [
      "현재 레벨",
      "독서하기",
      "뉴스보기",
      "영어연습",
      "홈트하기",
    ]) {
      expect(level).toContain(marker);
    }

    expect(notifications).toContain("새로운 알림이 있어요");
    expect(notifications).toContain("중요 알림");
    expect(notifications).toContain("루틴 알림");

    for (const marker of [
      "전체 게시판",
      "자유 게시판",
      "레벨업 인증",
      "취미 게시판",
    ]) {
      expect(community).toContain(marker);
    }
    expect(community).toContain("글쓰기");
    expect(community).toContain("#209252");

    expect(write).toContain("제목");
    expect(write).toContain("본문");
    expect(write).toContain("익명");
    expect(write).toContain("게시판");

    expect(profile).toContain("누적 납치금액");
    expect(profile).toContain("레벨업 현황");
    expect(profile).toContain("자기관리 성과");
    expect(profile).toContain("내 게시글 관리");
  });

  it("keeps splash, signup, LV detail, and community detail launch markers visible", () => {
    const splash = source("index.tsx");
    const signup = source("(auth)/signup.tsx");
    const reading = source("level/reading.tsx");
    const news = source("level/news.tsx");
    const english = source("level/english.tsx");
    const health = source("level/health.tsx");
    const postDetail = source("community/[postId].tsx");

    expect(splash).toContain("SALARY HIJACKING");
    expect(splash).toContain("월급이 사라지기 전에 먼저 붙잡아요");

    expect(signup).toContain("민감 정보 보호");
    expect(signup).toContain("약관 동의");
    expect(signup).toContain("/api/v1/auth/register");

    for (const marker of ["AI 추천", "소설", "경제/경영", "인문/철학"]) {
      expect(reading).toContain(marker);
    }

    for (const marker of ["경제", "산업", "사회", "기술"]) {
      expect(news).toContain(marker);
    }

    for (const marker of ["Listening", "Speaking", "Reading", "Writing"]) {
      expect(english).toContain(marker);
    }

    for (const marker of ["월", "화", "수", "목", "금", "토"]) {
      expect(health).toContain(marker);
    }

    expect(postDetail).toContain("레벨업 인증");
    expect(postDetail).toContain("댓글");
    expect(postDetail).toContain("공유");
  });
});
