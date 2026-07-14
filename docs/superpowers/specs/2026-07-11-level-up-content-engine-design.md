# LV UP content engine first-slice design

Date: 2026-07-11 KST

## Scope

This first slice turns LV UP from local preview cards into a server-authoritative content and XP flow for the four mobile domains: reading, news, English, and health. It does not claim full project readiness, native E2E completion, or production content inventory completion.

## Product Contract

- Mobile may display curated content, collect a record, show timers and inputs, and render offline preview copy.
- API and database are the source of truth for content publish state, completion records, XP, level progress, idempotency, and audit-friendly timestamps.
- Completion requires a user record such as note text, answer text, checklist confirmation, or timer result. A client-only button press is not enough.
- XP is awarded only from server response. Mobile never calculates authoritative XP.
- Public/community sharing may import a safe LV UP record summary, but raw notes, voice, private text, and financial values remain private by default.

## Content Rules

### Reading

- Do not store or display full book text.
- Store and display title, author, category, difficulty, estimated minutes, 3 topics, operator-written 500-800 character summary, mission, note question, source/purchase/library/publisher link, and XP.
- Categories: AI recommended, fiction, economy/business, humanities/philosophy, and other.

### News

- Do not scrape or store full article bodies.
- Store and display title, operator summary, source name, source URL, published date when known, internal viewpoint tag, mission, and XP.
- UI must not label cards as progressive or conservative.
- Internal tags: FACT_BRIEF, MARKET_BUSINESS, LABOR_WELFARE, POLICY_CENTER, TECH_INDUSTRY.

### English

- Use owned or licensed sentences.
- Daily cards may include 5 sentences, listening/speaking/reading/writing missions, source/license metadata, and XP.
- Voice and text records are private by default and must not feed ads or partner targeting.

### Health

- Use owned routine cards and timers/checklists.
- Do not embed unauthorized external videos or images.
- Cards must include beginner-safe copy, pain-stop notice, medical disclaimer, and recovery routine behavior when pain is reported.

## Admin And Audit Contract

- Admin content lifecycle: draft, review, published, archived.
- Publish requires source, copyright/license, safety flags, and admin reason.
- Admin mutation routes must remain behind admin auth, RBAC/MFA-sensitive boundaries, reason capture, and audit logging.

## API Contract

- User-facing paths stay under `/api/v1`.
- LV UP content list uses `/api/v1/growth/contents`.
- LV UP content completion uses `/api/v1/growth/contents/{contentId}/complete`.
- Response payloads must include server-authoritative privacy flags and must not include user identifiers, raw financial values, push tokens, sessions, auth tokens, or raw private records.
- Completion responses include contentId, completionId, note/record summary, expDelta, completedAt, recommendationUsesSensitiveFinancialData=false, badges, and idempotentReplay.

## Database Contract

- Store curated content in a publish-state table with copyright, source, license, safety, and XP fields.
- Store per-user content progress/completion records separately from content definitions.
- Enforce idempotency per user where a client-provided idempotency key exists.
- Store UTC timestamps. User-facing Korean dates are presentation only.

## Mobile Contract

- LV UP main and detail screens render server-backed content first and fall back to clearly marked offline-preview content only when the API is unavailable.
- Content cards show source/license/safety metadata where it affects trust.
- Detail completion UI requires a record input before submitting.
- Accessibility labels describe content type, XP, record requirement, and disabled/completed state.

## Verification Contract

- Add tests before implementation for API DB content list/completion and mobile content parsing/listing.
- After implementation, run targeted API/mobile tests, typechecks when feasible, and update `docs/codex/08_FILE_COMPLETION_LOG.md`.
- Do not claim production readiness until native build/E2E, DB migration/seed, deployment, secrets, public URL, and release evidence gates pass in the current environment or a named environment.
