---
codex_context: true
priority: P0
scope: validation
last_verified: 2026-06-30
---

# Validation Protocol

## General Rule

Do not claim verification without running or inspecting the relevant check.

Use `corepack pnpm` on Windows PowerShell when possible. Root Turbo scripts route through `scripts/dev/run-with-corepack-pnpm.mjs` so package tasks use the repository pnpm version instead of a global/runtime pnpm.

## Baseline Checks

Root package/config JSON:

```powershell
node -e "const fs=require('fs'); for (const p of ['package.json','turbo.json','pnpm-workspace.yaml']) console.log(p, fs.existsSync(p) ? 'FOUND' : 'MISSING')"
```

Package JSON parse with BOM handling:

```powershell
node -e "const fs=require('fs'); const paths=['package.json','apps/mobile/package.json','apps/mobile/tsconfig.json','apps/mobile/eas.json','services/api/package.json','apps/admin/package.json','services/notifications/package.json','services/scheduler/package.json','turbo.json']; for (const p of paths) { JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,'')); console.log('PASS',p); }"
```

API:

```powershell
corepack pnpm --filter @salary-hijacking/api typecheck
```

Admin:

```powershell
corepack pnpm --filter @salary-hijacking/admin typecheck
```

Mobile:

```powershell
corepack pnpm --filter @salary-hijacking/mobile typecheck
```

Notifications:

```powershell
corepack pnpm --filter @salary-hijacking/notifications typecheck
```

Scheduler:

```powershell
corepack pnpm --filter @salary-hijacking/scheduler typecheck
```

## Broader Gates

Run only when dependencies/config are ready:

```powershell
corepack pnpm run format:check
corepack pnpm run check:package-manager-scripts
corepack pnpm run check:scripts
corepack pnpm run check:external-integrations
corepack pnpm run test:root-scripts
corepack pnpm run disk:report -- --top 20
corepack pnpm run clean:junk:dry-run
corepack pnpm run check:release-readiness -- --soft
corepack pnpm run quality
corepack pnpm run build
```

`test:root-scripts` runs through
`scripts/dev/run-node-tests-with-clean-temp.mjs`, which redirects Node test
fixtures and compile cache to an isolated cleanup directory. On Windows it
prefers `D:\codex-temp\salary-hijacking` when available; otherwise it falls
back to an OS temp subdirectory. Do not bypass this wrapper for full root script
tests unless you also set a disposable `TEMP`/`TMP` path and clean it after the
run.

After verification-heavy work, run `corepack pnpm run clean:junk:dry-run` first
to inspect regenerated disposable outputs. If it lists only generated
artifacts, run `corepack pnpm run clean:junk`. This cleanup command removes
repository caches/build outputs/local proof files, EAS local build cache,
Android `.gradle`/`.cxx`/build outputs, iOS `build`/`Pods`, and Salary
Hijacking temp fixtures, but intentionally preserves `node_modules`, `.dev.vars`,
tracked release evidence JSON, explicit E2E APK paths, source files, docs, and
migrations. Use the broader `clean` script only when dependency folders should
also be removed.

When storage use looks abnormal, run
`corepack pnpm run disk:report -- --top 20` before deleting anything. The report
separates protected dependency/local metadata paths such as `node_modules` and
`.git` from removable generated cache/build paths covered by `clean:junk`.

`check:release-readiness` verifies release artifacts, required root scripts, `.env.example` names, runtime secret presence, external connector evidence in `release/external-release-evidence.json`, required local CLI tools, database migration presence, unsafe public secret env names, and Git repository visibility. Use `--soft` for status reporting without failing the shell; omit `--soft` in a release gate so blockers fail the run.

`check:external-integrations` verifies GitHub workflow tokens, Cloudflare Worker/Page config files, Neon migration/seed assets, infrastructure docs, mobile release metadata, required source automation files, Git trackability for source automation files, operational-doc placeholder markers, mojibake markers, and hard-coded sensitive values.

DB gates require safe environment variables and should not be run against production by accident:

```powershell
corepack pnpm run db:validate
corepack pnpm run db:migrate
corepack pnpm run db:seed
```

Security gates:

```powershell
corepack pnpm run security:scan
corepack pnpm --filter @salary-hijacking/api run security:audit
corepack pnpm --filter @salary-hijacking/admin run security:audit
corepack pnpm --filter @salary-hijacking/notifications run security:audit
corepack pnpm --filter @salary-hijacking/scheduler run security:audit
```

`security:scan` is local/offline policy scanning where configured. `security:audit` requires npm registry access and must pass in CI or a network-enabled release environment before public launch.

## Markdown Validation

For docs, check:

- required title exists,
- date/verification caveat is present when relevant,
- internal links point to existing files,
- claims do not exceed observed verification,
- ChatGPT share link inaccessibility is not misrepresented.

## PASS/FAIL Reporting

Report results like this:

- Command: `...`
- Result: PASS or FAIL
- Reason: one sentence
- Remaining blocker: one sentence if any
