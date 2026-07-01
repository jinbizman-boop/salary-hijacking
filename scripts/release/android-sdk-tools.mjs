import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const isNonEmptyString = (value) =>
  typeof value === "string" && value.trim().length > 0;

const uniqueExistingOrder = (values) => {
  const seen = new Set();
  const result = [];

  for (const value of values) {
    if (!isNonEmptyString(value)) continue;
    const normalized = path.normalize(value.trim());
    const key =
      process.platform === "win32"
        ? normalized.toLocaleLowerCase("en-US")
        : normalized;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
  }

  return result;
};

export const candidateAndroidSdkRoots = ({
  env = process.env,
  homeDir = os.homedir(),
  platform = process.platform,
} = {}) => {
  const explicitRoots = [env.ANDROID_SDK_ROOT, env.ANDROID_HOME];
  const defaultRoots = [];

  if (platform === "win32") {
    if (isNonEmptyString(env.LOCALAPPDATA)) {
      defaultRoots.push(path.join(env.LOCALAPPDATA, "Android", "Sdk"));
    }
    if (isNonEmptyString(env.USERPROFILE)) {
      defaultRoots.push(
        path.join(env.USERPROFILE, "AppData", "Local", "Android", "Sdk"),
      );
    }
    if (isNonEmptyString(homeDir)) {
      defaultRoots.push(
        path.join(homeDir, "AppData", "Local", "Android", "Sdk"),
      );
    }
  } else if (platform === "darwin") {
    if (isNonEmptyString(homeDir)) {
      defaultRoots.push(path.join(homeDir, "Library", "Android", "sdk"));
    }
  } else if (isNonEmptyString(homeDir)) {
    defaultRoots.push(path.join(homeDir, "Android", "Sdk"));
  }

  return uniqueExistingOrder([...explicitRoots, ...defaultRoots]);
};

const executableExtensions = ({
  env = process.env,
  platform = process.platform,
}) =>
  platform === "win32"
    ? (env.PATHEXT ?? ".COM;.EXE;.BAT;.CMD").split(";").filter(isNonEmptyString)
    : [""];

const commandExistsInDirectories = (
  command,
  directories,
  {
    env = process.env,
    existsSync = fs.existsSync,
    platform = process.platform,
  } = {},
) => {
  for (const directory of directories.filter(isNonEmptyString)) {
    for (const extension of executableExtensions({ env, platform })) {
      if (existsSync(path.join(directory, `${command}${extension}`))) {
        return true;
      }
    }
  }

  return false;
};

const sdkToolDirectories = (toolName, sdkRoot) => {
  if (toolName === "adb") return [path.join(sdkRoot, "platform-tools")];
  if (toolName === "emulator") return [path.join(sdkRoot, "emulator")];
  return [];
};

export const resolveAndroidSdkRoot = ({
  env = process.env,
  existsSync = fs.existsSync,
  homeDir = os.homedir(),
  platform = process.platform,
} = {}) =>
  candidateAndroidSdkRoots({ env, homeDir, platform }).find((sdkRoot) =>
    existsSync(sdkRoot),
  ) ?? "";

export const androidToolExists = (
  toolName,
  {
    env = process.env,
    existsSync = fs.existsSync,
    homeDir = os.homedir(),
    pathDelimiter = path.delimiter,
    pathValue = env.PATH ?? env.Path ?? "",
    platform = process.platform,
    sdkRoots = candidateAndroidSdkRoots({ env, homeDir, platform }),
  } = {},
) => {
  const pathDirectories = pathValue.split(pathDelimiter).filter(Boolean);
  if (
    commandExistsInDirectories(toolName, pathDirectories, {
      env,
      existsSync,
      platform,
    })
  ) {
    return true;
  }

  const sdkDirectories = sdkRoots.flatMap((sdkRoot) =>
    sdkToolDirectories(toolName, sdkRoot),
  );
  return commandExistsInDirectories(toolName, sdkDirectories, {
    env,
    existsSync,
    platform,
  });
};
