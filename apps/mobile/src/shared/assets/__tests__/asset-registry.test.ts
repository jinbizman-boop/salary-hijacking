import fs from "node:fs";
import path from "node:path";

const mobileRoot = path.resolve(__dirname, "..", "..", "..", "..");

const requiredIconFiles = [
  "bottom-tabs/salary-tab.png",
  "bottom-tabs/plan-tab.png",
  "bottom-tabs/level-tab.png",
  "bottom-tabs/community-tab.png",
  "bottom-tabs/profile-tab.png",
  "common/alarm.png",
  "common/settings.png",
  "common/left.png",
  "common/close.png",
  "common/camera.png",
  "common/image-gallery.png",
  "common/file.png",
  "common/heart.png",
  "common/share.png",
  "common/speech-bubble.png",
  "money/coins.png",
  "money/coffee.png",
  "money/bibimbap.png",
  "money/cigarettes.png",
  "level/ai.png",
  "level/book.png",
  "level/read.png",
  "level/news.png",
  "level/technology.png",
  "level/video.png",
  "social/kakao.png",
  "social/naver.png",
  "social/google.png",
  "social/facebook.png",
  "brands/chat-gpt.png",
  "brands/youtube.png",
  "brands/netflix.png",
  "profile/mypage-profile.png",
] as const;

const expoAssetFiles = [
  "icon.png",
  "splash.png",
  "adaptive-icon.png",
  "notification-icon.png",
  "favicon.png",
] as const;

const requiredIconFolders = [
  "bottom-tabs",
  "common",
  "money",
  "level",
  "community",
  "profile",
  "social",
  "brands",
] as const;

const requiredImageFolders = [
  "brand",
  "ad-banners",
  "book-covers",
  "news-thumbnails",
  "workout",
  "community-thumbnails",
  "placeholders",
] as const;

function collectFiles(root: string): readonly string[] {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) return collectFiles(fullPath);
    return [fullPath];
  });
}

function relativePosix(root: string, file: string): string {
  return path.relative(root, file).replace(/\\/g, "/");
}

describe("mobile asset registry policy", () => {
  it("keeps runtime icons in src/shared/assets/icons with kebab-case file names", () => {
    const iconsRoot = path.join(mobileRoot, "src", "shared", "assets", "icons");

    for (const folder of requiredIconFolders) {
      expect(fs.statSync(path.join(iconsRoot, folder)).isDirectory()).toBe(
        true,
      );
    }

    for (const file of requiredIconFiles) {
      const fullPath = path.join(iconsRoot, file);
      expect(fs.existsSync(fullPath)).toBe(true);
      expect(path.basename(file)).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*\.png$/u);
      expect(fs.statSync(fullPath).size).toBeGreaterThan(500);
    }

    for (const file of collectFiles(iconsRoot)) {
      const relativeFile = relativePosix(iconsRoot, file);
      if (relativeFile === "index.ts") continue;
      expect(relativeFile).toMatch(
        /^(?:bottom-tabs|common|money|level|community|profile|social|brands)\/[a-z0-9]+(?:-[a-z0-9]+)*\.png$/u,
      );
    }

    const registry = fs.readFileSync(path.join(iconsRoot, "index.ts"), "utf8");
    expect(registry).toContain("appIconAssets");
    expect(registry).not.toContain("`${");
  });

  it("keeps only Expo launch images at apps/mobile/assets root", () => {
    const assetsRoot = path.join(mobileRoot, "assets");
    const rootFiles = fs
      .readdirSync(assetsRoot, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .sort();

    expect(rootFiles).toEqual([...expoAssetFiles].sort());
    expect(fs.existsSync(path.join(assetsRoot, "icons"))).toBe(false);
    expect(fs.existsSync(path.join(assetsRoot, "brand"))).toBe(false);
  });

  it("keeps brand runtime images in src/shared/assets/images", () => {
    const imagesRoot = path.join(
      mobileRoot,
      "src",
      "shared",
      "assets",
      "images",
    );

    for (const folder of requiredImageFolders) {
      expect(fs.statSync(path.join(imagesRoot, folder)).isDirectory()).toBe(
        true,
      );
    }

    for (const file of [
      "brand/salary-hijacking-platform-logo.png",
      "brand/logotype-white.png",
    ]) {
      const fullPath = path.join(imagesRoot, file);
      expect(fs.existsSync(fullPath)).toBe(true);
      expect(fs.statSync(fullPath).size).toBeGreaterThan(500);
    }

    for (const file of collectFiles(imagesRoot)) {
      const relativeFile = relativePosix(imagesRoot, file);
      if (relativeFile === "index.ts") continue;
      expect(relativeFile).toMatch(
        /^(?:brand|ad-banners|book-covers|news-thumbnails|workout|community-thumbnails|placeholders)\/[a-z0-9]+(?:-[a-z0-9]+)*\.(?:png|jpg|jpeg|webp)$/u,
      );
    }

    const registry = fs.readFileSync(path.join(imagesRoot, "index.ts"), "utf8");
    expect(registry).toContain("appImageAssets");
    expect(registry).not.toContain("`${");
  });

  it("does not duplicate runtime icon assets into forbidden app artifact folders", () => {
    const allowedRuntimeRoots = [
      path.join(mobileRoot, "assets"),
      path.join(mobileRoot, "src", "shared", "assets"),
    ];
    const forbiddenRoots = [
      path.join(mobileRoot, "android"),
      path.join(mobileRoot, "ios"),
      path.resolve(mobileRoot, "..", "..", "release", "screenshots"),
      path.resolve(mobileRoot, "..", "..", "release", "evidence"),
      path.resolve(mobileRoot, "..", "..", "docs"),
    ];
    const runtimeAssetBasenames = new Set([
      ...expoAssetFiles,
      ...requiredIconFiles.map((file) => path.basename(file)),
      "salary-hijacking-platform-logo.png",
      "logotype-white.png",
    ]);
    const violations = forbiddenRoots.flatMap((root) => {
      if (!fs.existsSync(root)) return [];
      return collectFiles(root)
        .filter((file) => runtimeAssetBasenames.has(path.basename(file)))
        .filter(
          (file) =>
            !allowedRuntimeRoots.some((allowedRoot) =>
              file.startsWith(allowedRoot),
            ),
        )
        .map((file) => relativePosix(mobileRoot, file));
    });

    expect(violations).toEqual([]);
  });
});
