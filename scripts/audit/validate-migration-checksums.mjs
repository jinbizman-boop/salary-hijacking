import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const MIGRATION_DIR = path.join(ROOT, 'database', 'migrations');
const LEDGER_PATH = path.join(ROOT, 'docs', 'database', 'MIGRATION_LEDGER.csv');

function fail(message) {
  console.error(`MIGRATION_CHECKSUM_VALIDATION_FAIL: ${message}`);
  process.exit(1);
}

function sha256File(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex').toUpperCase();
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  if (field.length || row.length) {
    row.push(field.replace(/\r$/, ''));
    rows.push(row);
  }
  const [headers, ...body] = rows.filter((r) => r.length > 1 || r[0] !== '');
  return body.map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ''])));
}

if (!existsSync(LEDGER_PATH)) fail('missing docs/database/MIGRATION_LEDGER.csv');

const files = readdirSync(MIGRATION_DIR)
  .filter((file) => file.endsWith('.sql'))
  .sort()
  .map((file, index) => ({
    migrationId: file.replace(/\.sql$/, ''),
    file,
    filePath: `database/migrations/${file}`,
    order: String(index + 1),
    checksum: sha256File(path.join(MIGRATION_DIR, file)),
  }));

const ledger = parseCsv(readFileSync(LEDGER_PATH, 'utf8'));
const fileIds = new Set(files.map((file) => file.migrationId));
const ledgerIds = new Set(ledger.map((row) => row.MIGRATION_ID));

if (ledger.length !== files.length) fail(`ledger rows ${ledger.length} do not match migration files ${files.length}`);
if (fileIds.size !== files.length) fail('duplicate migration file ids');
if (ledgerIds.size !== ledger.length) fail('duplicate migration ledger ids');

for (const file of files) {
  const row = ledger.find((candidate) => candidate.MIGRATION_ID === file.migrationId);
  if (!row) fail(`missing ledger row for ${file.migrationId}`);
  if (row.FILE_PATH !== file.filePath) fail(`${file.migrationId} FILE_PATH mismatch`);
  if (row.ORDER !== file.order) fail(`${file.migrationId} ORDER mismatch`);
  if (row.FILE_SHA256 !== file.checksum) fail(`${file.migrationId} FILE_SHA256 mismatch`);
  if (row.DB_RECORDED_CHECKSUM !== file.checksum) fail(`${file.migrationId} DB_RECORDED_CHECKSUM mismatch`);
  if (row.FILE_CHECKSUM_MATCH !== 'YES') fail(`${file.migrationId} FILE_CHECKSUM_MATCH must be YES`);
  if (row.STATUS !== 'VERIFIED_APPLIED') fail(`${file.migrationId} STATUS must be VERIFIED_APPLIED`);
}

for (const row of ledger) {
  if (!fileIds.has(row.MIGRATION_ID)) fail(`unknown applied migration ${row.MIGRATION_ID}`);
}

console.log(
  JSON.stringify(
    {
      MIGRATION_CHECKSUM_VALIDATION: 'PASS',
      migrationCount: files.length,
      duplicateMigrationIds: 0,
      checksumMismatch: 0,
      unknownAppliedMigration: 0,
    },
    null,
    2,
  ),
);
