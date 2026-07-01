---
codex_context: true
priority: P0
scope: repository
last_verified: 2026-06-25
---

# Codex Context Index

This directory is the durable context pack for Codex work on the Salary Hijacking platform.

## Read Order

1. `AGENTS.md`
2. `docs/codex/00_INDEX.md`
3. `docs/codex/01_PROJECT_BRIEF.md`
4. `docs/codex/09_VALIDATION_PROTOCOL.md`
5. The area-specific document for the files being touched

## Documents

| File                              | Use When                                       | Purpose                                                    |
| --------------------------------- | ---------------------------------------------- | ---------------------------------------------------------- |
| `01_PROJECT_BRIEF.md`             | Starting any task                              | Product identity, repo shape, current truth                |
| `02_MASTER_REQUIREMENTS.md`       | Translating product intent into work           | Consolidated requirements and non-goals                    |
| `03_ARCHITECTURE.md`              | Changing structure or integrations             | Monorepo, apps, services, DB, CI architecture              |
| `04_SERVER_AUTHORITY_RULES.md`    | Touching calculations or financial data        | Server authority, KRW, time, calculation boundaries        |
| `05_PRIVACY_ADS_SECURITY.md`      | Touching privacy, ads, auth, logs, exports     | Sensitive data and policy constraints                      |
| `06_MOBILE_APP_CONTEXT.md`        | Touching `apps/mobile`                         | Expo/mobile screens, known blockers, endpoint alignment    |
| `07_API_CONTEXT.md`               | Touching `services`, `packages/db`, API routes | API/service/DB state and route map                         |
| `08_FILE_COMPLETION_LOG.md`       | Reporting completion                           | File-group status and validation history                   |
| `09_VALIDATION_PROTOCOL.md`       | Before final reporting                         | Commands and PASS/FAIL reporting rules                     |
| `10_CODING_CONVENTIONS.md`        | Editing code/docs                              | Local style and implementation conventions                 |
| `11_PROMPT_POLICY.md`             | Starting a new Codex task                      | How to prompt Codex for this repository                    |
| `12_CHATGPT_WORK_SUMMARY.md`      | Continuing from ChatGPT-era work               | Human-readable handoff summary                             |
| `13_BASELINE_VERIFICATION_MAP.md` | Starting implementation hardening              | Current PASS/FAIL baseline, blockers, and next work target |
| `14_EXTERNAL_RELEASE_EVIDENCE.md` | Checking release readiness                     | Read-only GitHub/Cloudflare/Neon evidence and blockers     |
| `15_UI_UX_REFERENCE.md`           | Touching mobile UI, BI, fonts, screenshots     | Design references, source hashes, and app mapping          |

## Area Routing

- Mobile work: read `06_MOBILE_APP_CONTEXT.md`.
- API, services, Worker, DB work: read `07_API_CONTEXT.md`.
- Money calculation work: read `04_SERVER_AUTHORITY_RULES.md`.
- Privacy, ads, analytics, notifications, auth, exports, logs: read `05_PRIVACY_ADS_SECURITY.md`.
- Project-wide validation or completion claims: read `08_FILE_COMPLETION_LOG.md` and `09_VALIDATION_PROTOCOL.md`.
- Baseline hardening work: read `13_BASELINE_VERIFICATION_MAP.md`.
- Release readiness work: read `14_EXTERNAL_RELEASE_EVIDENCE.md`.
- Mobile UI, BI, font, screenshot, or Clean Fintech work: read `15_UI_UX_REFERENCE.md`.

## Important Caveat

The ChatGPT project share link supplied on 2026-06-25 was not accessible in this Codex session because it redirected to ChatGPT login. This context pack is based on the local workspace inspection, not private remote ChatGPT project contents.
