import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const defaultMobileRootDir = () =>
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const getAndroidE2eApkPath = (mobileRootDir = defaultMobileRootDir()) =>
  path.join(
    mobileRootDir,
    "build",
    "e2e",
    "android",
    "salary-hijacking-e2e.apk",
  );

const isUrlLike = (value) => /^[a-z][a-z0-9+.-]*:\/\//i.test(value);

const assertValidApk = (sourcePath) => {
  if (!sourcePath || typeof sourcePath !== "string" || isUrlLike(sourcePath)) {
    throw new Error(
      "Provide a local Android E2E APK path; artifact URLs must not be pasted into repository workflows.",
    );
  }

  if (path.extname(sourcePath).toLocaleLowerCase("en-US") !== ".apk") {
    throw new Error("Android E2E binary must be a .apk file.");
  }

  const absoluteSourcePath = path.resolve(sourcePath);
  if (!fs.existsSync(absoluteSourcePath)) {
    throw new Error(`Android E2E APK does not exist: ${absoluteSourcePath}`);
  }

  const stat = fs.statSync(absoluteSourcePath);
  if (!stat.isFile() || stat.size < 4) {
    throw new Error(
      `Android E2E APK is empty or invalid: ${absoluteSourcePath}`,
    );
  }

  const header = Buffer.alloc(2);
  const fd = fs.openSync(absoluteSourcePath, "r");
  try {
    fs.readSync(fd, header, 0, header.length, 0);
  } finally {
    fs.closeSync(fd);
  }

  if (header.toString("utf8") !== "PK") {
    throw new Error(
      `Android E2E APK must be a valid APK/ZIP archive: ${absoluteSourcePath}`,
    );
  }

  return absoluteSourcePath;
};

export const importAndroidE2eApk = ({
  mobileRootDir = defaultMobileRootDir(),
  sourcePath = process.argv[2] ?? process.env.E2E_ANDROID_APK_PATH,
} = {}) => {
  const absoluteSourcePath = assertValidApk(sourcePath);
  const outputPath = getAndroidE2eApkPath(mobileRootDir);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  if (path.resolve(outputPath) !== absoluteSourcePath) {
    fs.copyFileSync(absoluteSourcePath, outputPath);
  }

  return outputPath;
};

const isCliEntrypoint = () =>
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCliEntrypoint()) {
  try {
    const outputPath = importAndroidE2eApk();
    console.log(
      `[mobile-e2e-apk] imported ${path.relative(process.cwd(), outputPath)}`,
    );
  } catch (error) {
    console.error(`[mobile-e2e-apk] ${error.message}`);
    process.exit(2);
  }
}
