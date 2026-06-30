import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);
const distDir = path.join(rootDir, "apps", "mobile", "dist");
const screenshotDir = path.join(rootDir, "release", "screenshots");
const officialLogoPath = path.join(
  rootDir,
  "apps",
  "mobile",
  "assets",
  "brand",
  "salary-hijacking-platform-logo.png",
);
const webPort = 4175;
const apiPort = 8787;
const phoneViewport = "506,1096";
const phoneScale = "0.85";

const captures = [
  ["/salary", "01_home_salary.png"],
  ["/salary?focus=daily-budget", "02_daily_budget.png"],
  ["/plan", "03_plan_setting.png"],
  ["/notifications", "04_notifications.png"],
  ["/level", "05_level_up.png"],
  ["/__feature-graphic", "feature_graphic_google_play.png", "1024,500", "1"],
];

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

await listen(apiServer, apiPort);
await listen(webServer, webPort);

try {
  for (const [
    route,
    fileName,
    viewport = phoneViewport,
    scale = phoneScale,
  ] of captures) {
    const outputPath = path.join(screenshotDir, fileName);
    await capture(route, outputPath, viewport, scale);
  }

  const summary = [];
  for (const [, fileName] of captures) {
    const filePath = path.join(screenshotDir, fileName);
    const png = await readFile(filePath);
    summary.push({ file: fileName, ...pngSize(png), bytes: png.length });
  }
  console.log(JSON.stringify({ ok: true, summary }, null, 2));
} finally {
  await close(webServer);
  await close(apiServer);
}

function createApiServer() {
  return createServer((request, response) => {
    response.setHeader("access-control-allow-origin", "*");
    response.setHeader("access-control-allow-methods", "GET,POST,OPTIONS");
    response.setHeader("access-control-allow-headers", "*");
    response.setHeader("cache-control", "no-store");

    if (request.method === "OPTIONS") {
      response.writeHead(204);
      response.end();
      return;
    }

    const url = new URL(request.url ?? "/", `http://127.0.0.1:${apiPort}`);
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

async function capture(route, outputPath, viewport, scale) {
  const profileDir = path.join(
    rootDir,
    ".tmp",
    `chrome-clean-fintech-${path.basename(outputPath, ".png")}-${Date.now()}`,
  );
  const [routeWithoutHash, hash = ""] = route.split("#");
  const separator = routeWithoutHash.includes("?") ? "&" : "?";
  const url =
    `http://127.0.0.1:${webPort}${routeWithoutHash}${separator}capture=${Date.now()}` +
    (hash ? `#${hash}` : "");
  await run(chrome, [
    "--headless=new",
    "--disable-application-cache",
    "--no-sandbox",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--hide-scrollbars",
    `--force-device-scale-factor=${scale}`,
    `--window-size=${viewport}`,
    "--virtual-time-budget=9000",
    `--user-data-dir=${profileDir}`,
    `--screenshot=${outputPath}`,
    url,
  ]);
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

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "ignore" });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${path.basename(command)} exited with ${code}`));
    });
  });
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
