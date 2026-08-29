# PHASE 13 FCM Provider Runtime Preflight

Generated: 2026-08-29

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

Observed staging secret names:

- `NOTIFICATIONS_OPERATION_WEBHOOK_TOKEN`
- `NOTIFICATIONS_SERVICE_TOKEN`

Required FCM provider credential presence:

| Credential | Presence |
| --- | --- |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | MISSING |
| `FCM_CLIENT_EMAIL` | MISSING |
| `FCM_PRIVATE_KEY` | MISSING |
| `FCM_PROJECT_ID` | PRESENT as staging var |
| `NOTIFICATIONS_SERVICE_TOKEN_SHA256` | MISSING |
| `NOTIFICATIONS_OPERATION_WEBHOOK_TOKEN` | PRESENT |

The notifications Worker supports either `GOOGLE_SERVICE_ACCOUNT_JSON` or the pair `FCM_CLIENT_EMAIL` + `FCM_PRIVATE_KEY`, with `FCM_PROJECT_ID`.

## Provider Send Path

Available internal provider path:

- `POST /notifications/v1/send`
- service authorization required
- FCM HTTP v1 client requires Firebase service-account credentials before provider send can be executed

Because no Firebase service-account credential binding is present in the staging Worker, REL-006 provider-backed foreground/background/tap/deeplink runtime was not executed.

## REL-006 Decision

| Gate | Status |
| --- | --- |
| FCM device token registration | PARTIAL_PERMISSION_GRANTED_PROVIDER_RUNTIME_BLOCKED |
| FCM provider auth | EXTERNAL_BLOCKER_CREDENTIAL_BINDING_MISSING |
| FCM foreground delivery | NOT_RUN_PROVIDER_CREDENTIAL_MISSING |
| FCM background delivery | NOT_RUN_PROVIDER_CREDENTIAL_MISSING |
| FCM tap | NOT_RUN_PROVIDER_CREDENTIAL_MISSING |
| FCM deeplink | NOT_RUN_PROVIDER_CREDENTIAL_MISSING |
| Duplicate delivery count | UNVERIFIED_PROVIDER_SEND_BLOCKED |
| Fatal count | 0 for device/package preflight and existing Galaxy runtime |
| ANR count | 0 for device/package preflight and existing Galaxy runtime |

REL-006 remains `PARTIAL_EXTERNAL_FCM_PROVIDER_RUNTIME`.

## Required User Action

Configure staging Worker Firebase provider credentials, without exposing values:

- Preferred: add `GOOGLE_SERVICE_ACCOUNT_JSON`
- Alternate: add both `FCM_CLIENT_EMAIL` and `FCM_PRIVATE_KEY`
- If hashed service-token auth is mandatory for the deployed staging contract, add `NOTIFICATIONS_SERVICE_TOKEN_SHA256`

After credential presence is restored, rerun provider-backed push delivery on the same Galaxy device and same strict same-RC ARM64 APK.
