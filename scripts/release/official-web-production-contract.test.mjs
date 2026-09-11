import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const repoRoot = path.resolve(import.meta.dirname, '..', '..');
const webRoot = path.join(repoRoot, 'apps', 'web');
const indexPath = path.join(webRoot, 'index.html');
const siteJsPath = path.join(webRoot, 'assets', 'js', 'site.js');
const logoPath = path.join(webRoot, 'assets', 'images', 'brand', 'salary-hijacking-logo.png');
const apiWranglerPath = path.join(repoRoot, 'services', 'api', 'wrangler.toml');
const expectedOfficialLogoSha256 = '81942C431CED2CC524C193743D98041074C8104A1AC7A46D53DC48681BBF5D43';
const policyPaths = [
  path.join(webRoot, 'privacy.html'),
  path.join(webRoot, 'terms.html'),
  path.join(webRoot, 'support.html'),
];

const forbiddenPatterns = [
  /정적 홈페이지 시안/u,
  /정적 시안/u,
  /브라우저에만 임시 저장/u,
  /제휴 문의 임시 저장/u,
  /browser-local-prototype/u,
  /localStorage/u,
  /프로토타입/u,
  /외부 서버로 전송되지/u,
];

async function listFiles(root) {
  const entries = await readdir(root, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listFiles(fullPath));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

async function read(pathname) {
  return readFile(pathname, 'utf8');
}

async function sha256(pathname) {
  return createHash('sha256').update(await readFile(pathname)).digest('hex').toUpperCase();
}

test('official web uses the approved brand logo asset', async () => {
  assert.equal(await sha256(logoPath), expectedOfficialLogoSha256);
});

test('production worker lets official static web routes serve from apps/web assets', async () => {
  const wrangler = await read(apiWranglerPath);
  const runWorkerFirstBlock = wrangler.match(/run_worker_first\s*=\s*\[(?<routes>[\s\S]*?)\]/u)?.groups?.routes ?? '';
  const workerFirstRoutes = Array.from(runWorkerFirstBlock.matchAll(/"([^"]+)"/gu)).map((match) => match[1]);

  assert.equal(workerFirstRoutes.includes('/api/*'), true);
  assert.equal(workerFirstRoutes.includes('/.well-known/assetlinks.json'), true);
  for (const staticRoute of ['/', '/privacy', '/support', '/terms']) {
    assert.equal(workerFirstRoutes.includes(staticRoute), false, `${staticRoute} must be served by apps/web assets`);
  }
});

test('official web does not contain stale prototype/local browser storage copy', async () => {
  const files = await listFiles(webRoot);
  for (const file of files) {
    const info = await stat(file);
    if (info.size > 5_000_000) continue;
    const content = await read(file);
    for (const pattern of forbiddenPatterns) {
      assert.doesNotMatch(content, pattern, `${path.relative(repoRoot, file)} contains ${pattern}`);
    }
  }
});

test('partner inquiry form targets the production public inquiry API contract', async () => {
  const index = await read(indexPath);
  const siteJs = await read(siteJsPath);

  assert.match(siteJs, /INQUIRY_ENDPOINT\s*=\s*'\/api\/v1\/public\/partnership-inquiries'/u);
  assert.match(siteJs, /fetch\(INQUIRY_ENDPOINT/u);
  assert.match(siteJs, /response\.status\s*!==\s*202/u);
  assert.match(siteJs, /accepted\s*!==\s*true/u);
  assert.match(siteJs, /requestId/u);

  assert.match(index, /<form[^>]+id="partnerInquiryForm"/u);
  assert.match(index, /name="website"[^>]+hidden/u);
  assert.match(index, /제휴 문의 접수/u);

  const optionValues = Array.from(index.matchAll(/<option value="([^"]*)"/gu)).map((match) => match[1]).filter(Boolean);
  assert.deepEqual(optionValues, ['campaign', 'benefit', 'content', 'brand', 'support']);
});

test('inquiry payload maps web field names to backend field names', async () => {
  const siteJs = await read(siteJsPath);
  for (const field of ['company:', 'name:', 'email:', 'phone:', 'type:', 'message:', 'privacyConsent:', 'website:']) {
    assert.match(siteJs, new RegExp(String.raw`\b${field}`, 'u'));
  }
  for (const staleExport of ['generateInquiryId', 'safeJSONParse', 'saveInquiry', 'STORAGE_KEY']) {
    assert.doesNotMatch(siteJs, new RegExp(staleExport, 'u'));
  }
});

test('public policy pages describe current Android-only service boundaries', async () => {
  const combined = (await Promise.all(policyPaths.map(read))).join('\n');
  for (const required of ['Android 앱', 'Google', 'Kakao', 'Naver', 'AdMob', 'FCM', '은행 이체', '금융계좌 직접 연결']) {
    assert.match(combined, new RegExp(required, 'u'));
  }
});
