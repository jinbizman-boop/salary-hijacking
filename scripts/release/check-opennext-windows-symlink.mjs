import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const CHECK_PREFIX = "salary-opennext-symlink-";

export function checkOpenNextWindowsSymlinkPrerequisite({
  fs: fsImpl = fs,
  platform = process.platform,
  tmpDir = os.tmpdir,
} = {}) {
  if (platform !== "win32") {
    return {
      ok: true,
      skipped: true,
      message: "OpenNext Windows symlink prerequisite skipped outside Windows.",
    };
  }

  const workspace = fsImpl.mkdtempSync(path.join(tmpDir(), CHECK_PREFIX));
  const target = path.join(workspace, "target");
  const link = path.join(workspace, "link");

  try {
    fsImpl.mkdirSync(target, { recursive: true });
    fsImpl.symlinkSync(target, link, "dir");
    return {
      ok: true,
      skipped: false,
      message: "Windows directory symlink permission is available.",
    };
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String(error.code)
        : "UNKNOWN";

    return {
      ok: false,
      skipped: false,
      code,
      message:
        "OpenNext Cloudflare build requires Windows symlink permission for Next.js standalone output. Use Developer Mode, administrator shell, WSL, or CI before attempting Admin OpenNext Worker dry-run/deploy.",
    };
  } finally {
    fsImpl.rmSync(workspace, { recursive: true, force: true });
  }
}

export function assertOpenNextWindowsSymlinkPrerequisite(options = {}) {
  const result = checkOpenNextWindowsSymlinkPrerequisite(options);
  if (!result.ok) {
    throw new Error(result.message);
  }
  return result;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const result = assertOpenNextWindowsSymlinkPrerequisite();
  console.log(result.message);
}
