# services/notifications

급여납치(Salary Hijacking) 플랫폼의 Cloudflare Workers 기반 알림 서비스다. 이 패키지는 API 서버와 독립된 알림 실행 경계로서 FCM HTTP v1 발송, 실패 재시도, Push Token 정리, Queue/Cron 운영, 알림 감사 이벤트, 민감정보 보호 정책을 담당한다.

본 README는 `services/notifications` 폴더의 최종 운영 기준 문서다. 알림 서비스의 역할, 실행 방식, 파일 구조, FCM 발송 계약, retry queue, push-token cleanup, 보안·개인정보·광고 분리 정책, 배포/운영/테스트 기준을 정의한다.

---

## 1. 서비스 역할

`services/notifications`는 급여납치 플랫폼의 푸시 알림 실행 계층이다. API 서비스가 알림 생성과 사용자 권한·도메인 이벤트를 확정하면, notifications 서비스는 서버 권위로 발송 가능 여부를 검증하고 FCM으로 전달한다.

핵심 책임은 다음과 같다.

1. FCM HTTP v1 API를 사용해 Android, iOS, Web push 발송을 수행한다.
2. 급여일, 고정지출 결제 예정, 저축 예정, 예산 초과, 예산 잔여, 납치 목표 달성, LV UP, 커뮤니티 반응, 공지, 보안 알림을 처리한다.
3. 발송 실패를 transient, rate-limit, permanent, invalid-token, third-party-auth 등으로 분류한다.
4. 실패 알림을 Cloudflare Queue와 repository contract를 통해 재시도한다.
5. invalid token, 장기 미사용 token, 반복 실패 token, 동의 철회 token을 hash-only로 정리한다.
6. raw push token을 로그·감사·응답에 남기지 않고 token hash만 사용한다.
7. 급여, 계좌, 카드, 대출, 지출, 저축, 급여명세 등 민감 금융 원문을 FCM payload, log, audit, 광고 payload에 포함하지 않는다.
8. 마케팅 알림은 명시적 수신 동의가 확인된 경우에만 허용한다.
9. 광고·제휴 알림은 급여·지출·저축 원문 타겟팅과 분리한다.
10. Cloudflare Workers, Queues, Cron, WebCrypto, Fetch API 환경에서 동작한다.

---

## 2. 런타임과 기술 스택

| 영역            | 기준                                           |
| --------------- | ---------------------------------------------- |
| Runtime         | Cloudflare Workers Module Worker               |
| Entry point     | `src/index.ts`                                 |
| Language        | TypeScript strict                              |
| Push Provider   | Firebase Cloud Messaging HTTP v1               |
| Auth for FCM    | Google Service Account OAuth2 JWT RS256        |
| Queue           | Cloudflare Queues retry/operation queue        |
| Cron            | Retry sweep, token cleanup readiness           |
| Security        | service-token hash, WebCrypto, sanitized audit |
| Privacy         | token-hash-only, raw financial data blocking   |
| Build           | esbuild + tsc declaration                      |
| Package Manager | pnpm workspace                                 |

---

## 3. 폴더 구조 계약

`services/notifications`의 최종 구조는 아래 계약을 기준으로 유지한다.

```text
services/notifications
├─ README.md
├─ package.json
├─ tsconfig.json
├─ wrangler.toml
├─ src
│  ├─ index.ts
│  ├─ fcm.client.ts
│  ├─ push-token-cleanup.ts
│  ├─ retry-queue.ts
│  └─ worker-configuration.d.ts
└─ tests
   ├─ unit
   ├─ integration
   └─ e2e
```

각 파일의 책임은 다음과 같다.

| 파일                        | 책임                                                                                     |
| --------------------------- | ---------------------------------------------------------------------------------------- |
| `src/index.ts`              | Worker fetch/scheduled/queue 엔트리, HTTP internal endpoint, Queue dispatch, 운영 이벤트 |
| `src/fcm.client.ts`         | FCM HTTP v1 OAuth2, 발송, multicast, topic, condition, validateOnly, retry/backoff       |
| `src/retry-queue.ts`        | 실패 분류, retry decision, backoff+jitter, dead-letter, due sweep                        |
| `src/push-token-cleanup.ts` | stale/expired/invalid token cleanup, user-scope cleanup, hard delete guard               |
| `package.json`              | build/typecheck/test/deploy/privacy/security scripts                                     |
| `wrangler.toml`             | Cloudflare Workers, Queue, Cron, env, production route 설정                              |
| `tsconfig.json`             | Workers 호환 TypeScript strict 설정                                                      |

---

## 4. 엔트리포인트 계약

### 4.1 `src/index.ts`

Cloudflare Workers의 실제 default export다.

필수 책임은 다음과 같다.

- `fetch(request, env, context)`로 내부 HTTP 알림 API를 처리한다.
- `scheduled(controller, env, context)`로 Cron readiness/운영 이벤트를 처리한다.
- `queue(batch, env, context)`로 Queue 기반 FCM 발송·검증 요청을 처리한다.
- FCM client, retry queue, push-token cleanup과 연결 가능한 runtime boundary를 제공한다.
- 운영 webhook 전송은 `globalThis.fetch`를 사용해 Worker `fetch` shadowing을 방지한다.
- 모든 응답에 `x-request-id`, service/version, 보안/개인정보 헤더를 포함한다.
- production에서는 service-token 또는 service-token SHA-256 hash 계약을 강제한다.

### 4.2 `src/fcm.client.ts`

FCM HTTP v1 provider client다.

필수 책임은 다음과 같다.

- Google service account JSON 또는 분리 env로 OAuth2 JWT assertion을 생성한다.
- RS256 WebCrypto 서명으로 access token을 발급하고 cache한다.
- token, topic, condition 대상 발송을 지원한다.
- 최대 500개 multicast를 지원한다.
- validateOnly와 dry-run을 지원한다.
- retry/backoff를 지원한다.
- Android, APNS, WebPush config를 구성한다.
- 마케팅 동의 guard를 강제한다.
- raw push token과 민감 금융 원문을 payload/log에 남기지 않는다.

### 4.3 `src/retry-queue.ts`

알림 실패 재시도 정책 엔진이다.

필수 책임은 다음과 같다.

- provider error를 transient, rate-limit, permanent, invalid-token, third-party-auth로 분류한다.
- exponential backoff와 jitter를 적용한다.
- max attempts 초과 시 dead-letter 처리한다.
- invalid token은 재시도하지 않고 token cleanup으로 위임한다.
- idempotencyKey 중복 방지를 제공한다.
- due retry sweep과 preview를 지원한다.
- repository와 Cloudflare Queue producer 경계를 분리한다.

### 4.4 `src/push-token-cleanup.ts`

Push token lifecycle 정리 엔진이다.

필수 책임은 다음과 같다.

- raw token이 아닌 SHA-256 tokenHash만 입력·로그·감사에 사용한다.
- 장기 미사용 token은 stale로 표시한다.
- 장기 만료 token은 revoke한다.
- 반복 실패 token은 failed/revoked로 표시한다.
- FCM/APNS/WebPush invalid token error는 즉시 revoke 대상으로 분류한다.
- 사용자 로그아웃, 탈퇴, 동의 철회, 관리자 개인정보 요청 기반 user-scope cleanup을 지원한다.
- retention 기간이 지난 revoked token만 hard delete 대상으로 분류한다.
- dry-run preview와 APPLY 모드를 제공한다.

---

## 5. Internal HTTP API Prefix

| Prefix                           | 용도                                      |
| -------------------------------- | ----------------------------------------- |
| `/notifications/v1`              | notifications worker 직접 호출용 내부 API |
| `/api/v1/notifications/internal` | API gateway 내부 연동용 prefix            |

지원 endpoint는 다음과 같다.

| Method | Endpoint     | 설명                                    |
| ------ | ------------ | --------------------------------------- |
| GET    | `/health`    | 서비스 생존 확인                        |
| GET    | `/ready`     | FCM client 및 service completeness 확인 |
| GET    | `/manifest`  | 서비스 manifest 확인                    |
| POST   | `/send`      | 단일 token/topic/condition FCM 발송     |
| POST   | `/multicast` | 최대 500개 token multicast 발송         |
| POST   | `/topic`     | FCM topic 발송                          |
| POST   | `/condition` | FCM condition 발송                      |
| POST   | `/validate`  | validateOnly payload 검증               |

---

## 6. 알림 도메인 계약

지원하는 notification type은 다음과 같다.

| Type                 | 설명                     | 기본 성격                       |
| -------------------- | ------------------------ | ------------------------------- |
| `PAYDAY`             | 급여일 알림              | TRANSACTIONAL                   |
| `FIXED_PAYMENT_DUE`  | 고정지출 결제 예정       | TRANSACTIONAL                   |
| `SAVINGS_DUE`        | 고정저축 예정            | TRANSACTIONAL                   |
| `BUDGET_OVER`        | 일일/월간 예산 초과      | TRANSACTIONAL                   |
| `BUDGET_REMAINING`   | 예산 잔여/사용 가능 알림 | BEHAVIORAL                      |
| `HIJACK_GOAL`        | 납치금액 목표 달성       | BEHAVIORAL                      |
| `GROWTH_TASK`        | LV UP 미션               | BEHAVIORAL                      |
| `GROWTH_LEVEL_UP`    | 레벨업 달성              | BEHAVIORAL                      |
| `COMMUNITY_COMMENT`  | 댓글 알림                | COMMUNITY                       |
| `COMMUNITY_REACTION` | 좋아요/반응 알림         | COMMUNITY                       |
| `NOTICE`             | 공지                     | SYSTEM_REQUIRED 또는 BEHAVIORAL |
| `SECURITY`           | 보안 알림                | SYSTEM_REQUIRED                 |
| `SYSTEM`             | 시스템 알림              | SYSTEM_REQUIRED                 |

알림 importance는 다음으로 제한한다.

```text
TRANSACTIONAL
BEHAVIORAL
COMMUNITY
MARKETING
SYSTEM_REQUIRED
```

`MARKETING`은 `marketingConsentVerified === true`일 때만 허용한다.

---

## 7. 표준 요청 예시

### 7.1 단일 발송

```json
{
  "token": "<raw-token-only-in-request-boundary>",
  "notification": {
    "title": "오늘 예산을 초과했어요",
    "body": "예산 화면에서 오늘 사용 내역을 확인해보세요."
  },
  "data": {
    "notificationId": "ntf_123",
    "userId": "user_123",
    "type": "BUDGET_OVER",
    "importance": "TRANSACTIONAL",
    "targetScreen": "daily-budget",
    "deeplink": "salary-hijacking://daily-budget/today",
    "ttlSeconds": 3600
  },
  "validateOnly": false
}
```

### 7.2 Multicast 발송

```json
{
  "tokens": ["<token-1>", "<token-2>"],
  "notification": {
    "title": "오늘의 LV UP 미션",
    "body": "독서 미션을 완료하고 경험치를 받아보세요."
  },
  "data": {
    "notificationId": "ntf_growth_001",
    "userId": "user_123",
    "type": "GROWTH_TASK",
    "importance": "BEHAVIORAL",
    "targetScreen": "growth"
  },
  "concurrency": 20
}
```

### 7.3 마케팅/제휴 알림

```json
{
  "topic": "contextual-benefits",
  "notification": {
    "title": "이번 주 제휴 혜택",
    "body": "광고/제휴 콘텐츠를 확인해보세요."
  },
  "data": {
    "notificationId": "ntf_partner_001",
    "userId": "system-topic",
    "type": "NOTICE",
    "importance": "MARKETING",
    "targetScreen": "benefits",
    "marketingConsentVerified": true,
    "adsPartnerConsentVerified": true
  },
  "extraData": {
    "adFinancialTargeting": false,
    "adLabel": "광고"
  }
}
```

금지되는 값은 다음과 같다.

```text
salary
payroll
income
loan
account
card
savings
expense
dailyBudget
hijackAmount
급여
월급
계좌
카드
대출
저축
지출
급여명세
통장
```

---

## 8. 표준 응답 계약

성공 응답은 다음 구조를 따른다.

```json
{
  "success": true,
  "data": {},
  "meta": {
    "service": "salary-hijacking-notifications",
    "version": "3.1.x",
    "requestId": "req_...",
    "path": "/notifications/v1/send",
    "timestamp": "2026-06-15T00:00:00.000Z"
  }
}
```

오류 응답은 다음 구조를 따른다.

```json
{
  "success": false,
  "error": {
    "code": "NOTIFICATIONS_ERROR_CODE",
    "message": "사용자 또는 운영자가 이해 가능한 메시지",
    "status": 400,
    "requestId": "req_..."
  },
  "meta": {
    "service": "salary-hijacking-notifications",
    "version": "3.1.x",
    "requestId": "req_...",
    "path": "/notifications/v1/send",
    "timestamp": "2026-06-15T00:00:00.000Z"
  }
}
```

운영 환경에서 stack trace, access token, service account private key, raw push token, 계좌, 카드, 급여명세, raw salary, raw expense, raw savings는 반환하지 않는다.

---

## 9. Queue 메시지 계약

Cloudflare Queue 메시지는 다음 구조를 따른다.

```json
{
  "type": "FCM_SEND",
  "requestId": "req_...",
  "payload": {
    "token": "<raw-token-only-inside-runtime-boundary>",
    "notification": {
      "title": "알림 제목",
      "body": "알림 본문"
    },
    "data": {
      "notificationId": "ntf_...",
      "userId": "user_...",
      "type": "PAYDAY",
      "importance": "TRANSACTIONAL",
      "targetScreen": "payroll"
    }
  },
  "retryDelaySeconds": 60
}
```

지원 Queue type은 다음과 같다.

```text
FCM_SEND
FCM_MULTICAST
FCM_TOPIC
FCM_CONDITION
FCM_VALIDATE
```

Queue 처리 원칙은 다음과 같다.

1. 성공 또는 validate 성공은 `ack`한다.
2. 실패는 retry policy 또는 Queue retry로 넘긴다.
3. invalid token은 push-token cleanup으로 위임한다.
4. Queue audit에는 tokenHash만 남긴다.
5. payload 원문은 audit/log에 직접 저장하지 않고 sanitization 결과만 남긴다.

---

## 10. Retry Queue 정책

기본 retry policy는 다음과 같다.

| 항목         |   기본값 |
| ------------ | -------: |
| max attempts |        5 |
| base delay   |     30초 |
| max delay    | 21,600초 |
| jitter ratio |      0.2 |
| batch size   |      100 |

분류 정책은 다음과 같다.

| 분류             | 예시                                        | 처리                                      |
| ---------------- | ------------------------------------------- | ----------------------------------------- |
| TRANSIENT        | `UNAVAILABLE`, `INTERNAL`, `UNKNOWN`, 5xx   | backoff 후 retry                          |
| RATE_LIMIT       | 429, `RESOURCE_EXHAUSTED`, `QUOTA_EXCEEDED` | backoff 후 retry                          |
| PERMANENT        | 일반 4xx                                    | dead-letter                               |
| INVALID_TOKEN    | `UNREGISTERED`, `INVALID_ARGUMENT`, 404/410 | token cleanup                             |
| THIRD_PARTY_AUTH | `THIRD_PARTY_AUTH_ERROR`                    | dead-letter 또는 운영 조치                |
| UNKNOWN          | 미분류                                      | retry 후 max attempts 초과 시 dead-letter |

---

## 11. Push Token Cleanup 정책

Push token cleanup 기본값은 다음과 같다.

| 항목                     | 기본값 |
| ------------------------ | -----: |
| stale after              |   90일 |
| expired after            |  365일 |
| failure threshold        |    5회 |
| hard delete after revoke |  180일 |
| batch size               |    500 |

Cleanup action은 다음과 같다.

| Action        | 설명                                           |
| ------------- | ---------------------------------------------- |
| `MARK_STALE`  | 장기 미사용 token을 stale로 표시               |
| `MARK_FAILED` | 반복 실패 token을 failed로 표시                |
| `REVOKE`      | invalid/expired/consent revoked token을 revoke |
| `HARD_DELETE` | retention 만료 token을 hard delete             |
| `SKIP`        | 정리 대상 아님                                 |

Cleanup reason은 다음을 포함한다.

```text
STALE_LAST_SEEN
EXPIRED_MAX_AGE
FAILURE_THRESHOLD_EXCEEDED
PROVIDER_INVALID_TOKEN
USER_LOGOUT
USER_WITHDRAWAL
CONSENT_REVOKED
ADMIN_PRIVACY_REQUEST
HARD_DELETE_RETENTION_EXPIRED
```

---

## 12. 개인정보와 광고 분리 정책

notifications 서비스의 개인정보 보호 원칙은 다음과 같다.

1. Raw push token은 요청 경계에서만 사용하고 로그·감사·응답에는 저장하지 않는다.
2. Push token은 SHA-256 tokenHash 기준으로만 감사·정리·재시도에 남긴다.
3. 급여, 급여일, 급여명세, 고정지출, 저축액, 대출, 계좌, 카드 내역은 FCM payload에 포함하지 않는다.
4. 광고/제휴 알림은 급여·지출·저축 원문 데이터 타겟팅을 사용하지 않는다.
5. 마케팅 알림은 명시적 수신 동의가 확인된 경우에만 보낸다.
6. 운영 이벤트에는 민감 payload를 sanitization 후 저장한다.
7. advertiser, partner, 외부 webhook에는 userId, token, email, phone, 금융 원문을 전달하지 않는다.

허용되는 패턴은 다음과 같다.

- contextual 알림
- 거래성/보안성 알림
- 사용자가 동의한 마케팅 알림
- one-way hash 기반 token audit
- aggregate/summary-only operational event

금지되는 패턴은 다음과 같다.

```text
console.log(rawPushToken)
FCM data에 salary/expense/savings/loan/account/card 포함
광고 알림에서 payroll/expense/savings 원문 targeting
service account private key를 wrangler.toml에 저장
operation webhook으로 payload 원문 전송
invalid token을 계속 retry
사용자 동의 철회 후 push token 유지
```

---

## 13. 운영 환경변수

대표 환경변수는 다음과 같다.

```text
APP_ENV
ENVIRONMENT
NODE_ENV
SERVICE_NAME
TIMEZONE
CORS_ALLOWED_ORIGINS
ALLOWED_ORIGINS
GOOGLE_SERVICE_ACCOUNT_JSON
FCM_PROJECT_ID
FCM_CLIENT_EMAIL
FCM_PRIVATE_KEY
FCM_ACCESS_TOKEN
FCM_DRY_RUN
FCM_DISABLE_NETWORK
NOTIFICATIONS_SERVICE_TOKEN_SHA256
NOTIFICATIONS_OPERATION_WEBHOOK_URL
NOTIFICATIONS_OPERATION_WEBHOOK_TOKEN
ENABLE_NOTIFICATION_QUEUE_HANDLER
NOTIFICATIONS_AUDIT_TO_CONSOLE
NOTIFICATIONS_DISABLE_HTTP_SEND
NOTIFICATION_RETRY_MAX_ATTEMPTS
NOTIFICATION_RETRY_BASE_DELAY_SECONDS
NOTIFICATION_RETRY_MAX_DELAY_SECONDS
NOTIFICATION_RETRY_JITTER_RATIO
NOTIFICATION_RETRY_BATCH_SIZE
NOTIFICATION_RETRY_DRY_RUN
PUSH_TOKEN_STALE_AFTER_DAYS
PUSH_TOKEN_EXPIRED_AFTER_DAYS
PUSH_TOKEN_FAILURE_THRESHOLD
PUSH_TOKEN_HARD_DELETE_AFTER_DAYS
PUSH_TOKEN_CLEANUP_BATCH_SIZE
PUSH_TOKEN_CLEANUP_DRY_RUN
```

secrets는 `wrangler.toml`에 저장하지 않는다. 환경별로 `wrangler secret put`으로 등록한다.

필수 production secrets는 다음과 같다.

```bash
wrangler secret put GOOGLE_SERVICE_ACCOUNT_JSON --env production
wrangler secret put NOTIFICATIONS_SERVICE_TOKEN_SHA256 --env production
wrangler secret put NOTIFICATIONS_OPERATION_WEBHOOK_TOKEN --env production
```

분리 service account 방식은 다음을 사용한다.

```bash
wrangler secret put FCM_CLIENT_EMAIL --env production
wrangler secret put FCM_PRIVATE_KEY --env production
wrangler secret put FCM_PROJECT_ID --env production
```

---

## 14. Wrangler 배포 계약

`wrangler.toml`은 다음을 포함해야 한다.

- `main = "src/index.ts"`
- development/staging/production env
- FCM dry-run/network control
- retry queue producer/consumer
- operation queue producer/consumer
- dead-letter queue
- Cron triggers
- observability
- smart placement
- production custom domain
- CORS origins
- token-hash-only flag
- raw financial data logging forbidden flag
- ads financial targeting forbidden flag
- marketing consent guard flag

배포 명령은 다음과 같다.

```bash
pnpm --filter @salary-hijacking/notifications deploy:staging
pnpm --filter @salary-hijacking/notifications deploy:production
```

---

## 15. 개발 명령

```bash
pnpm --filter @salary-hijacking/notifications dev
pnpm --filter @salary-hijacking/notifications typecheck:strict
pnpm --filter @salary-hijacking/notifications test:qa
pnpm --filter @salary-hijacking/notifications build
pnpm --filter @salary-hijacking/notifications deploy:staging
```

품질 게이트는 다음 명령을 모두 통과해야 한다.

```bash
pnpm --filter @salary-hijacking/notifications format:check
pnpm --filter @salary-hijacking/notifications lint
pnpm --filter @salary-hijacking/notifications typecheck:strict
pnpm --filter @salary-hijacking/notifications test:unit
pnpm --filter @salary-hijacking/notifications test:integration
pnpm --filter @salary-hijacking/notifications test:e2e
pnpm --filter @salary-hijacking/notifications privacy:check
pnpm --filter @salary-hijacking/notifications security:scan
pnpm --filter @salary-hijacking/notifications build
```

---

## 16. TypeScript 기준

`services/notifications/tsconfig.json`은 다음을 원칙으로 한다.

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

## 17. Repository/Producer Injection

notifications 서비스는 DB와 Queue 구현을 직접 고정하지 않고 contract로 분리한다.

```text
Notification Event
→ services/api notifications route
→ notifications worker/index.ts
→ fcm.client.ts
→ retry-queue.ts
→ push-token-cleanup.ts
→ repository/queue adapter
→ Cloudflare Queue / DB / FCM
```

이 구조의 목적은 다음과 같다.

1. local/dev/test에서 in-memory repository와 producer 사용
2. production에서 DB repository와 Cloudflare Queue 연결
3. FCM 장애와 DB 장애를 독립적으로 제어
4. raw token 보관 경계를 명확히 제한
5. retry/dead-letter/token cleanup을 E2E로 검증 가능

---

## 18. 테스트 기준

테스트는 최소 다음 레이어로 구성한다.

1. Unit: FCM payload validation, sensitive key/value blocking, token hash, retry decision, cleanup evaluation
2. Integration: index HTTP endpoint + fcm dry-run + service token auth
3. Queue: Queue message dispatch, retry ack/retry, validate message handling
4. Cron: scheduled readiness event, retry sweep, cleanup readiness
5. Privacy QA: raw push token, salary, expense, savings, loan, account, card absence
6. Failure QA: invalid token cleanup, transient retry, permanent dead-letter
7. Deployment smoke: staging Worker health/ready/manifest

필수 smoke endpoint는 다음과 같다.

```text
GET /notifications/v1/health
GET /notifications/v1/ready
GET /notifications/v1/manifest
POST /notifications/v1/validate
POST /notifications/v1/send
POST /notifications/v1/multicast
POST /notifications/v1/topic
POST /notifications/v1/condition
```

필수 자체 완성도 함수는 다음과 같다.

```text
assertFcmClientCompleteness()
assertNotificationsServiceCompleteness()
assertPushTokenCleanupCompleteness()
assertNotificationRetryQueueCompleteness()
```

---

## 19. 운영 안정성 기준

운영 환경에서 다음 기준을 유지한다.

- 모든 HTTP POST는 service-token 인증을 요구한다.
- production service-token은 SHA-256 hash 방식이 우선이다.
- 모든 요청은 requestId를 포함한다.
- 모든 FCM 발송 결과는 표준 envelope를 따른다.
- 모든 재시도는 idempotencyKey를 사용한다.
- 모든 invalid token은 cleanup 경로로 분리한다.
- Retry max attempts 초과 메시지는 dead-letter로 이동한다.
- Queue/Cron/운영 webhook 로그에는 tokenHash만 남긴다.
- FCM access token과 service account private key는 로그에 남기지 않는다.
- 민감 금융 데이터는 FCM data payload, log, audit, webhook에 남기지 않는다.
- 광고/제휴 알림은 금융 원문 타겟팅과 분리한다.

---

## 20. 보안 헤더 기준

HTTP 응답은 다음 보안 헤더를 포함해야 한다.

```text
x-request-id
x-service-name
x-service-version
x-fcm-client-version
x-content-type-options: nosniff
referrer-policy: no-referrer
permissions-policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()
x-financial-raw-data-exposed: false
x-ad-financial-targeting: separated
```

---

## 21. 금지 패턴

아래 패턴은 `services/notifications`에서 금지한다.

```text
raw push token을 console/audit/response에 기록
FCM data payload에 급여/계좌/카드/대출/저축/지출 원문 포함
마케팅 동의 없이 MARKETING 알림 발송
광고/제휴 알림에서 payroll/expense/savings 원문 targeting
service account private key를 wrangler.toml에 저장
retry queue에서 idempotencyKey 없이 enqueue
invalid token을 재시도만 반복하고 cleanup하지 않음
production service-token 미설정
operation webhook으로 payload 원문 전송
TypeScript strict 옵션 완화
Cloudflare Queue/DLQ 없이 production deploy
```

---

## 22. 완료 기준

`services/notifications` 파일 단위 완료 기준은 다음과 같다.

- `package.json` JSON 문법 정상
- `wrangler.toml` TOML 문법 정상
- `tsconfig.json` TypeScript strict 기준 정상
- `src/index.ts` Worker default export 정상
- `src/fcm.client.ts` FCM HTTP v1 client 정상
- `src/retry-queue.ts` retry/dead-letter policy 정상
- `src/push-token-cleanup.ts` token cleanup policy 정상
- health/ready/manifest endpoint 제공
- service-token production guard 제공
- Queue/Cron entrypoint 제공
- token-hash-only 원칙 명시
- 민감 금융 데이터 비로그 원칙 명시
- 광고 금융 타겟팅 금지 원칙 명시
- README 운영 문서 최신화

프로젝트 종합 운영 완료 기준은 별도다. 실제 운영 100%는 notifications 파일뿐 아니라 API route, DB repository, Cloudflare Queue/Cron/secrets, FCM 프로젝트, 프론트엔드 권한/토큰 등록, 전체 E2E/QA, staging/production deploy까지 통과해야 확정된다.

---

## 23. 파일 단위 상태

```text
문서상·이론상 파일 단위 상태: 최종본
대상 경로: services/notifications/README.md
서비스 범위: Cloudflare Workers 알림 서비스
핵심 기능: FCM HTTP v1, retry queue, push-token cleanup, Queue/Cron, 운영 이벤트
핵심 도메인: 급여일, 결제 예정, 저축 예정, 예산 초과, 납치 목표, LV UP, 커뮤니티, 공지, 보안
보안 기준: service-token, SHA-256 tokenHash, raw token 비로그, 민감 금융 데이터 차단
광고 기준: 마케팅 동의 guard, 광고 금융 타겟팅 금지, contextual/opt-in only
운영 기준: health/readiness/manifest, Wrangler 배포, Queue/DLQ, Cron, FCM secrets, QA 게이트
```
