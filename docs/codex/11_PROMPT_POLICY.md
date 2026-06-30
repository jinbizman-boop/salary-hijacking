---
codex_context: true
priority: P1
scope: prompting
last_verified: 2026-06-25
---

# Prompt Policy For Future Codex Work

## Common Codex Prompt

Use this when starting a new task:

```text
This repository is the Salary Hijacking Paycheck Accounting platform.

Act as the Salary Hijacking principal architect for this repository.
The goal is not a temporary patch, placeholder, or small cosmetic correction.
The goal is to make the target file, feature, or workflow as complete as possible for the product's commercial direction, while keeping every completion claim objectively tied to real verification.

Target path:
- [insert file or folder path]

Task requirements:
- [insert concrete user request]

Before work, read and use:
1. AGENTS.md
2. docs/codex/00_INDEX.md
3. docs/codex/01_PROJECT_BRIEF.md
4. docs/codex/02_MASTER_REQUIREMENTS.md
5. docs/codex/09_VALIDATION_PROTOCOL.md
6. The docs/codex document matching the target path

Read these additional documents when relevant:
- Mobile: docs/codex/06_MOBILE_APP_CONTEXT.md
- API, services, or DB: docs/codex/07_API_CONTEXT.md
- Payroll, budget, expense, savings, or hijack calculations: docs/codex/04_SERVER_AUTHORITY_RULES.md
- Privacy, ads, notifications, auth, security, logs, analytics, or exports: docs/codex/05_PRIVACY_ADS_SECURITY.md
- Completion reporting: docs/codex/08_FILE_COMPLETION_LOG.md

Core rules:
1. Preserve server authority.
   Payroll, budget, expense, savings, and hijack calculations must be confirmed by /api/v1 server responses or DB/service logic.
   Clients may display, collect input, handle interaction, and provide offline fallback, but must not become authoritative.

2. Preserve KRW money rules.
   Use integer KRW values for authoritative money.
   Reject negative or fractional authoritative money unless a domain-specific reversal/refund action explicitly allows it.

3. Preserve privacy, ads, and analytics separation.
   Never put raw salary, income, expense, savings, hijack amount, account/card/loan data, email, phone, auth tokens, push tokens, or raw device identifiers into ads, partner targeting, analytics, logs, exports, or push payloads.
   Ads and partner surfaces are contextual-only by default.
   Financial amount based ad targeting is forbidden.
   Ad or partner content must be clearly labeled.

4. Respect the existing project shape.
   Do not break monorepo boundaries, package ownership, /api/v1, /admin/api/v1, Cloudflare Worker, Expo, Next.js, or DB migration structure without a verified reason.
   Check route manifests, package contracts, DB schema, and docs before changing integrations.

5. Do not shrink the work.
   Do not leave placeholder, TODO, or mock-only implementation as final work.
   Interpret the touched file in the full platform context.
   Do not perform unrelated large refactors.

Work order:
1. Brief the role of the target in the Salary Hijacking platform.
2. Summarize requirements found in docs and code.
3. List what must be reflected for document/theoretical file-level completeness.
4. Break the user request into concrete work items. Use at least 15 items for substantial tasks.
5. Edit the necessary files directly.
6. Run at least three relevant validations, or three passes of the closest possible validation.
7. If validation fails, diagnose, fix, and re-run.
8. Update docs/codex/08_FILE_COMPLETION_LOG.md when the work materially changes completion status.
9. Final report must include changed files, reflected requirements, commands, PASS/FAIL results, and remaining blockers.

Completion language:
- Say "file-level verified" only for items actually checked.
- Say "document/theoretical file-level completeness" only when docs/code requirements were reflected and relevant checks passed.
- Say "project-wide operational 100%" only after install, typecheck, lint, test, E2E, build, deploy, API, DB, secrets, certificates, and operational QA have all passed.
- Do not claim unverified checks.
- "0% error rate" can only refer to the executed verification scope.
- If a ChatGPT project link or external attachment is inaccessible, say so and work from the local repository and docs/codex context.

Forbidden:
- Do not claim production readiness without operational verification.
- Do not claim all tests passed unless they actually ran and passed.
- Do not place secrets, DB URLs, JWT secrets, private keys, service accounts, or FCM server keys in public files.
- Do not place raw financial or sensitive values in ads, analytics, logs, exports, or push payloads.
- Do not guess through file conflicts, duplicate uploads, or doc mismatches; inspect real paths and contents.
```

## Good Task Shape

Provide:

- target path,
- expected behavior,
- validation command,
- whether docs/log should be updated.

Example:

```text
Align the apps/mobile /api/v1/payroll/plans/current call with the API manifest.
Read the related docs, then run mobile typecheck or the closest possible verification.
```

## Avoid

- "finish everything" without a scope.
- "say it is 100%" without validation.
- Asking Codex to rely on private ChatGPT project memory without exporting the contents into this repository.

## If ChatGPT Project Context Is Needed

Export or paste the relevant ChatGPT project content into:

- raw archive: `docs/archive/chatgpt/YYYY-MM-DD-session.md`
- actionable summary: `docs/codex/12_CHATGPT_WORK_SUMMARY.md`

Do not paste secrets.
