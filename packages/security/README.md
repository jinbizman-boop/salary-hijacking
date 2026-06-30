# `@salary-hijacking/security`

급여납치 Salary Hijacking Platform의 공용 보안 패키지입니다. 이 패키지는 API, 모바일, 관리자 콘솔, 워커, 배포/QA 파이프라인이 동일한 보안 계약을 사용하도록 고정된 public boundary를 제공합니다.

이 문서는 `packages/security` 패키지의 최종 운영 기준 README입니다. 인증·암호화·마스킹·권한·rate limit·개인정보 보호·서버 권위 계산 정책을 하나의 보안 계약으로 묶고, `src/index.ts`, `src/encryption.ts`, `src/masking.ts`, `src/permission.ts`, `src/rate-limit.ts`, `package.json`의 완성 상태를 검증하는 기준을 정의합니다.

## 패키지 역할

`@salary-hijacking/security`는 급여납치 플랫폼에서 다음 보안 책임을 담당합니다.

- 급여, 예산, 지출, 저축, 알림, 레벨업, 커뮤니티, 광고/제휴, 운영/관리자 영역의 서버 권위 보안 계약 제공
- AES-256-GCM 기반 민감 데이터 암호화와 key rotation 계약 제공
- refresh token, idempotency key, webhook signature, lookup value hashing 제공
- 로그, API 응답, 에러, URL, HTTP header, deep object의 민감정보 마스킹 제공
- RBAC/ABAC 기반 권한 판정, 관리자 MFA, 서비스 계정, audit obligation 제공
- 인증·금융 쓰기·커뮤니티·알림·광고 이벤트·관리자·migration 실행 rate limit 제공
- 광고/커뮤니티/알림/레벨업 영역에 raw 금융정보가 유입되지 않도록 데이터 분리 정책 제공
- KRW 원 단위 정수 금액, 서버 권위 계산, client final calculation 금지 정책 제공

## 완료 기준

이 패키지는 다음 기준을 모두 만족할 때 파일 단위 및 패키지 단위 완료 상태로 판정합니다.

| 영역       | 완료 기준                                                                                |
| ---------- | ---------------------------------------------------------------------------------------- |
| Entrypoint | `src/index.ts`가 4개 보안 모듈을 모두 export하고 completeness assertion을 직접 실행      |
| Encryption | AES-256-GCM, AAD binding, keyring, KID rotation, hash/signature/password helper 제공     |
| Masking    | secret/token/PII/financial/header/error/log/API response/deep object sanitization 제공   |
| Permission | RBAC/ABAC, tenant/user ownership, admin MFA, service-only, audit obligation 제공         |
| Rate limit | auth/write/admin/community/ads/notification/migration 정책과 안전한 key fingerprint 제공 |
| Package    | `package.json` export map, typecheck/build/security/privacy/quality gate 제공            |
| Runtime    | `assertSecurityPackageCompleteness()` 및 각 모듈 self-test 통과                          |
| Privacy    | raw secret/token/PII/financial logging 금지, ads/community raw financial join 금지       |

## 디렉터리 구조

```txt
packages/security
├── package.json
├── README.md
└── src
    ├── index.ts
    ├── encryption.ts
    ├── masking.ts
    ├── permission.ts
    └── rate-limit.ts
```

## Public exports

```ts
import { securityPackage, assertSecurityPackageCompleteness, getSecurityPackageCompletenessReport, encryption, masking, permission, rateLimit } from "@salary-hijacking/security";
```

세부 모듈 export도 제공합니다.

```ts
import { encryptJson, decryptJson } from "@salary-hijacking/security/encryption";
import { sanitizeLogPayload, maskError } from "@salary-hijacking/security/masking";
import { evaluatePermission, assertPermission } from "@salary-hijacking/security/permission";
import { evaluateRateLimit, createMemoryRateLimitStore } from "@salary-hijacking/security/rate-limit";
```

호환 alias로 `@salary-hijacking/security/rateLimit`도 제공합니다.

## 보안 계약

### 서버 권위 원칙

급여납치의 급여·예산·지출·저축 계산은 서버 권위가 원칙입니다.

- 클라이언트는 입력, 표시, 임시 preview만 담당합니다.
- 최종 납치금액, 일일 예산 잔액, 고정지출/저축 합계, 목표 달성률은 서버에서 확정합니다.
- 브라우저 런타임은 secret, raw financial, direct database, authoritative rate limit 권한을 갖지 않습니다.

### 데이터 분리 원칙

광고, 커뮤니티, 알림, 레벨업 영역은 금융 원본 데이터와 직접 결합하지 않습니다.

- 광고 이벤트에는 raw 급여/지출/저축 payload를 넣지 않습니다.
- 커뮤니티 게시글/댓글/반응에는 사용자 금융 원본 데이터를 자동 주입하지 않습니다.
- 알림 payload에는 raw financial metadata 대신 최소 식별자와 서버 조회 key만 사용합니다.
- 레벨업 추천에는 민감 금융정보를 직접 전달하지 않습니다.

### 민감정보 보호 원칙

- raw secret logging 금지
- raw token logging 금지
- raw PII logging 금지
- raw financial logging 금지
- rate-limit key에 raw email, phone, 주민번호, JWT, bearer token, secret 입력 금지
- 사용자 식별자는 fingerprint 처리 후 key 또는 audit metadata에 사용

## 모듈별 책임

### `src/encryption.ts`

암호화, 해시, 서명, password hashing, key rotation을 담당합니다.

주요 기능:

- AES-256-GCM encryption/decryption
- AAD purpose/data-class binding
- keyring 및 KID 기반 rotation
- SHA-256 digest
- HMAC-SHA-256 signature
- refresh token hash
- idempotency key hash
- webhook/API payload signature
- PBKDF2-HMAC-SHA-256 password hash
- constant-time comparison
- env keyring loader
- completeness report/self-test

대표 사용 예시:

```ts
import { encryptJson, decryptJson } from "@salary-hijacking/security/encryption";

const encrypted = await encryptJson(
  { accountAlias: "월급통장", bankCode: "NH" },
  {
    purpose: "payroll.account-metadata",
    dataClass: "payroll",
    keyring,
  },
);

const decrypted = await decryptJson(encrypted, {
  purpose: "payroll.account-metadata",
  dataClass: "payroll",
  keyring,
});
```

### `src/masking.ts`

로그, 응답, 에러, header, URL, deep object의 민감정보 마스킹을 담당합니다.

주요 기능:

- email/phone/name/주민등록번호/account/card/IP/token/JWT/Bearer masking
- URL username/password/query masking
- HTTP header masking
- error masking
- API response sanitization
- log payload sanitization
- deep object circular reference 방어
- raw secret/token/PII/financial leakage assertion
- DOM.Iterable 의존 없는 `URLSearchParams.forEach()` 기반 URL masking

대표 사용 예시:

```ts
import { sanitizeLogPayload, assertNoSensitiveLeak } from "@salary-hijacking/security/masking";

const safeLog = sanitizeLogPayload({
  userId: "usr_123",
  email: "user@example.com",
  accessToken: "Bearer raw-token",
  payrollAmount: 2700000,
});

assertNoSensitiveLeak(safeLog);
```

### `src/permission.ts`

RBAC/ABAC 권한 판정과 admin/service/user boundary를 담당합니다.

주요 기능:

- 역할 10종: guest, user, support, moderator, finance, operations, auditor, admin, owner, service
- action 15종: read, create, update, delete, export, approve, moderate, dispatch, manage 등
- resource 27종: payroll, budget, expense, saving, growth, notification, community, ads, admin, migration 등
- tenant/user ownership enforcement
- admin MFA enforcement
- service-only enforcement
- raw financial ads/community 차단
- audit obligation 산출

대표 사용 예시:

```ts
import { assertPermission } from "@salary-hijacking/security/permission";

assertPermission({
  subject: {
    userId: "usr_1",
    tenantId: "tenant_1",
    roles: ["user"],
    mfaVerified: false,
  },
  action: "update",
  resource: "expense.variable",
  object: { ownerUserId: "usr_1", tenantId: "tenant_1" },
  context: { runtime: "server", purpose: "expense.write" },
});
```

### `src/rate-limit.ts`

API 남용 방지, 인증 공격 방어, 금융 쓰기 보호, 관리자 작업 보호를 담당합니다.

주요 기능:

- fixed-window, sliding-window, token-bucket 지원
- auth.login, auth.signup, auth.refresh-token, auth.mfa-verify 정책
- payroll/budget/expense/saving/growth write 정책
- notification dispatch service-account 정책
- community post/comment/reaction 정책
- ads event/partner click 정책
- admin console/impersonation 정책
- webhook/migration 정책
- raw identifier 없는 fingerprint key 생성
- Retry-After 및 X-RateLimit header 생성

대표 사용 예시:

```ts
import { createMemoryRateLimitStore, assertRateLimitAllowed } from "@salary-hijacking/security/rate-limit";

const store = createMemoryRateLimitStore();

await assertRateLimitAllowed(
  {
    policy: "expense.write",
    runtime: "server",
    idempotencyKey: "idem_123",
    subject: {
      isAuthenticated: true,
      userId: "usr_1",
      tenantId: "tenant_1",
      ipAddress: "203.0.113.10",
    },
    route: "/api/expenses/variable",
    method: "POST",
  },
  store,
);
```

## 필수 스크립트

`package.json`은 다음 품질 게이트를 제공합니다.

```bash
pnpm run typecheck
pnpm run build
pnpm run validate:package
pnpm run validate:exports
pnpm run validate:dist
pnpm run security:assert
pnpm run security:self-test
pnpm run security:scan
pnpm run privacy:check
pnpm run security:validate
pnpm run quality
```

### 권장 검증 순서

```bash
pnpm install
pnpm --filter @salary-hijacking/security run security:validate
pnpm --filter @salary-hijacking/security run quality
```

## Completeness report

패키지 전체 완료 상태는 public entrypoint에서 확인합니다.

```ts
import { assertSecurityPackageCompleteness, getSecurityPackageCompletenessReport } from "@salary-hijacking/security";

assertSecurityPackageCompleteness();

const report = getSecurityPackageCompletenessReport();

if (!report.ok) {
  throw new Error(report.missing.join(", "));
}
```

정상 상태의 핵심 값은 다음과 같습니다.

```txt
ok: true
moduleCount: 4
completeModuleCount: 4
reservedModuleCount: 0
missing: []
```

## 환경 변수 계약

암호화 keyring은 운영 환경 변수 또는 secret manager에서 주입해야 합니다. README에는 실제 key를 기록하지 않습니다.

권장 환경 변수 이름:

```txt
SALARY_HIJACKING_SECURITY_KEYRING
SALARY_HIJACKING_ACTIVE_KID
SALARY_HIJACKING_PASSWORD_PEPPER_KEYRING
SALARY_HIJACKING_WEBHOOK_SIGNING_KEY
SALARY_HIJACKING_IDEMPOTENCY_HASH_KEY
```

운영 원칙:

- key material은 repository에 저장하지 않습니다.
- active key와 decrypt-only key를 분리합니다.
- retired key는 신규 암호화에 사용할 수 없습니다.
- key rotation은 배포 전후 양방향 decrypt test를 통과해야 합니다.
- secret manager 접근 권한은 service account와 운영자 최소 권한으로 제한합니다.

## API 적용 기준

API route는 다음 순서로 보안 레이어를 적용합니다.

```txt
1. request id 생성
2. rate-limit 평가
3. 인증/session 검증
4. permission 평가
5. input validation
6. server-authoritative domain calculation
7. encryption/hash/signature 적용
8. response masking
9. audit log 기록
```

금융 쓰기 API는 반드시 idempotency key를 요구합니다.

```txt
POST /api/payroll/plans
POST /api/budgets/daily
POST /api/expenses/fixed
POST /api/expenses/variable
POST /api/savings/fixed
POST /api/growth/tasks/complete
```

## 관리자 콘솔 적용 기준

관리자 콘솔은 다음 조건을 만족해야 합니다.

- admin 또는 owner 권한
- MFA verified
- tenant boundary 확인
- raw financial export 제한
- audit log 필수
- rate-limit 정책 `admin.console` 또는 `admin.impersonate` 적용

## 광고/제휴 적용 기준

광고/제휴 영역은 다음 계약을 지킵니다.

- raw payroll/expense/saving data 사용 금지
- financial raw join 금지
- consent 없이 민감 타겟팅 금지
- click/impression/conversion event는 pseudonymous identifier 사용
- rate-limit 정책 `ads.event-track`, `partner.offer-click` 적용
- audit 가능한 campaign/event id만 기록

## 커뮤니티 적용 기준

커뮤니티 영역은 다음 계약을 지킵니다.

- 익명 게시글 작성자 식별정보 비노출
- 게시글/댓글에 raw financial metadata 자동 삽입 금지
- moderator/admin만 moderation 가능
- 신고/숨김/삭제/복구는 audit 대상
- 글쓰기/댓글/반응 rate-limit 적용
- API 응답 전 masking 적용

## 알림 적용 기준

알림 영역은 다음 계약을 지킵니다.

- dispatch는 service account만 수행
- push token은 암호화 또는 token hash로 보호
- payload에는 raw financial data를 넣지 않음
- 사용자 알림 preference와 consent를 확인
- notification.dispatch rate-limit 적용

## 테스트 매트릭스

| 테스트               | 목적                            | 기대 결과 |
| -------------------- | ------------------------------- | --------- |
| `typecheck`          | strict TS compile               | PASS      |
| `build`              | ESM/d.ts dist 생성              | PASS      |
| `security:assert`    | entrypoint completeness         | PASS      |
| `security:self-test` | 4개 모듈 runtime self-test      | PASS      |
| `security:scan`      | 위험 정책 true 설정 탐지        | PASS      |
| `privacy:check`      | package 보안/개인정보 계약 검증 | PASS      |
| `quality`            | release gate 통합 검증          | PASS      |

## 소비처 체크리스트

API, 모바일, 관리자, 워커는 `@salary-hijacking/security`를 사용할 때 다음 항목을 확인해야 합니다.

- [ ] API route에서 rate-limit를 인증 전 또는 인증 직후 적용했는가?
- [ ] 금융 쓰기 요청에 idempotency key를 요구하는가?
- [ ] 권한 판정에 tenantId, ownerUserId, runtime, purpose가 포함되는가?
- [ ] 로그에 raw secret/token/PII/financial data가 남지 않는가?
- [ ] 광고/커뮤니티/알림/레벨업 payload가 raw financial data를 포함하지 않는가?
- [ ] 관리자 작업은 MFA와 audit log를 요구하는가?
- [ ] 암호화 keyring이 secret manager에서 주입되는가?
- [ ] 배포 전 `security:validate`와 `quality`가 통과하는가?

## 운영 주의사항

- 이 패키지는 runtime dependency를 갖지 않는 것을 원칙으로 합니다.
- Node.js 20.11 이상을 기준으로 운영합니다.
- 브라우저가 authoritative secret, database, rate-limit 권한을 갖도록 설계하지 않습니다.
- README, test fixture, log sample에 실제 secret 또는 실제 사용자 데이터를 기록하지 않습니다.
- package export map을 변경할 때는 API, 모바일, 관리자, 워커 소비처 import 경로를 함께 검증합니다.

## 최종 판정

`packages/security`는 다음 파일이 최신 완료본일 때 패키지 단위 완료 상태입니다.

```txt
src/index.ts
src/encryption.ts
src/masking.ts
src/permission.ts
src/rate-limit.ts
package.json
README.md
```

현재 README는 위 보안 패키지 계약을 문서화하는 최종본이며, 별도 후속 문서 작업 없이 `packages/security/README.md`로 배치할 수 있습니다.
