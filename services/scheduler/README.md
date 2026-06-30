# services/scheduler

급여납치(Salary Hijacking) 플랫폼의 Cloudflare Workers 기반 Scheduler 서비스다. 이 패키지는 서버 권위 원칙으로 급여일 알림, 고정지출 예정 알림, 월간 급여납치 마감, 데이터 보존기간 정리 작업을 Cron, Queue, HTTP 내부 실행 경계에서 안정적으로 수행한다.

본 README는 `services/scheduler` 폴더의 최종 운영 기준 문서다. Scheduler 서비스의 역할, 실행 방식, 파일 구조, Cron/Queue 계약, 내부 API 연동, 서버 권위 계산 정책, 보안·개인정보·광고 분리 정책, 배포/운영/테스트 완료 기준을 정의한다.

---

## 1. 서비스 역할

`services/scheduler`는 급여납치 플랫폼의 자동화 실행 계층이다. API 서비스가 사용자·급여·예산·지출·저축·알림·성장·운영 데이터를 서버 권위로 관리하고, Scheduler 서비스는 정해진 시점에 필요한 작업을 실행한다.

핵심 책임은 다음과 같다.

1. 급여일 전·당일·미확인 상태를 계산해 `PAYDAY` 알림 후보를 생성한다.
2. 고정지출 결제 전·당일·연체 상태를 계산해 `FIXED_PAYMENT_DUE` 알림 후보를 생성한다.
3. 월간 급여·예산·지출·저축 실적을 마감하고 실제 납치금액, 차이, 달성률, 이월값을 확정한다.
4. 인증 세션, 임시 토큰, 개인정보 export, 알림, push token, 업로드, 커뮤니티 삭제 콘텐츠, 광고 이벤트, 운영 이벤트, 감사 로그, rate-limit, idempotency key를 보존기간 정책에 따라 정리한다.
5. Cloudflare Cron, Queue, HTTP internal endpoint에서 동일한 job dispatcher를 사용한다.
6. API internal repository endpoint, notifications queue, growth event queue와 분리된 adapter 경계를 유지한다.
7. 모든 실행에 requestId, actorId, idempotencyKey, job lock, audit event를 적용한다.
8. 급여, 계좌, 카드, 대출, 지출, 저축, 납치금액 원문을 알림 payload, log, audit, webhook에 남기지 않는다.
9. 광고·제휴 타겟팅과 급여·지출·저축 원문 데이터를 분리한다.
10. dry-run preview, production service-token guard, staging/production smoke test를 지원한다.

---

## 2. 런타임과 기술 스택

| 영역                  | 기준                                                     |
| --------------------- | -------------------------------------------------------- |
| Runtime               | Cloudflare Workers Module Worker                         |
| Entry point           | `src/index.ts`                                           |
| Language              | TypeScript strict                                        |
| Trigger               | Cloudflare Cron Triggers                                 |
| Queue                 | Cloudflare Queues operation/notification/growth queue    |
| API Adapter           | API internal service-token endpoint                      |
| Notification Boundary | notifications retry queue 또는 internal enqueue endpoint |
| Growth Boundary       | growth events queue 또는 internal enqueue endpoint       |
| Security              | service-token, SHA-256 token hash, requestId             |
| Privacy               | raw financial data blocking, raw push token blocking     |
| Build                 | esbuild + tsc declaration                                |
| Package Manager       | pnpm workspace                                           |

---

## 3. 폴더 구조 계약

`services/scheduler`의 최종 구조는 아래 계약을 기준으로 유지한다.

```text
services/scheduler
├─ README.md
├─ package.json
├─ tsconfig.json
├─ wrangler.toml
├─ src
│  ├─ index.ts
│  ├─ worker-configuration.d.ts
│  └─ jobs
│     ├─ payday-reminder.job.ts
│     ├─ fixed-expense-reminder.job.ts
│     ├─ monthly-hijack-close.job.ts
│     └─ data-retention-cleanup.job.ts
└─ tests
   ├─ unit
   ├─ integration
   └─ e2e
```

각 파일의 책임은 다음과 같다.

| 파일                                     | 책임                                                                                          |
| ---------------------------------------- | --------------------------------------------------------------------------------------------- |
| `src/index.ts`                           | Worker fetch/scheduled/queue 엔트리, job dispatcher, API/Queue adapter, health/ready/manifest |
| `src/jobs/payday-reminder.job.ts`        | 급여일 전·당일·미확인 알림 후보 계산, PAYDAY 알림 enqueue                                     |
| `src/jobs/fixed-expense-reminder.job.ts` | 고정지출 결제 전·당일·연체 알림 후보 계산, FIXED_PAYMENT_DUE 알림 enqueue                     |
| `src/jobs/monthly-hijack-close.job.ts`   | 월간 급여납치 마감, 실제 납치금액·차이·달성률·이월 확정                                       |
| `src/jobs/data-retention-cleanup.job.ts` | 개인정보·운영·광고·감사 데이터 보존기간 정리                                                  |
| `package.json`                           | build/typecheck/test/deploy/privacy/security scripts                                          |
| `wrangler.toml`                          | Cloudflare Workers, Cron, Queue, env, production route 설정                                   |
| `tsconfig.json`                          | Workers 호환 TypeScript strict 설정                                                           |

---

## 4. Scheduler Entry Point 계약

### 4.1 `src/index.ts`

Cloudflare Workers의 실제 default export다.

필수 책임은 다음과 같다.

- `fetch(request, env, context)`로 internal HTTP job 실행 API를 처리한다.
- `scheduled(controller, env, context)`로 Cron 기반 job 실행 계획을 처리한다.
- `queue(batch, env, context)`로 Queue 기반 `RUN_JOB` 메시지를 처리한다.
- `payday-reminder`, `fixed-expense-reminder`, `monthly-hijack-close`, `data-retention-cleanup` job을 하나의 dispatcher에 연결한다.
- production HTTP mutation은 service-token 또는 SHA-256 service-token hash를 요구한다.
- API internal endpoint가 설정된 경우 실제 repository adapter를 사용하고, 네트워크 비활성화 환경에서는 dry-run 기본 job을 사용한다.
- notifications retry queue, growth events queue, scheduler operation queue와 연결 가능한 producer boundary를 제공한다.
- 모든 응답에 `x-request-id`, service/version, no-store, nosniff, no-referrer, permissions-policy, 개인정보 보호 헤더를 포함한다.
- 운영 webhook은 `globalThis.fetch`를 사용한다.
- 민감 금융 데이터와 raw push token을 log/audit/response에 남기지 않는다.

### 4.2 HTTP Prefix

지원 prefix는 다음과 같다.

| Prefix              | 용도                                  |
| ------------------- | ------------------------------------- |
| `/scheduler/v1`     | Scheduler worker 직접 호출용 내부 API |
| `/api/v1/scheduler` | API gateway 내부 연동용 prefix        |

지원 endpoint는 다음과 같다.

| Method | Endpoint                                            | 설명                       |
| ------ | --------------------------------------------------- | -------------------------- |
| GET    | `/health`                                           | 서비스 생존 확인           |
| GET    | `/ready`                                            | 4개 job completeness 확인  |
| GET    | `/manifest`                                         | Scheduler manifest 확인    |
| POST   | `/scheduler/v1/jobs/payday-reminder/run`            | 급여일 알림 실행           |
| POST   | `/scheduler/v1/jobs/payday-reminder/preview`        | 급여일 알림 dry-run        |
| POST   | `/scheduler/v1/jobs/payday-reminder/user`           | 사용자 단위 급여일 알림    |
| POST   | `/scheduler/v1/jobs/payday-reminder/plan`           | 급여 계획 단위 급여일 알림 |
| POST   | `/scheduler/v1/jobs/fixed-expense-reminder/run`     | 고정지출 알림 실행         |
| POST   | `/scheduler/v1/jobs/fixed-expense-reminder/preview` | 고정지출 알림 dry-run      |
| POST   | `/scheduler/v1/jobs/fixed-expense-reminder/user`    | 사용자 단위 고정지출 알림  |
| POST   | `/scheduler/v1/jobs/fixed-expense-reminder/expense` | 고정지출 항목 단위 알림    |
| POST   | `/scheduler/v1/jobs/monthly-hijack-close/run`       | 월간 급여납치 마감 실행    |
| POST   | `/scheduler/v1/jobs/monthly-hijack-close/preview`   | 월간 마감 dry-run          |
| POST   | `/scheduler/v1/jobs/monthly-hijack-close/user`      | 사용자 단위 월간 마감      |
| POST   | `/scheduler/v1/jobs/monthly-hijack-close/month`     | 특정 월 마감               |
| POST   | `/scheduler/v1/jobs/data-retention-cleanup/run`     | 데이터 정리 실행           |
| POST   | `/scheduler/v1/jobs/data-retention-cleanup/preview` | 데이터 정리 dry-run        |
| POST   | `/scheduler/v1/jobs/data-retention-cleanup/domain`  | 도메인별 데이터 정리       |
| POST   | `/scheduler/v1/jobs/data-retention-cleanup/subject` | 사용자 주체별 데이터 정리  |

---

## 5. Queue 메시지 계약

Scheduler operation queue 메시지는 다음 구조를 따른다.

```json
{
  "type": "RUN_JOB",
  "job": "payday-reminder",
  "action": "run",
  "requestId": "req_...",
  "actorId": "system:scheduler",
  "dryRun": false
}
```

지원 job은 다음과 같다.

```text
payday-reminder
fixed-expense-reminder
monthly-hijack-close
data-retention-cleanup
```

지원 action은 다음과 같다.

```text
run
preview
user
plan
expense
month
domain
subject
```

Queue 처리 원칙은 다음과 같다.

1. job 실행 성공 시 `ack`한다.
2. 실행 실패 시 `retry` 가능한 Queue 메시지는 retry한다.
3. 메시지 body는 sanitization 후에만 log/audit에 남긴다.
4. raw salary, expense, savings, account, card, loan, push token은 Queue audit에 남기지 않는다.
5. 동일 작업은 job lock과 idempotency key로 중복 실행을 방지한다.

---

## 6. Cron 실행 계약

Cloudflare Cron은 UTC 기준으로 동작한다. 기본 production schedule은 다음과 같다.

```text
0 23 * * *
```

이는 한국시간 기준 매일 08:00 실행을 의미한다.

Cron 실행 시 기본 job 계획은 다음과 같다.

1. `payday-reminder` 실행
2. `fixed-expense-reminder` 실행
3. `monthly-hijack-close` 실행
4. `data-retention-cleanup` 실행

각 job은 환경변수로 개별 활성화/비활성화할 수 있다.

```text
SCHEDULER_PAYDAY_REMINDER_ENABLED
SCHEDULER_FIXED_EXPENSE_REMINDER_ENABLED
SCHEDULER_MONTHLY_HIJACK_CLOSE_ENABLED
SCHEDULER_DATA_RETENTION_CLEANUP_ENABLED
```

---

## 7. Payday Reminder Job

`src/jobs/payday-reminder.job.ts`는 급여일 알림을 담당한다.

필수 책임은 다음과 같다.

- 서버 권위로 `nextPaydayDate`와 현재 시각을 비교한다.
- 급여일 전, 급여일 당일, 급여 미확인 상태를 구분한다.
- lookahead days와 missed grace days 정책을 적용한다.
- 사용자 단위, 급여 계획 단위, 전체 scheduled 실행을 지원한다.
- duplicate reminderKey와 idempotencyKey로 중복 알림을 방지한다.
- quiet hours를 존중한다.
- `PAYDAY` 거래성 알림 payload를 생성한다.
- 급여액 원문은 push payload, audit, log에 포함하지 않는다.
- growth/LV UP event boundary를 지원한다.
- dry-run preview와 APPLY 실행을 모두 지원한다.

알림 payload 원칙은 다음과 같다.

```json
{
  "type": "PAYDAY",
  "importance": "TRANSACTIONAL",
  "targetScreen": "payroll-home",
  "routeParams": {
    "salaryIncluded": false,
    "amountIncluded": false
  },
  "extraData": {
    "rawSalaryIncluded": false,
    "adFinancialTargeting": false
  }
}
```

---

## 8. Fixed Expense Reminder Job

`src/jobs/fixed-expense-reminder.job.ts`는 고정지출 예정 알림을 담당한다.

필수 책임은 다음과 같다.

- 서버 권위로 `nextDueDate`와 현재 시각을 비교한다.
- 결제 전, 결제 당일, 연체 상태를 구분한다.
- lookahead days와 overdue grace days 정책을 적용한다.
- 사용자 단위, 고정지출 항목 단위, 전체 scheduled 실행을 지원한다.
- duplicate reminderKey와 idempotencyKey로 중복 알림을 방지한다.
- quiet hours를 존중한다.
- `FIXED_PAYMENT_DUE` 거래성 알림 payload를 생성한다.
- 결제 금액, 계좌, 카드, 대출 원문은 push payload, audit, log에 포함하지 않는다.
- dry-run preview와 APPLY 실행을 모두 지원한다.

알림 payload 원칙은 다음과 같다.

```json
{
  "type": "FIXED_PAYMENT_DUE",
  "importance": "TRANSACTIONAL",
  "targetScreen": "fixed-expenses",
  "routeParams": {
    "amountIncluded": false
  },
  "extraData": {
    "rawAmountIncluded": false,
    "adFinancialTargeting": false
  }
}
```

---

## 9. Monthly Hijack Close Job

`src/jobs/monthly-hijack-close.job.ts`는 월간 급여납치 마감을 담당한다.

필수 책임은 다음과 같다.

- 서버 권위로 월간 급여·예산·지출·저축 실적을 마감한다.
- KRW 정수만 계산에 사용한다.
- 예상/실제 급여, 계획/실제 지출, 계획/실제 저축, 일일예산, 기타 지출, 이월값을 집계한다.
- 계획 납치금액, 실제 납치금액, 차이, 이월금, 달성률, 저축률, 지출률을 계산한다.
- grace day와 close hour 정책을 적용한다.
- 이미 마감된 월의 재마감은 정책적으로 제한한다.
- 사용자 단위, 월 단위, 전체 scheduled 실행을 지원한다.
- notifications queue boundary로 `HIJACK_GOAL` 알림을 생성한다.
- growth/LV UP event boundary를 지원한다.
- 급여액, 지출액, 저축액, 납치금액 원문은 알림 payload, audit, log에 포함하지 않는다.

서버 권위 계산 원칙은 다음과 같다.

```text
plannedExpenseKrw = plannedFixedExpenseKrw + plannedDailyBudgetKrw + otherPlannedExpenseKrw
actualExpenseKrw = actualFixedExpenseKrw + actualVariableExpenseKrw + otherActualExpenseKrw
plannedHijackKrw = max(0, incomeKrw + previousCarryOverKrw - plannedExpenseKrw - plannedSavingsKrw)
actualHijackKrw = max(0, incomeKrw + previousCarryOverKrw - actualExpenseKrw - actualSavingsKrw)
varianceKrw = actualHijackKrw - plannedHijackKrw
carryOverKrw = actualHijackKrw
```

알림 payload 원칙은 다음과 같다.

```json
{
  "type": "HIJACK_GOAL",
  "importance": "BEHAVIORAL",
  "targetScreen": "payroll-monthly-close",
  "routeParams": {
    "amountIncluded": false
  },
  "extraData": {
    "rawAmountIncluded": false,
    "adFinancialTargeting": false
  }
}
```

---

## 10. Data Retention Cleanup Job

`src/jobs/data-retention-cleanup.job.ts`는 보존기간 기반 데이터 정리를 담당한다.

필수 책임은 다음과 같다.

- 도메인별 보존기간 정책을 적용한다.
- dry-run preview와 APPLY 실행을 모두 지원한다.
- legal hold와 active dispute 상태는 정리 대상에서 보호한다.
- 사용자 주체별 개인정보 정리를 지원한다.
- anonymize, hard delete, external object purge를 구분한다.
- R2/object purge adapter와 repository boundary를 분리한다.
- 민감 금융 데이터와 raw push token은 audit/log/response에 남기지 않는다.
- 광고 이벤트는 금융 원문 타겟팅과 분리된 보존 정책으로만 정리한다.

도메인별 기본 보존기간은 다음과 같다.

| Domain                            | Default Retention |
| --------------------------------- | ----------------: |
| 인증 세션                         |              30일 |
| password reset/email verification |            7~14일 |
| 탈퇴 사용자 grace                 |              30일 |
| privacy export                    |               7일 |
| notifications                     |             180일 |
| push tokens                       |             180일 |
| uploads                           |              30일 |
| community soft-deleted content    |              90일 |
| ad impressions/clicks             |          90~180일 |
| operation events                  |             180일 |
| audit logs                        |             730일 |
| admin audit logs                  |           1,825일 |
| rate-limit events                 |              30일 |
| idempotency keys                  |              14일 |

---

## 11. API Internal Repository Adapter 계약

Scheduler는 DB를 직접 고정하지 않고 API internal endpoint를 통해 repository adapter를 구성한다.

대표 endpoint는 다음과 같다.

```text
POST /api/v1/internal/scheduler/locks/acquire
POST /api/v1/internal/scheduler/locks/release
POST /api/v1/internal/scheduler/payday-reminder/candidates
POST /api/v1/internal/scheduler/payday-reminder/mark-queued
POST /api/v1/internal/scheduler/fixed-expense-reminder/candidates
POST /api/v1/internal/scheduler/fixed-expense-reminder/mark-queued
POST /api/v1/internal/scheduler/monthly-hijack-close/candidates
POST /api/v1/internal/scheduler/monthly-hijack-close/persist
POST /api/v1/internal/scheduler/monthly-hijack-close/mark-skipped
POST /api/v1/internal/scheduler/data-retention/candidates
POST /api/v1/internal/scheduler/data-retention/anonymize
POST /api/v1/internal/scheduler/data-retention/hard-delete
POST /api/v1/internal/scheduler/data-retention/purge-objects
POST /api/v1/internal/scheduler/data-retention/retain
POST /api/v1/internal/scheduler/notifications/enqueue
POST /api/v1/internal/scheduler/growth-events/enqueue
POST /api/v1/internal/scheduler/audit/payday-reminder
POST /api/v1/internal/scheduler/audit/fixed-expense-reminder
POST /api/v1/internal/scheduler/audit/monthly-hijack-close
POST /api/v1/internal/scheduler/audit/data-retention
```

운영 환경에서는 `API_INTERNAL_SERVICE_TOKEN`을 사용해 API internal endpoint를 호출한다.

---

## 12. 환경변수

대표 환경변수는 다음과 같다.

```text
APP_ENV
ENVIRONMENT
NODE_ENV
SERVICE_NAME
TIMEZONE
API_INTERNAL_BASE_URL
API_INTERNAL_SERVICE_TOKEN
SCHEDULER_SERVICE_TOKEN
SCHEDULER_SERVICE_TOKEN_SHA256
SCHEDULER_DISABLE_NETWORK
SCHEDULER_ENABLE_HTTP_RUN
SCHEDULER_ENABLE_SCHEDULED
SCHEDULER_AUDIT_TO_CONSOLE
SCHEDULER_OPERATION_WEBHOOK_URL
SCHEDULER_OPERATION_WEBHOOK_TOKEN
SCHEDULER_PAYDAY_REMINDER_ENABLED
SCHEDULER_FIXED_EXPENSE_REMINDER_ENABLED
SCHEDULER_MONTHLY_HIJACK_CLOSE_ENABLED
SCHEDULER_DATA_RETENTION_CLEANUP_ENABLED
SCHEDULER_REQUIRE_SERVICE_TOKEN
PAYDAY_REMINDER_DRY_RUN
PAYDAY_REMINDER_BATCH_SIZE
PAYDAY_REMINDER_LOOKAHEAD_DAYS
PAYDAY_REMINDER_GRACE_DAYS
FIXED_EXPENSE_REMINDER_DRY_RUN
FIXED_EXPENSE_REMINDER_BATCH_SIZE
FIXED_EXPENSE_REMINDER_LOOKAHEAD_DAYS
FIXED_EXPENSE_REMINDER_GRACE_DAYS
MONTHLY_HIJACK_CLOSE_DRY_RUN
MONTHLY_HIJACK_CLOSE_BATCH_SIZE
MONTHLY_HIJACK_CLOSE_GRACE_DAYS
DATA_RETENTION_DRY_RUN
DATA_RETENTION_BATCH_SIZE
RAW_FINANCIAL_DATA_LOGGED
RAW_PUSH_TOKEN_LOGGED
RAW_AMOUNT_IN_NOTIFICATION_PAYLOAD
ADS_FINANCIAL_TARGETING_FORBIDDEN
SERVER_AUTHORITY_SCHEDULER
TOKEN_HASH_ONLY
```

secrets는 `wrangler.toml`에 저장하지 않는다. 환경별로 `wrangler secret put`으로 등록한다.

필수 production secrets는 다음과 같다.

```bash
wrangler secret put SCHEDULER_SERVICE_TOKEN_SHA256 --env production
wrangler secret put API_INTERNAL_SERVICE_TOKEN --env production
wrangler secret put SCHEDULER_OPERATION_WEBHOOK_TOKEN --env production
```

---

## 13. Wrangler 배포 계약

`wrangler.toml`은 다음을 포함해야 한다.

- `main = "src/index.ts"`
- development/staging/production env
- Cron triggers
- scheduler operation queue producer/consumer
- notifications retry queue producer
- growth events queue producer
- dead-letter queue
- observability
- smart placement
- production custom domain
- API internal base URL
- service-token/SHA-256 auth secret 전제
- job별 dry-run/batch/lookahead/grace/lock 정책
- data-retention 보존기간 정책
- raw financial data logging forbidden flag
- raw push token logging forbidden flag
- raw amount notification payload forbidden flag
- ads financial targeting forbidden flag
- server authority scheduler flag

배포 명령은 다음과 같다.

```bash
pnpm --filter @salary-hijacking/scheduler deploy:staging
pnpm --filter @salary-hijacking/scheduler deploy:production
```

---

## 14. 개발 명령

```bash
pnpm --filter @salary-hijacking/scheduler dev
pnpm --filter @salary-hijacking/scheduler typecheck:strict
pnpm --filter @salary-hijacking/scheduler test:qa
pnpm --filter @salary-hijacking/scheduler build
pnpm --filter @salary-hijacking/scheduler deploy:staging
```

품질 게이트는 다음 명령을 모두 통과해야 한다.

```bash
pnpm --filter @salary-hijacking/scheduler format:check
pnpm --filter @salary-hijacking/scheduler lint
pnpm --filter @salary-hijacking/scheduler typecheck:strict
pnpm --filter @salary-hijacking/scheduler test:unit
pnpm --filter @salary-hijacking/scheduler test:integration
pnpm --filter @salary-hijacking/scheduler test:e2e
pnpm --filter @salary-hijacking/scheduler privacy:check
pnpm --filter @salary-hijacking/scheduler security:scan
pnpm --filter @salary-hijacking/scheduler build
```

---

## 15. TypeScript 기준

`services/scheduler/tsconfig.json`은 다음을 원칙으로 한다.

- `target`: `ES2022`
- `lib`: `ES2022`, `WebWorker`
- `module`: `ESNext`
- `moduleResolution`: `Bundler`
- `strict`: `true`
- `exactOptionalPropertyTypes`: `true`
- `noUncheckedIndexedAccess`: `true`
- `noUnusedLocals`: `true`
- `noUnusedParameters`: `true`
- `isolatedModules`: `true`
- `verbatimModuleSyntax`: `true`
- `noEmit`: `true` for typecheck
- declaration emit은 build script에서 별도 override

Cloudflare Workers type file은 `wrangler types src/worker-configuration.d.ts`로 생성하고 `include`를 통해 반영한다. 로컬 node_modules에 없는 type library를 `compilerOptions.types`에 직접 고정하지 않는다.

---

## 16. 보안과 개인정보 보호 원칙

Scheduler 서비스의 보안·개인정보 보호 원칙은 다음과 같다.

1. production HTTP mutation은 service-token 또는 SHA-256 service-token hash를 요구한다.
2. internal API 호출은 `API_INTERNAL_SERVICE_TOKEN`으로 보호한다.
3. 모든 실행은 requestId와 actorId를 가진다.
4. job lock으로 중복 scheduled run을 방지한다.
5. idempotencyKey로 중복 알림과 중복 월마감을 방지한다.
6. raw salary, payroll, expense, savings, loan, account, card, hijack amount는 log/audit/webhook/notification payload에 남기지 않는다.
7. raw push token은 Scheduler 경계에 저장하거나 기록하지 않는다.
8. 광고·제휴 타겟팅에는 급여·지출·저축 원문 데이터를 사용하지 않는다.
9. data-retention cleanup은 legal hold와 active dispute를 보호한다.
10. operation webhook은 sanitization 결과만 전달한다.

금지 패턴은 다음과 같다.

```text
console.log(raw salary/payroll/expense/savings/hijack amount)
notification data payload에 amountKrw 또는 salaryKrw 포함
광고/제휴 알림에서 payroll/expense/savings 원문 targeting
raw push token audit 저장
service token을 wrangler.toml에 저장
production에서 service-token guard 비활성화
job lock 없이 scheduled close 실행
idempotencyKey 없이 notification enqueue
legal hold 데이터를 hard delete
operation webhook으로 민감 payload 원문 전송
TypeScript strict 옵션 완화
```

---

## 17. 응답 계약

성공 응답은 다음 구조를 따른다.

```json
{
  "success": true,
  "data": {},
  "meta": {
    "service": "salary-hijacking-scheduler",
    "version": "3.1.x",
    "requestId": "req_...",
    "path": "/scheduler/v1/jobs/payday-reminder/run",
    "timestamp": "2026-06-15T00:00:00.000Z"
  }
}
```

오류 응답은 다음 구조를 따른다.

```json
{
  "success": false,
  "error": {
    "code": "SCHEDULER_ERROR_CODE",
    "message": "사용자 또는 운영자가 이해 가능한 메시지",
    "status": 400,
    "requestId": "req_..."
  },
  "meta": {
    "service": "salary-hijacking-scheduler",
    "version": "3.1.x",
    "requestId": "req_...",
    "path": "/scheduler/v1/jobs/payday-reminder/run",
    "timestamp": "2026-06-15T00:00:00.000Z"
  }
}
```

운영 환경에서 stack trace, service token, API token, raw push token, 계좌, 카드, 급여명세, raw salary, raw expense, raw savings, raw hijack amount는 반환하지 않는다.

---

## 18. 테스트 기준

테스트는 최소 다음 레이어로 구성한다.

1. Unit: 각 job의 due calculation, skip reason, idempotency key, duplicate prevention, payload privacy 검증
2. Integration: `src/index.ts` HTTP endpoint + service-token auth + dry-run dispatch 검증
3. Queue: `RUN_JOB` queue dispatch, ack/retry 검증
4. Cron: scheduled planner, job enable/disable, dry-run fallback 검증
5. Repository Adapter: API internal endpoint payload shape 검증
6. Notification Boundary: notifications queue enqueue 검증
7. Growth Boundary: growth event enqueue 검증
8. Privacy QA: raw salary, expense, savings, loan, account, card, push token absence 검증
9. Failure QA: API failure, lock skipped, invalid job/action, unauthorized 검증
10. Deployment Smoke: staging Worker health/ready/manifest/job preview 검증

필수 smoke endpoint는 다음과 같다.

```text
GET /scheduler/v1/health
GET /scheduler/v1/ready
GET /scheduler/v1/manifest
POST /scheduler/v1/jobs/payday-reminder/preview
POST /scheduler/v1/jobs/fixed-expense-reminder/preview
POST /scheduler/v1/jobs/monthly-hijack-close/preview
POST /scheduler/v1/jobs/data-retention-cleanup/preview
```

필수 자체 완성도 함수는 다음과 같다.

```text
assertSchedulerEntrypointCompleteness()
assertPaydayReminderJobCompleteness()
assertFixedExpenseReminderJobCompleteness()
assertMonthlyHijackCloseJobCompleteness()
assertDataRetentionCleanupJobCompleteness()
```

---

## 19. 운영 안정성 기준

운영 환경에서 다음 기준을 유지한다.

- 모든 HTTP POST는 service-token 인증을 요구한다.
- production service-token은 SHA-256 hash 방식이 우선이다.
- 모든 job 실행은 requestId/actorId를 가진다.
- 모든 scheduled job은 job lock을 사용한다.
- 모든 notification enqueue는 idempotencyKey를 포함한다.
- 모든 월간 마감은 서버 권위 KRW 정수 계산을 사용한다.
- 모든 데이터 정리는 dry-run preview를 먼저 수행할 수 있어야 한다.
- 모든 legal hold/active dispute 데이터는 정리에서 보호한다.
- Queue/Cron/operation webhook 로그에는 민감 데이터 원문을 남기지 않는다.
- FCM push token, access token, API token, service token은 로그에 남기지 않는다.
- 광고/제휴 알림은 금융 원문 타겟팅과 분리한다.

---

## 20. 보안 헤더 기준

HTTP 응답은 다음 보안 헤더를 포함해야 한다.

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

## 21. 완료 기준

`services/scheduler` 파일 단위 완료 기준은 다음과 같다.

- `package.json` JSON 문법 정상
- `wrangler.toml` TOML 문법 정상
- `tsconfig.json` TypeScript strict 기준 정상
- `src/index.ts` Worker default export 정상
- `src/jobs/payday-reminder.job.ts` 급여일 알림 job 정상
- `src/jobs/fixed-expense-reminder.job.ts` 고정지출 알림 job 정상
- `src/jobs/monthly-hijack-close.job.ts` 월간 급여납치 마감 job 정상
- `src/jobs/data-retention-cleanup.job.ts` 데이터 보존기간 정리 job 정상
- health/ready/manifest endpoint 제공
- service-token production guard 제공
- Cron/Queue entrypoint 제공
- API internal repository adapter 계약 제공
- notification/growth queue boundary 제공
- dry-run preview 제공
- job lock/idempotency/duplicate prevention 제공
- raw financial data 비로그 원칙 명시
- raw push token 비로그 원칙 명시
- 광고 금융 타겟팅 금지 원칙 명시
- README 운영 문서 최신화

프로젝트 종합 운영 완료 기준은 별도다. 실제 운영 100%는 scheduler 파일뿐 아니라 API internal endpoints, DB repository adapter, Cloudflare Cron/Queue/secrets, notifications/growth services, frontend token/notification state, staging/production deploy, 전체 E2E/QA까지 통과해야 확정된다.

---

## 22. 파일 단위 상태

```text
문서상·이론상 파일 단위 상태: 최종본
대상 경로: services/scheduler/README.md
서비스 범위: Cloudflare Workers Scheduler 서비스
핵심 기능: 급여일 알림, 고정지출 알림, 월간 급여납치 마감, 데이터 보존기간 정리
핵심 도메인: 급여, 예산, 지출, 저축, 알림, 성장/LV UP, 커뮤니티, 광고, 감사, 운영 데이터
보안 기준: service-token, SHA-256 token hash, API internal token, job lock, idempotency
개인정보 기준: raw salary/expense/savings/hijack amount 비로그, raw push token 비로그
광고 기준: 금융 원문 타겟팅 금지, contextual/opt-in only
운영 기준: health/readiness/manifest, Cron, Queue/DLQ, Wrangler 배포, QA 게이트
```
