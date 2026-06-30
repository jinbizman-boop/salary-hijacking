# App Store Privacy Nutrition Label

This file is the repository-local draft for App Store Connect privacy details. It is not proof that App Store Connect has been submitted. Final entries must match the production app build, deployed API behavior, SDK list, and privacy policy.

## App Store Privacy

- Data Used to Track You: None.
- Data Linked to You: email address, user ID, payroll plan data, expense data, savings data, community content, notification preferences, support requests, and account settings when the user signs in.
- Data Not Linked to You: crash logs, diagnostics, performance metrics, and aggregate app interactions where identifiers are removed.
- Financial Data: collected for app functionality only and not used for advertising or third-party tracking.
- Contact Info: email is used for account authentication, support, privacy requests, and security notices.
- User Content: community posts, comments, uploads, and profile content are user-generated content.
- Tracking: no App Tracking Transparency prompt is required unless a future verified ads policy introduces tracking.
- Privacy policy: https://salaryhijacking.com/privacy

## Console Entry Notes

- Do not declare financial data as tracking data.
- Do not declare third-party advertising tracking unless a future implementation adds tracking and policy approval.
- Verify SDK manifests and privacy manifests before public rollout.
