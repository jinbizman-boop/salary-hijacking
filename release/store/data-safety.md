# Google Play Data Safety Declaration

This file is the repository-local draft for the Google Play Data safety form. It is not proof that the Play Console form has been submitted. Final console values must match the production app build, deployed API behavior, SDK list, and privacy policy.

## Google Play Data Safety

- Data collected: account email, user ID, profile nickname, payroll plan inputs, expense records, savings records, community content, notification preferences, crash logs, diagnostics, and app interactions.
- Data shared: no raw salary, expense, savings, hijack amount, account, card, loan, email, phone, auth token, push token, or raw device identifier is shared with ads, partners, analytics, logs, or push payloads.
- Data processing purpose: app functionality, account management, fraud/security prevention, notifications, user support, diagnostics, and optional contextual ads or partner placements.
- Encryption in transit: required for all API traffic and store-submitted production builds.
- Data deletion requests: available through profile withdrawal request and privacy export/delete support flow.
- Third-party SDK review: Expo, FCM, Sentry, analytics, and advertising/partner SDK usage must be reviewed before each submission.
- Privacy policy: https://salaryhijacking.com/privacy

## Console Entry Notes

- Mark financial data as collected for app functionality only.
- Do not mark raw financial data as shared for advertising.
- Mark identifiers only when they are used for account, security, push, support, or diagnostics.
- Confirm final answers against the deployed build before public rollout.
