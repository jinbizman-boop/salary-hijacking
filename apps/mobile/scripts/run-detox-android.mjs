import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  androidToolExists,
  resolveAndroidSdkRoot,
} from "../../../scripts/release/android-sdk-tools.mjs";

const defaultMobileRootDir = () =>
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const isWindows = (platform) => platform === "win32";

const pathKey = (env) => (env.Path !== undefined ? "Path" : "PATH");

const executableNames = (command, platform) =>
  isWindows(platform)
    ? [`${command}.EXE`, `${command}.CMD`, `${command}.BAT`, command]
    : [command];

const findExecutable = ({
  command,
  directories,
  existsSync = fs.existsSync,
  platform = process.platform,
}) => {
  for (const directory of directories) {
    for (const executableName of executableNames(command, platform)) {
      const candidate = path.join(directory, executableName);
      if (existsSync(candidate)) return candidate;
    }
  }
  return "";
};

const buildDetoxEnv = ({ env, pathValue, sdkRoot }) => {
  const envPathKey = pathKey(env);
  const nextPath = [
    path.join(sdkRoot, "platform-tools"),
    path.join(sdkRoot, "emulator"),
    pathValue,
  ]
    .filter(Boolean)
    .join(path.delimiter);

  return {
    ...env,
    ANDROID_HOME: sdkRoot,
    ANDROID_SDK_ROOT: sdkRoot,
    [envPathKey]: nextPath,
  };
};

export const buildDetoxAndroidTestInvocation = ({
  androidToolHomeDir,
  configuration = "android.emu.debug",
  env = process.env,
  existsSync = fs.existsSync,
  mobileRootDir = defaultMobileRootDir(),
  pathValue = env.PATH ?? env.Path ?? "",
  platform = process.platform,
} = {}) => {
  const failures = [];
  const detoxCommand = findExecutable({
    command: "detox",
    directories: [path.join(mobileRootDir, "node_modules", ".bin")],
    existsSync,
    platform,
  });
  if (!detoxCommand) {
    failures.push(
      "Workspace-local Detox CLI is missing under apps/mobile/node_modules/.bin.",
    );
  }

  const sdkRoot = resolveAndroidSdkRoot({
    env,
    existsSync,
    homeDir: androidToolHomeDir,
    platform,
  });
  if (!sdkRoot) failures.push("Android SDK root is unavailable.");

  const androidToolOptions = {
    env,
    existsSync,
    homeDir: androidToolHomeDir,
    pathValue,
    platform,
  };
  if (!androidToolExists("adb", androidToolOptions)) {
    failures.push("adb is unavailable.");
  }
  if (!androidToolExists("emulator", androidToolOptions)) {
    failures.push("emulator is unavailable.");
  }

  return {
    args: ["test", "--configuration", configuration],
    command: detoxCommand,
    env: sdkRoot ? buildDetoxEnv({ env, pathValue, sdkRoot }) : { ...env },
    failures,
    ok: failures.length === 0,
    sdkRoot,
  };
};

export const runDetoxAndroidTest = ({ spawn = spawnSync, ...options } = {}) => {
  const invocation = buildDetoxAndroidTestInvocation(options);
  if (!invocation.ok) return { ...invocation, status: 2 };

  const result = spawn(invocation.command, invocation.args, {
    cwd: options.mobileRootDir ?? defaultMobileRootDir(),
    env: invocation.env,
    shell: isWindows(options.platform ?? process.platform),
    stdio: "inherit",
    windowsHide: true,
  });

  return {
    ...invocation,
    status: result.status ?? 1,
  };
};

const isCliEntrypoint = () =>
  process.argv[1] &&
  fs.realpathSync.native(path.resolve(process.argv[1])) ===
    fs.realpathSync.native(fileURLToPath(import.meta.url));

if (isCliEntrypoint()) {
  const configuration = process.argv[2] ?? "android.emu.debug";
  const result = runDetoxAndroidTest({ configuration });
  if (!result.ok) {
    console.error("[detox-android] preflight failed:");
    for (const failure of result.failures) console.error(`- ${failure}`);
  }
  process.exit(result.status);
}
