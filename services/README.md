# services

급여납치(Salary Hijacking) 플랫폼의 독립 실행 백엔드 서비스 루트다. 이 폴더는 `api`, `scheduler`, `notifications`처럼 Cloudflare Workers/Queues/Cron 기반으로 독립 배포되는 서비스를 보관하며, 급여·예산·지출·저축·알림·레벨업·커뮤니티·광고·운영 데이터를 서버 권위 원칙으로 처리하는 실행 경계를 정의한다.

본 README는 `services` 폴더의 최종 운영 기준 문서다. 서비스별 책임, 배포 단위, 내부 통신, 보안·개인정보 정책, Queue/Cron/Worker 구성, 테스트·품질 게이트, 상용 운영 기준을 문서상·이론상 최종본 기준으로 고정한다.

---

## 1. 서비스 루트의 역할

`services`는 급여납치 플랫폼의 서버 실행 계층을 모아두는 루트 디렉터리다. 프론트엔드가 화면과 사용자 경험을 담당한다면, `services`는 모든 중요한 계산과 상태 전이를 서버 권위로 확정한다.

핵심 책임은 다음과 같다.

1. 인증, 사용자, 급여 계획, 예산, 고정지출, 고정저축, 변동지출, 알림, 성장, 커뮤니티, 광고/제휴, 관리자 운영 API를 제공한다.
2. 급여일 알림, 고정지출 예정 알림, 월간 급여납치 마감, 데이터 보존기간 정리를 Scheduler로 자동화한다.
3. FCM HTTP v1 기반 알림 발송, retry queue, push-token cleanup을 Notifications 서비스로 분리한다.
4. 각 서비스의 Worker entrypoint, Queue, Cron, env, secret, build, test, deploy 계약을 분리한다.
5. 급여·지출·저축·납치금액 계산은 클라이언트가 아니라 서버에서 확정한다.
6. KRW 금액은 0 이상의 정수로만 처리하고, 음수·소수·비정상 금액은 거부한다.
7. raw push token, 급여액, 계좌, 카드, 대출, 저축, 지출, 급여명세 원문은 log, audit, webhook, 광고 payload에 남기지 않는다.
8. 광고/제휴 인프라는 급여·지출·저축 원문 타겟팅과 분리한다.
9. 관리자/운영 mutation은 권한, 사유, 감사 로그를 강제한다.
10. 모든 서비스는 health/ready/manifest, strict typecheck, QA, deploy smoke 기준을 제공해야 한다.

---

## 2. 최종 서비스 구조 계약

`services` 하위 구조는 아래 기준으로 고정한다.

```text
services
├─ README.md
├─ api
│  ├─ README.md
│  ├─ package.json
│  ├─ tsconfig.json
│  ├─ wrangler.toml
│  └─ src
│     ├─ index.ts
│     ├─ app.ts
│     ├─ middleware
│     └─ routes
├─ scheduler
│  ├─ README.md
│  ├─ package.json
│  ├─ tsconfig.json
│  ├─ wrangler.toml
│  └─ src
│     ├─ index.ts
│     └─ jobs
│        ├─ payday-reminder.job.ts
│        ├─ fixed-expense-reminder.job.ts
│        ├─ monthly-hijack-close.job.ts
│        └─ data-retention-cleanup.job.ts
└─ notifications
   ├─ README.md
   ├─ package.json
   ├─ tsconfig.json
   ├─ wrangler.toml
   └─ src
      ├─ index.ts
      ├─ fcm.client.ts
      ├─ retry-queue.ts
      └─ push-token-cleanup.ts
```

각 서비스는 독립 패키지이지만 동일한 보안·개인정보·품질 계약을 따른다.

| 서비스                | 패키지명                          | 책임                                    | Runtime                           |
| --------------------- | --------------------------------- | --------------------------------------- | --------------------------------- |
| API Service           | `@salary-hijacking/api`           | 사용자/API/관리자/도메인 서버 권위 처리 | Cloudflare Workers                |
| Scheduler Service     | `@salary-hijacking/scheduler`     | Cron/Queue 기반 자동화 job 실행         | Cloudflare Workers + Cron + Queue |
| Notifications Service | `@salary-hijacking/notifications` | FCM 발송, retry, push-token cleanup     | Cloudflare Workers + Queue        |

---

## 3. 공통 기술 기준

| 영역            | 기준                                               |
| --------------- | -------------------------------------------------- |
| Language        | TypeScript strict                                  |
| Runtime         | Cloudflare Workers Module Worker                   |
| Package Manager | pnpm workspace                                     |
| Build           | esbuild + tsc declaration emit                     |
| Validation      | Zod 또는 동등한 schema validation                  |
| DB              | Neon PostgreSQL + Drizzle 또는 repository contract |
| Queue           | Cloudflare Queues                                  |
| Scheduler       | Cloudflare Cron Triggers                           |
| Storage         | Cloudflare R2 또는 storage adapter                 |
| Auth            | JWT, refresh rotation, service-token SHA-256       |
| Logs            | JSON structured logs, requestId 기반 추적          |
| Time            | UTC 저장, Asia/Seoul 표시                          |
| Money           | KRW integer only                                   |

---

## 4. 서버 권위 원칙

급여납치 서비스 계층의 모든 핵심 상태는 서버에서 확정한다.

1. 클라이언트는 입력과 조회 요청만 보낸다.
2. 급여 계획, 월급일, 예산, 고정지출, 고정저축, 변동지출, 납치금액, 잔여 예산, 월간 마감은 서버가 계산한다.
3. 클라이언트 계산값은 참고값으로만 사용하고, 저장·정산·알림·레벨업·광고 판단에 직접 신뢰하지 않는다.
4. 모든 mutation은 인증 사용자 또는 관리자 권한을 검증한다.
5. 사용자 소유 리소스는 IDOR 방어를 적용한다.
6. 관리자 mutation은 `X-Admin-Reason` 또는 동등한 사유 필드를 요구한다.
7. 모든 중요한 상태 전이는 audit event로 남긴다.

대표 계산 기준은 다음과 같다.

```text
planned_total_expense = fixed_expense + daily_living_budget + planned_other_expense
expected_hijack = max(0, expected_salary - planned_total_expense)
today_remaining_budget = max(0, daily_limit - today_variable_expense)
monthly_actual_hijack = max(0, actual_income + carry_over - actual_expense - actual_savings)
```

---

## 5. 서비스별 책임

### 5.1 API Service

`services/api`는 급여납치의 기본 서버 API다.

필수 책임은 다음과 같다.

- Auth: 회원가입, 로그인, refresh rotation, logout, me, password reset, email verification
- Users: 프로필, 설정, 개인정보 export, 탈퇴/복구
- Payroll: 급여 계획, 급여 홈, 월급일, 예상 납치금액, 월간 정산 조회
- Daily Budgets: 일일 예산, 오늘 잔여, 캘린더, 재계산
- Fixed Expenses: 월세, 카드, 통신, 보험, 구독, 대출, 결제 예정
- Savings: 고정저축, 저축 목표, 입금/출금, 달성률
- Variable Expenses: 변동지출 기록, 환불/무효, 카테고리 통계
- Notifications: 알림 목록, 읽음, preference, device token, internal trigger
- Growth: LV UP, 미션, 챌린지, 경험치, 배지, 성장 콘텐츠
- Community: 글, 댓글, 좋아요, 신고, 익명 표시, moderation
- Uploads: presigned upload, finalize, scan, attach, delete
- Admin: 운영 콘솔, 감사 로그, 신고, 공지, 광고/제휴, CS, incident, metrics

API endpoint는 `/api/v1`을 기본 prefix로 사용한다. 관리자 API는 `/admin/api/v1` 또는 `/admin/auth` 경계를 사용한다.

### 5.2 Scheduler Service

`services/scheduler`는 시간 기반·큐 기반 자동화 계층이다.

필수 job은 다음과 같다.

| Job                    | 파일                                     | 책임                                            |
| ---------------------- | ---------------------------------------- | ----------------------------------------------- |
| Payday Reminder        | `src/jobs/payday-reminder.job.ts`        | 급여일 전/당일/미확인 알림 후보 계산            |
| Fixed Expense Reminder | `src/jobs/fixed-expense-reminder.job.ts` | 고정지출 결제 전/당일/연체 알림 후보 계산       |
| Monthly Hijack Close   | `src/jobs/monthly-hijack-close.job.ts`   | 월간 실제 납치금액, 차이, 이월, 달성 상태 확정  |
| Data Retention Cleanup | `src/jobs/data-retention-cleanup.job.ts` | 보존기간 만료 데이터 익명화·삭제·외부 객체 정리 |

Scheduler는 `fetch`, `scheduled`, `queue` entrypoint를 제공하고, 모든 실행은 requestId, actorId, idempotencyKey, job lock을 사용한다.

### 5.3 Notifications Service

`services/notifications`는 알림 발송 실행 계층이다.

필수 책임은 다음과 같다.

- FCM HTTP v1 OAuth2 service account client
- token/topic/condition/multicast 발송
- validateOnly/dry-run
- retry queue 및 backoff
- invalid token cleanup
- stale/expired/revoked push token cleanup
- marketing consent guard
- raw token/tokenHash 분리
- 민감 금융 데이터 payload 차단
- Queue/Cron/HTTP internal endpoint

---

## 6. 내부 통신 계약

서비스 간 직접 DB 공유를 피하고, internal API 또는 Queue를 통해 연결한다.

```text
Frontend / Admin Console
  → services/api
  → DB / R2 / Audit / Domain Events
  → services/scheduler
  → services/notifications
  → FCM / Queue / Growth Events
```

대표 내부 경계는 다음과 같다.

| Source        | Target        | 방식                    | 목적                            |
| ------------- | ------------- | ----------------------- | ------------------------------- |
| Scheduler     | API           | Internal API            | 후보 조회, 상태 저장, 감사 저장 |
| Scheduler     | Notifications | Queue 또는 Internal API | 알림 발송 요청                  |
| Scheduler     | Growth        | Queue 또는 Internal API | LV UP/경험치 이벤트             |
| API           | Notifications | Internal API 또는 Queue | 즉시 알림, device token 관리    |
| Notifications | API           | Internal API            | token cleanup 결과 반영         |
| API/Admin     | Scheduler     | Internal HTTP           | 수동 preview/run                |

내부 호출은 production에서 service-token 또는 SHA-256 hash 검증을 요구한다.

---

## 7. Queue 계약

공통 Queue 원칙은 다음과 같다.

1. Queue message에는 requestId와 idempotencyKey를 포함한다.
2. 재시도 가능한 오류는 retry/backoff 정책을 따른다.
3. 영구 오류는 dead-letter queue로 이동한다.
4. invalid push token은 retry가 아니라 cleanup으로 분리한다.
5. Queue payload에는 raw 금융 데이터와 raw push token을 포함하지 않는다.
6. Queue audit에는 tokenHash, notificationId, job key 같은 안전 식별자만 남긴다.

대표 Queue는 다음과 같다.

| Binding                     | 용도                           |
| --------------------------- | ------------------------------ |
| `SCHEDULER_OPERATION_QUEUE` | scheduler job 수동/비동기 실행 |
| `NOTIFICATIONS_RETRY_QUEUE` | FCM 발송 및 retry              |
| `GROWTH_EVENTS_QUEUE`       | LV UP/경험치 이벤트            |
| `*_DLQ`                     | 실패 메시지 격리               |

---

## 8. Cron 계약

Cron은 UTC 기준으로 설정한다. 한국 시간 표시는 Asia/Seoul 기준으로 변환한다.

권장 기본 Cron은 다음과 같다.

```text
0 23 * * *  # 매일 08:00 KST
```

실행 대상은 환경변수로 on/off 가능해야 한다.

```text
SCHEDULER_PAYDAY_REMINDER_ENABLED
SCHEDULER_FIXED_EXPENSE_REMINDER_ENABLED
SCHEDULER_MONTHLY_HIJACK_CLOSE_ENABLED
SCHEDULER_DATA_RETENTION_CLEANUP_ENABLED
```

---

## 9. 환경변수와 secrets 원칙

`wrangler.toml`에는 공개 가능한 운영 플래그만 저장한다. token, private key, service account, webhook secret은 반드시 `wrangler secret put`으로 등록한다.

공통 환경변수 예시는 다음과 같다.

```text
APP_ENV
ENVIRONMENT
NODE_ENV
SERVICE_NAME
TIMEZONE
API_INTERNAL_BASE_URL
CORS_ALLOWED_ORIGINS
ALLOWED_ORIGINS
RAW_FINANCIAL_DATA_LOGGED=false
RAW_PUSH_TOKEN_LOGGED=false
RAW_AMOUNT_IN_NOTIFICATION_PAYLOAD=false
ADS_FINANCIAL_TARGETING_FORBIDDEN=true
TOKEN_HASH_ONLY=true
```

공통 secret 예시는 다음과 같다.

```bash
wrangler secret put API_INTERNAL_SERVICE_TOKEN
wrangler secret put SCHEDULER_SERVICE_TOKEN_SHA256
wrangler secret put NOTIFICATIONS_SERVICE_TOKEN_SHA256
wrangler secret put GOOGLE_SERVICE_ACCOUNT_JSON
wrangler secret put FCM_PRIVATE_KEY
wrangler secret put SCHEDULER_OPERATION_WEBHOOK_TOKEN
```

금지되는 항목은 다음과 같다.

```text
wrangler.toml에 private key 저장
wrangler.toml에 raw service token 저장
로그에 Authorization header 출력
로그에 raw push token 출력
로그에 급여/계좌/카드/대출/저축/지출 원문 출력
외부 webhook에 금융 원문 payload 전송
```

---

## 10. 개인정보·금융 데이터 보호 기준

서비스 전체의 개인정보 보호 기준은 다음과 같다.

1. raw push token은 요청 경계에서만 사용하고 저장·로그·감사에는 tokenHash만 남긴다.
2. 급여액, 급여명세, 계좌, 카드, 대출, 저축액, 지출액, 납치금액 원문은 알림 payload에 포함하지 않는다.
3. audit/log/webhook은 sanitization을 거친다.
4. 개인정보 export는 만료 후 data-retention cleanup이 삭제한다.
5. 탈퇴 사용자는 유예기간 이후 익명화 또는 삭제한다.
6. legal hold 또는 active dispute 상태는 정리 대상에서 제외한다.
7. 관리자 조회는 마스킹·집계·권한 정책을 따른다.
8. 광고/제휴 시스템은 개인 금융 원문을 타겟팅에 사용하지 않는다.

---

## 11. 광고·제휴 분리 정책

광고/제휴 기능은 서비스 계층에서 반드시 금융 원문과 분리한다.

허용되는 방식은 다음과 같다.

- contextual 광고
- 사용자 명시 동의 기반 마케팅 알림
- 집계/비식별 통계
- one-way hash 기반 내부 운영 식별자
- 광고 표시 라벨 `광고` 또는 `제휴`

금지되는 방식은 다음과 같다.

```text
급여액 기반 광고 타겟팅
대출/카드/저축/지출 원문 기반 광고 타겟팅
광고주에게 userId/email/phone/token/금융 원문 전달
납치금액 또는 예산 초과 상태를 광고 타겟팅에 직접 사용
마케팅 수신 동의 없는 광고성 push 발송
```

---

## 12. 감사·운영 로그 기준

공통 audit event는 다음 속성을 가져야 한다.

```text
service
version
requestId
actorId
operation
domain
status
createdAt
rawFinancialDataLogged=false
rawPushTokenLogged=false
adsFinancialTargetingUsed=false
```

운영 로그는 JSON 구조를 따르고, 아래 값은 항상 제거하거나 마스킹한다.

```text
password
accessToken
refreshToken
authorization
cookie
email
phone
residentRegistrationNumber
accountNumber
cardNumber
salary
payroll
income
loan
savings
expense
hijackAmount
pushToken
fcmToken
privateKey
```

---

## 13. API/HTTP 표준 응답

서비스의 HTTP 응답은 공통 envelope를 사용한다.

```json
{
  "success": true,
  "data": {},
  "meta": {
    "service": "salary-hijacking-service-name",
    "version": "3.1.x",
    "requestId": "req_...",
    "path": "/health",
    "timestamp": "2026-06-15T00:00:00.000Z"
  }
}
```

오류 응답은 다음 구조를 따른다.

```json
{
  "success": false,
  "error": {
    "code": "SERVICE_ERROR_CODE",
    "message": "사용자 또는 운영자가 이해 가능한 메시지",
    "status": 400,
    "requestId": "req_..."
  },
  "meta": {
    "service": "salary-hijacking-service-name",
    "version": "3.1.x",
    "requestId": "req_...",
    "path": "/api/path",
    "timestamp": "2026-06-15T00:00:00.000Z"
  }
}
```

---

## 14. 보안 헤더 기준

모든 HTTP 서비스는 다음 보안 헤더를 기본으로 포함한다.

```text
x-request-id
x-service-name
x-service-version
x-content-type-options: nosniff
referrer-policy: no-referrer
cache-control: no-store
permissions-policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()
x-financial-raw-data-exposed: false
x-ad-financial-targeting: separated
```

---

## 15. 빌드·테스트·품질 게이트

각 서비스 패키지는 최소 다음 명령을 제공한다.

```bash
pnpm run typecheck:strict
pnpm run lint
pnpm run format:check
pnpm run test:unit
pnpm run test:integration
pnpm run test:e2e
pnpm run test:qa
pnpm run privacy:check
pnpm run security:scan
pnpm run build
pnpm run deploy:staging
pnpm run deploy:production
```

공통 CI는 다음 조건을 만족해야 한다.

```text
JSON/TOML 문법 정상
TypeScript strict 통과
exactOptionalPropertyTypes 통과
noUncheckedIndexedAccess 통과
noUnusedLocals/noUnusedParameters 통과
Cloudflare Workers 타입 호환
build artifact 검증
privacy marker 검증
security audit 통과
unit/integration/e2e 통과
staging smoke 통과
```

---

## 16. TypeScript 기준

각 서비스의 `tsconfig.json`은 다음 기준을 유지한다.

```text
target: ES2022
lib: ES2022, WebWorker
module: ESNext
moduleResolution: Bundler
strict: true
exactOptionalPropertyTypes: true
noUncheckedIndexedAccess: true
noUnusedLocals: true
noUnusedParameters: true
isolatedModules: true
verbatimModuleSyntax: true
noEmit: true for typecheck
declaration emit: build script에서 별도 override
```

---

## 17. 배포 기준

각 서비스는 development, staging, production 환경을 분리한다.

| 환경        | 목적         | 기준                                            |
| ----------- | ------------ | ----------------------------------------------- |
| development | 로컬 개발    | dry-run, local state, network disabled 가능     |
| staging     | 운영 전 검증 | 실제 Queue/Cron/API/FCM smoke                   |
| production  | 상용 운영    | service-token, secrets, DLQ, observability 필수 |

production 배포 전 필수 확인 항목은 다음과 같다.

```text
Cloudflare Worker 생성
Cloudflare Queue/DLQ 생성
Cron Trigger 활성화
Custom domain 연결
wrangler secrets 등록
API internal endpoint 정상
Notifications FCM 정상
Growth queue 정상
DB migration 적용
R2 bucket 연결
staging smoke 통과
E2E/QA 통과
```

---

## 18. 서비스별 readiness 기준

각 서비스는 아래 endpoint 또는 동등한 readiness 함수를 제공한다.

| Endpoint        | 기준                              |
| --------------- | --------------------------------- |
| `GET /health`   | Worker 생존 확인                  |
| `GET /ready`    | 의존 job/client/completeness 확인 |
| `GET /manifest` | 서비스 manifest 확인              |

서비스별 자체 완성도 함수 예시는 다음과 같다.

```text
assertSchedulerEntrypointCompleteness()
assertPaydayReminderJobCompleteness()
assertFixedExpenseReminderJobCompleteness()
assertMonthlyHijackCloseJobCompleteness()
assertDataRetentionCleanupJobCompleteness()
assertNotificationsServiceCompleteness()
assertFcmClientCompleteness()
assertNotificationRetryQueueCompleteness()
assertPushTokenCleanupCompleteness()
```

---

## 19. 장애 대응 기준

운영 중 장애는 다음 원칙으로 처리한다.

1. API 장애는 사용자 요청에 표준 오류 envelope로 응답한다.
2. Queue 장애는 retry 후 DLQ로 격리한다.
3. FCM 장애는 transient/rate-limit/permanent/invalid-token으로 분류한다.
4. Cron 중복 실행은 job lock과 idempotencyKey로 방지한다.
5. DB 장애 시 mutation은 실패 처리하고 raw payload를 로그에 남기지 않는다.
6. webhook 장애는 사용자 요청 흐름을 막지 않고 `waitUntil`에서 격리한다.
7. 배포 장애는 staging smoke와 rollback 절차를 따른다.

---

## 20. 금지 패턴

`services` 전체에서 아래 패턴은 금지한다.

```text
클라이언트 계산값을 서버 정산값으로 그대로 저장
KRW 금액에 소수/음수 허용
권한 없는 userId 직접 조회 허용
관리자 mutation에 사유 없이 처리
raw push token 로그 출력
급여/계좌/카드/대출/저축/지출 원문 로그 출력
광고/제휴 payload에 금융 원문 포함
마케팅 동의 없는 광고성 알림 발송
Queue/DLQ 없는 production 배포
production service-token 없이 internal mutation 허용
wrangler.toml에 secret 저장
TypeScript strict 옵션 완화
테스트 없는 상용 배포
```

---

## 21. 루트 services 완료 기준

`services/README.md` 파일 단위 완료 기준은 다음과 같다.

- 서비스 루트 역할 정의
- API/Scheduler/Notifications 책임 정의
- 최종 폴더 구조 계약 정의
- 서버 권위 원칙 정의
- 급여·예산·지출·저축·납치금액 계산 원칙 정의
- Queue/Cron/internal API 계약 정의
- 보안·인증·service-token 기준 정의
- 개인정보·금융 데이터 보호 기준 정의
- 광고/제휴 분리 기준 정의
- 감사·운영 로그 기준 정의
- build/test/deploy/QA 기준 정의
- readiness/manifest/completeness 기준 정의
- production 배포 기준 정의
- 장애 대응 기준 정의
- 금지 패턴 정의

프로젝트 종합 운영 완료 기준은 별도다. 실제 운영 100%는 서비스 README뿐 아니라 `services/api`, `services/scheduler`, `services/notifications`, DB migration, Cloudflare Workers/Queues/Cron/R2/secrets, 프론트엔드 연동, 관리자 콘솔, 광고/제휴 운영, staging/production deploy, 전체 E2E/QA까지 통과해야 확정된다.

---

## 22. 파일 단위 상태

```text
문서상·이론상 파일 단위 상태: 최종본
대상 경로: services/README.md
서비스 범위: API, Scheduler, Notifications 독립 실행 백엔드 서비스 루트
핵심 기능: 서버 권위 계산, internal API, Queue, Cron, FCM, retry, cleanup, audit, admin, ads separation
핵심 도메인: 급여, 예산, 고정지출, 변동지출, 저축, 알림, LV UP, 커뮤니티, 광고/제휴, 운영
보안 기준: service-token, SHA-256, JWT, RBAC, audit, privacy headers
개인정보 기준: raw push token 비로그, 민감 금융 원문 비로그, tokenHash-only, data retention
광고 기준: 금융 원문 타겟팅 금지, contextual/opt-in only, 광고/제휴 라벨
운영 기준: health/readiness/manifest, strict CI, Queue/DLQ, Cron, secrets, staging/production smoke
```
