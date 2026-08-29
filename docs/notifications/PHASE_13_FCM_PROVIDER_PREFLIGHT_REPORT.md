# PHASE 13 FCM Provider Runtime Preflight

Generated: 2026-08-29
Updated: 2026-08-29 after post-deploy credential recheck

## Scope

This report covers only the PHASE 13 REL-006 provider-backed FCM runtime gate for the strict same-RC ARM64 Android QA APK.

- Application RC source SHA: `08005cff94e4f0661d2ae809d7d508379ab3092a`
- RC source fingerprint: `90045513FD9C672C30116747A7E5A8D7E582BE47BF5DB17026B4FD69EA490D49`
- ARM64 APK SHA-256: `ac263de1ebc7660a336a45609d13accfcc0a468feb562f8a78cb94222a893ff3`
- Android package: `com.salaryhijacking.mobile`
- Galaxy device: `SM-S921N`
- Galaxy Android: `16`
- Galaxy ABI: `arm64-v8a`

No raw FCM token, service-account credential, service token, private key, personal data, or financial value is recorded here.

## Device Preflight

`adb devices -l` reported `R3CX303K9EA` as `device`.

Device/package readback:

| Check | Result |
| --- | --- |
| Manufacturer | samsung |
| Model | SM-S921N |
| Android version | 16 |
| ABI | arm64-v8a |
| Package | com.salaryhijacking.mobile |
| Version | 1.0.0 / 1 |
| POST_NOTIFICATIONS | granted for active user |
| FCM receive permission | granted |

## Staging Notifications Worker

Worker: `salary-hijacking-notifications-staging`

| Check | Result |
| --- | --- |
| Deployment exists | PASS |
| Latest observed deployment | 2026-08-25T10:45:05.612Z |
| `/notifications/v1/health` | HTTP 200 |
| `/notifications/v1/ready` | HTTP 200, status ready, serviceOk true |
| `/notifications/v1/manifest` | HTTP 200 |
| Environment | staging |
| `FCM_PROJECT_ID` | MATCHES expected staging project |
| `FCM_DRY_RUN` | false |
| `FCM_DISABLE_NETWORK` | false |
| `NOTIFICATIONS_DISABLE_HTTP_SEND` | false |

## Credential Presence

Observed staging secret names after a fresh `wrangler secret list --env staging` check from `services/notifications`:

- `GOOGLE_SERVICE_ACCOUNT_JSON`
- `NOTIFICATIONS_OPERATION_WEBHOOK_TOKEN`
- `NOTIFICATIONS_SERVICE_TOKEN`

Required FCM provider credential presence:

| Credential | Presence |
| --- | --- |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | PRESENT |
| `FCM_CLIENT_EMAIL` | MISSING |
| `FCM_PRIVATE_KEY` | MISSING |
| `FCM_PROJECT_ID` | PRESENT as staging var |
| `NOTIFICATIONS_SERVICE_TOKEN_SHA256` | MISSING |
| `NOTIFICATIONS_SERVICE_TOKEN` | PRESENT |
| `NOTIFICATIONS_OPERATION_WEBHOOK_TOKEN` | PRESENT |

The notifications Worker supports either `GOOGLE_SERVICE_ACCOUNT_JSON` or the pair `FCM_CLIENT_EMAIL` + `FCM_PRIVATE_KEY`, with `FCM_PROJECT_ID`.

## Provider Send Path

Available internal provider path:

- `POST /notifications/v1/send`
- service authorization required
- FCM HTTP v1 client can use the deployed `GOOGLE_SERVICE_ACCOUNT_JSON`

Provider-backed foreground/background/tap/deeplink runtime was not executed in this pass because the deployed Worker requires a service token for `/send`, `/multicast`, `/topic`, `/condition`, and `/validate`; Cloudflare secrets are write-only and the raw `NOTIFICATIONS_SERVICE_TOKEN` value is not available in the local runtime or evidence.

The current strict same-RC Android APK also registers its notification token through `Notifications.getExpoPushTokenAsync(...)`, then the API stores only `push_token_hash` and returns `pushTokenHashOnly: true`. The current deployed FCM Worker sends through FCM HTTP v1 and requires a raw FCM registration token at send time. No current evidence path exposes a raw token, and evidence must remain token-free.

Additional checks:

- The Worker-name override plus `--env staging` was rejected because Wrangler resolved it as `salary-hijacking-notifications-staging-staging`; the config-based invocation from `services/notifications` is the canonical check used here.
- The post-deploy recheck reported `GOOGLE_SERVICE_ACCOUNT_JSON`, `NOTIFICATIONS_OPERATION_WEBHOOK_TOKEN`, and `NOTIFICATIONS_SERVICE_TOKEN`.
- `/health` and `/ready` stayed HTTP 200; `/ready` redacts FCM client status and cannot substitute for provider-backed delivery evidence.
- A request to the Worker send family without service authorization returned HTTP 403 before provider send; this cannot be used as provider-auth evidence.
- The user-facing API `POST /api/v1/notifications/test` creates an in-app notification record only; it does not exercise the FCM provider send path.

## REL-006 Decision

| Gate | Status |
| --- | --- |
| FCM device token registration | PARTIAL_CURRENT_RC_REGISTERS_EXPO_PUSH_TOKEN_HASH_ONLY |
| FCM provider auth | BLOCKED_SERVICE_AUTH_CALLER_TOKEN_NOT_AVAILABLE |
| FCM foreground delivery | NOT_RUN_PROVIDER_SEND_BLOCKED |
| FCM background delivery | NOT_RUN_PROVIDER_SEND_BLOCKED |
| FCM tap | NOT_RUN_PROVIDER_SEND_BLOCKED |
| FCM deeplink | NOT_RUN_PROVIDER_SEND_BLOCKED |
| Duplicate delivery count | UNVERIFIED_PROVIDER_SEND_BLOCKED |
| Fatal count | 0 for device/package preflight and existing Galaxy runtime |
| ANR count | 0 for device/package preflight and existing Galaxy runtime |

REL-006 remains `PARTIAL_EXTERNAL_FCM_PROVIDER_RUNTIME`.

## Required User Action

Use one of the following token-safe paths, without exposing secret or raw push-token values in chat/evidence:

- Run an already-authorized staging server-side notification send path that can target the Galaxy's real FCM registration token and return only privacy-safe delivery evidence.
- Or make the Worker `/send` service authorization available to the local validation harness via a secret-safe local environment mechanism, and provide a token-safe way to obtain or target the Galaxy's real FCM registration token.
- If the product decision is that the Android client should register native FCM tokens rather than Expo push tokens for this Worker, approve a new application RC remediation. That would require source changes and must not be applied to the frozen PHASE 12/13 RC.

After the authorized send path and deliverable token path are available, rerun provider-backed push delivery on the same Galaxy device and same strict same-RC ARM64 APK.
