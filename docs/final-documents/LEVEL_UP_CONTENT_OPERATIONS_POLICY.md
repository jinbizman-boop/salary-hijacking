# LV UP Content Operations Policy

Date: 2026-07-11 KST

This document is the product policy for the first server-authoritative LV UP content slice. It is file-level documentation, not proof of production readiness.

## Shared Rules

- LV UP content must be curated, reviewed, and published by the server/admin flow.
- Mobile can collect records and display cards, but XP and completion state come from `/api/v1/growth`.
- Content completion requires a private user record before XP is awarded.
- Raw salary, income, expense, savings, hijack amount, account, card, phone, email, auth token, push token, and raw device identifiers must not appear in content, logs, ads, analytics, or push payloads.
- Ads and partner surfaces remain contextual only.

## Reading

- Full book text is forbidden.
- Allowed fields: title, author, category, difficulty, estimated minutes, topics, operator-written summary, mission, record question, source/purchase/library/publisher link, and XP.
- Categories: AI recommended, fiction, economy/business, humanities/philosophy, other.

## News

- Full article scraping or storage is forbidden.
- Allowed fields: title, operator summary, source name, source URL, published date when known, internal viewpoint tag, mission, record question, and XP.
- UI must not label cards as progressive or conservative.
- Internal viewpoint tags: FACT_BRIEF, MARKET_BUSINESS, LABOR_WELFARE, POLICY_CENTER, TECH_INDUSTRY.

## English

- Sentences must be owned or licensed.
- Voice and text records are private by default and cannot be used for ads or partner targeting.
- Daily content may include five sentences, listening/speaking/reading/writing missions, source/license metadata, and XP.

## Health

- Use owned routines, timers, and checklists.
- Unauthorized external videos/images are forbidden.
- Cards must include beginner-safe copy, pain-stop notice, and medical disclaimer metadata.
- If a user reports pain, the product should switch to recovery/safety guidance instead of awarding normal routine progress.

## Admin

- Admin content lifecycle: draft, review, published, archived.
- Publish requires source URL, copyright/license fields, safety flags, admin reason, and audit logging.
- Admin mutations must remain protected by RBAC, MFA-sensitive boundaries, reason capture, and audit trails.

## Verification Status

- Document/theoretical completeness: policy basis added for the first slice.
- Verified completeness: requires targeted tests and typechecks after implementation.
- Project-wide operational readiness: not claimed.
