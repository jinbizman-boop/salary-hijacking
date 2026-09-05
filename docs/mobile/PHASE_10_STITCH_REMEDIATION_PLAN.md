# PHASE 10 Stitch Remediation Plan

Generated: 2026-08-29

This plan is intentionally not executed in PHASE 13. It is the next-track remediation plan for D-013 after current same-RC PHASE 13 runtime closure.

## 1. Freeze Canonical Stitch Source

| Field | Value |
| --- | --- |
| REQ_ID | D-013 / mobile visual acceptance |
| STITCH_ID | classified 304 state registry |
| Route | all production Expo Router routes |
| Current component | mixed native production components and capture/reference screens |
| Target component | canonical native RN implementation per state |
| Files to change | `docs/design/stitch/**`, `docs/ui/**`, generated registry under `docs/mobile/**` |
| Test | registry validator |
| Visual reference | Stitch PNG/HTML plus source ZIP hash |
| Acceptance | 304 canonical state IDs frozen with no ambiguous source authority |

## 2. Freeze 304 State Registry

Map every classified state to route, modal, bottom sheet, flow, and state type. Reject duplicate or missing IDs.

## 3. Consolidate Design Tokens

Move color, typography, spacing, radius, elevation, icon, button, input, card, list, modal, bottom-sheet, tab, and navigation tokens into one mobile-consumed SSOT. Production routes should not depend on ad hoc inline style constants for canonical visual decisions.

## 4. Implement Common RN Components

Build or consolidate reusable native components for cards, buttons, forms, lists, modals, bottom sheets, empty/error/offline/loading surfaces, and navigation affordances.

## 5. Route-by-Route Migration

For each production route, map:

`REQ_ID -> STITCH_ID -> ROUTE -> CURRENT_COMPONENT -> TARGET_COMPONENT -> FILES_TO_CHANGE -> TEST -> VISUAL_REFERENCE -> ACCEPTANCE`

Minimum routes:

- login
- salary home
- payroll plan
- daily budget
- fixed expenses
- fixed savings
- variable expenses
- notifications
- LV UP
- reading/news/English/health
- community
- post detail
- write
- profile
- settings

## 6. Modal and Bottom-Sheet Migration

Map all confirmation, amount validation, category picker, mission result, write, delete, and notification/deeplink related modals and bottom sheets.

## 7. State Variant Migration

Implement and capture loading, empty, error, offline, permission, validation, and recoverable fatal states for every data screen.

## 8. Accessibility

Verify screen-reader labels, roles, focus order, touch target size, dynamic type, reduced motion, and contrast.

## 9. Keyboard and Safe Area

Verify amount input, search, write body, support text, auth fields, modal fields, bottom gestures, status bar, tab bar, and notch behavior on Galaxy and emulator.

## 10. Visual Regression

Generate production-native screenshots from the same APK source lineage and compare them against the frozen Stitch reference state set. Do not count HTML/reference screenshots as native production proof.

## 11. Galaxy Validation

Run the same production APK on Samsung Galaxy / RTL for representative core flows and state variants.

## 12. Evidence Registry and D-013 Closure

Create a strict evidence registry that binds:

- Stitch state ID
- route
- component
- screenshot
- interaction result
- accessibility result
- keyboard/safe-area result
- APK SHA
- application RC SHA

D-013 may be PASS only after the registry proves the complete state set.
