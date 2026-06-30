# services/api

급여납치(Salary Hijacking) 플랫폼의 Cloudflare Workers 기반 서버 권위 API 서비스다. 이 패키지는 프론트엔드, 관리자 콘솔, 운영 자동화, 알림, 업로드, 커뮤니티, 급여·예산·지출·저축·LV UP 도메인을 하나의 안정적인 API 게이트웨이로 연결한다.

본 README는 `services/api` 폴더의 최종 운영 기준 문서다. API 서비스의 역할, 실행 방식, 폴더 구조, 미들웨어 체인, 라우트 계약, 보안·개인정보·광고 분리 정책, 배포/운영/테스트 기준을 정의한다.

---

## 1. 서비스 역할

`services/api`는 급여납치 플랫폼의 백엔드 API 경계다. 클라이언트가 직접 계산하거나 신뢰할 수 없는 상태를 기준으로 급여·예산·지출·저축 결과를 확정하지 않도록 모든 핵심 계산을 서버 권위로 처리한다.

핵심 책임은 다음과 같다.

1. 사용자 인증, 세션, 권한, 관리자 MFA 흐름을 보호한다.
2. 급여계획, 일일예산, 고정지출, 변동지출, 고정저축을 서버에서 계산한다.
3. 알림, LV UP, 커뮤니티, 업로드, 마이페이지, 관리자 콘솔 API를 통합한다.
4. 모든 사용자 데이터에 `userId` 소유권 경계를 적용한다.
5. 토큰, 계좌, 카드, 급여명세, 급여액, 대출, 지출, 저축 등 민감 데이터가 로그·광고·외부 파트너로 유출되지 않도록 차단한다.
6. 관리자 작업은 MFA, 권한, 사유, 감사 로그를 전제로 처리한다.
7. Cloudflare Workers, R2, Queue, Cron, Neon PostgreSQL, Drizzle ORM과 연결 가능한 구조를 제공한다.
8. 라우트별 repository injection을 지원해 in-memory 개발 모드와 DB 운영 모드를 분리한다.

---

## 2. 런타임과 기술 스택

| 영역            | 기준                                                             |
| --------------- | ---------------------------------------------------------------- |
| Runtime         | Cloudflare Workers Module Worker                                 |
| Entry point     | `src/index.ts`                                                   |
| App Gateway     | `src/app.ts`                                                     |
| Language        | TypeScript strict                                                |
| API Framework   | Fetch API compatible handlers                                    |
| DB              | Neon PostgreSQL + Drizzle ORM repository contract                |
| Validation      | TypeScript + domain validators + Zod 연동 가능 구조              |
| Auth            | Bearer JWT, refresh rotation, admin MFA, role/permission guard   |
| Storage         | Cloudflare R2 upload contract                                    |
| Queue           | Cloudflare Queues operational events                             |
| Cron            | Cloudflare Workers scheduled entrypoint                          |
| Logging         | JSON structured operational events, raw financial data redaction |
| Package Manager | pnpm workspace                                                   |

---

## 3. 폴더 구조 계약

`services/api`의 최종 구조는 아래 계약을 기준으로 유지한다.

```text
services/api
├─ README.md
├─ package.json
├─ tsconfig.json
├─ wrangler.toml
├─ src
│  ├─ index.ts
│  ├─ app.ts
│  ├─ middlewares
│  │  ├─ auth.middleware.ts
│  │  ├─ error.middleware.ts
│  │  ├─ rate-limit.middleware.ts
│  │  └─ audit-log.middleware.ts
│  ├─ routes
│  │  ├─ admin.routes.ts
│  │  ├─ auth.routes.ts
│  │  ├─ community.routes.ts
│  │  ├─ daily-budgets.routes.ts
│  │  ├─ fixed-expenses.routes.ts
│  │  ├─ growth.routes.ts
│  │  ├─ notifications.routes.ts
│  │  ├─ payroll.routes.ts
│  │  ├─ savings.routes.ts
│  │  ├─ uploads.routes.ts
│  │  ├─ users.routes.ts
│  │  └─ variable-expenses.routes.ts
│  ├─ services
│  ├─ repositories
│  ├─ policies
│  ├─ validators
│  ├─ utils
│  └─ worker-configuration.d.ts
└─ tests
   ├─ unit
   ├─ integration
   └─ e2e
```

라우트 파일은 Fetch API compatible handler를 export해야 하며, 각 파일은 `create*Routes`, `handle*Routes`, `*RoutesManifest`, `assert*RoutesCompleteness`를 제공하는 것을 표준으로 한다.

---

## 4. 엔트리포인트 계약

### 4.1 `src/index.ts`

Cloudflare Workers의 실제 default export다.

필수 책임은 다음과 같다.

- `fetch(request, env, context)`를 통해 HTTP API를 처리한다.
- `scheduled(controller, env, context)`를 통해 Cron readiness/운영 이벤트를 처리한다.
- `queue(batch, env, context)`를 통해 운영 Queue 이벤트를 sanitization 후 처리한다.
- 실제 라우팅과 보안 처리는 `src/app.ts`에 위임한다.
- 운영 webhook 전송은 `globalThis.fetch`를 사용해 Worker `fetch` 함수 shadowing을 방지한다.
- Queue/Cron 로그에는 민감 금융 원문을 남기지 않는다.

### 4.2 `src/app.ts`

API 전체 라우트 게이트웨이다.

필수 책임은 다음과 같다.

- 12개 도메인 라우트를 중앙 dispatch한다.
- 인증, 오류, 레이트리밋, 감사 게이트를 연결한다.
- `/health`, `/ready`, `/api/v1/manifest`, `/api/v1/app-config`를 제공한다.
- CORS allowlist와 보안 헤더를 적용한다.
- 관리자 mutation에는 `X-Admin-Reason`을 강제한다.
- 원시 금융 데이터 광고 타겟팅 금지 정책을 응답 헤더/manifest로 명시한다.

---

## 5. API Prefix

| 도메인            | Prefix                        |
| ----------------- | ----------------------------- |
| 인증              | `/api/v1/auth`, `/admin/auth` |
| 관리자            | `/admin/api/v1`               |
| 사용자/마이페이지 | `/api/v1/users`               |
| 급여계획          | `/api/v1/payroll`             |
| 일일예산          | `/api/v1/daily-budgets`       |
| 고정지출          | `/api/v1/fixed-expenses`      |
| 변동지출          | `/api/v1/variable-expenses`   |
| 고정저축/저축목표 | `/api/v1/savings`             |
| 알림              | `/api/v1/notifications`       |
| LV UP/자기계발    | `/api/v1/growth`              |
| 커뮤니티          | `/api/v1/community`           |
| 업로드            | `/api/v1/uploads`             |

---

## 6. 서버 권위 계산 원칙

급여납치의 핵심 계산은 클라이언트가 아니라 API 서버가 수행한다.

### 6.1 급여계획

```text
총 차감 예정액 = 고정지출 + 고정저축 + 변동지출 예비금 + 비상금
일일예산 가능액 = max(0, 급여액 + 이월금 - 총 차감 예정액 - 이미 사용한 금액)
권장 일일예산 = floor(일일예산 가능액 / 기간 일수)
급여납치율 = 총 차감 예정액 / 급여액
```

### 6.2 일일예산

```text
사용 가능액 = 계획 금액 + 조정 금액
잔여액 = 사용 가능액 - 당일 변동지출
사용률 = 당일 변동지출 / 사용 가능액
상태 = PLANNED | ACTIVE | OVERSPENT | CLOSED
```

### 6.3 고정지출 영향

```text
일일예산 가능액 = max(0, 급여액 - 고정지출 - 고정저축 - 변동지출 예비금)
권장 일일예산 = floor(일일예산 가능액 / 기간 일수)
```

### 6.4 저축 영향

```text
고정저축 총액 = 기간 내 예정 저축 횟수 × 회차별 저축액
일일예산 가능액 = max(0, 급여액 - 고정지출 - 고정저축 총액 - 변동지출 예비금 - 비상금)
```

### 6.5 변동지출 영향

```text
실제 변동지출 = 지출액 - 환불액 - 무효/삭제 금액
일일예산 잔여액 = 일일예산 총액 - 실제 변동지출
예비금 잔여액 = 계획 변동지출 예비금 - 실제 변동지출
```

모든 금액은 KRW 정수 minor unit으로 처리한다. 소수 금액, 음수 입력, 클라이언트 확정 계산은 허용하지 않는다.

---

## 7. 인증과 권한

API는 auth middleware가 생성한 trusted header를 기준으로 principal을 구성한다.

필수 trusted header는 다음과 같다.

```text
x-auth-context-source: auth.middleware
x-authenticated-user-id: <user-id>
x-authenticated-roles: USER,ADMIN,...
x-authenticated-permissions: permission1,permission2,...
x-auth-policy-id: <policy-id>
```

라우트는 `x-auth-context-source`가 `auth.middleware`가 아닌 경우 기본적으로 요청을 거부해야 한다. 공개 라우트는 auth middleware의 public policy에서 별도 허용한다.

관리자 작업은 다음 조건을 요구한다.

1. 관리자 인증 세션
2. MFA 검증
3. role/permission check
4. mutation 사유 입력
5. 감사 로그 기록
6. 민감 금융 원문 조회 제한

---

## 8. 오류 응답 표준

모든 오류는 표준 JSON envelope를 사용한다.

```json
{
  "success": false,
  "error": {
    "code": "DOMAIN_ERROR_CODE",
    "message": "사용자에게 표시 가능한 메시지",
    "status": 400,
    "requestId": "req_..."
  },
  "meta": {
    "service": "salary-hijacking-api",
    "version": "3.1.x",
    "requestId": "req_...",
    "path": "/api/v1/...",
    "timestamp": "2026-06-15T00:00:00.000Z"
  }
}
```

운영 환경에서 stack trace, token, password, 계좌, 카드, 급여명세, raw salary, raw expense, raw savings, 광고 타겟팅 내부 값은 반환하지 않는다.

---

## 9. 성공 응답 표준

```json
{
  "success": true,
  "data": {},
  "meta": {
    "service": "salary-hijacking-api",
    "version": "3.1.x",
    "requestId": "req_...",
    "path": "/api/v1/...",
    "timestamp": "2026-06-15T00:00:00.000Z"
  }
}
```

목록 응답은 다음 pagination contract를 사용한다.

```json
{
  "items": [],
  "page": 1,
  "pageSize": 20,
  "total": 0
}
```

`pageSize`는 기본 20, 최대 100을 원칙으로 한다.

---

## 10. 개인정보와 광고 분리 정책

급여납치 API는 광고·제휴·추천 기능을 지원하지만 민감 금융 원문 데이터와 분리한다.

금지되는 패턴은 다음과 같다.

- 급여액, 급여일, 급여명세, 고정지출, 저축액, 대출, 계좌, 카드 내역을 광고 타겟팅에 직접 사용
- 광고 테이블과 payroll/expense/savings 테이블 직접 join
- advertiser에게 userId, email, phone, 계좌, 급여 정보 전달
- 커뮤니티/광고/콘텐츠 추천에서 raw financial profile 사용
- Queue/Cron/감사 로그에 원문 금융 데이터 저장

허용되는 패턴은 다음과 같다.

- 비개인화/contextual 광고
- 명시적 opt-in 기반의 비민감 관심사 추천
- one-way hashed ad profile id
- aggregate/summary-only privacy export
- 광고/제휴 라벨 명시

---

## 11. 업로드 정책

업로드 API는 Cloudflare R2 저장소 계약을 기준으로 한다.

허용 목적은 다음과 같다.

- 프로필 이미지
- 커뮤니티 첨부
- LV UP 인증
- 공지 첨부
- 광고 크리에이티브
- 고객지원 첨부

기본 차단 대상은 다음과 같다.

- 급여명세서
- 통장 사본
- 계좌번호 이미지
- 카드번호 이미지
- 대출계약서
- 주민등록증/신분증
- 기타 민감 금융·신원 원문 파일

업로드는 prepare/direct/finalize/scan/download/attach/delete lifecycle을 따른다.

---

## 12. 운영 환경변수

대표 환경변수는 다음과 같다.

```text
APP_ENV
ENVIRONMENT
NODE_ENV
APP_PUBLIC_BASE_URL
CORS_ALLOWED_ORIGINS
ALLOWED_ORIGINS
JWT_SECRET
AUTH_JWT_SECRET
JWT_PUBLIC_KEYS_JSON
HASH_SECRET
RATE_LIMIT_HASH_SECRET
AUDIT_HASH_SECRET
OPERATION_WEBHOOK_URL
OPERATION_WEBHOOK_TOKEN
ENABLE_QUEUE_HANDLER
INDEX_AUDIT_TO_CONSOLE
```

secrets는 `wrangler.toml`에 직접 저장하지 않는다. `wrangler secret put`으로 환경별 등록한다.

---

## 13. Wrangler 배포 계약

`wrangler.toml`은 다음을 포함해야 한다.

- `main = "src/index.ts"`
- compatibility date
- development/staging/production env
- R2 bucket binding
- Queue producer/consumer binding
- Cron triggers
- observability
- smart placement
- CORS origins
- server-authority/ad-separation/admin-reason flags

배포 명령은 다음과 같다.

```bash
pnpm --filter @salary-hijacking/api deploy:staging
pnpm --filter @salary-hijacking/api deploy:production
```

---

## 14. 개발 명령

```bash
pnpm --filter @salary-hijacking/api dev
pnpm --filter @salary-hijacking/api typecheck:strict
pnpm --filter @salary-hijacking/api test:qa
pnpm --filter @salary-hijacking/api build
pnpm --filter @salary-hijacking/api deploy:staging
```

품질 게이트는 다음 명령을 모두 통과해야 한다.

```bash
pnpm --filter @salary-hijacking/api format:check
pnpm --filter @salary-hijacking/api lint
pnpm --filter @salary-hijacking/api typecheck:strict
pnpm --filter @salary-hijacking/api test:unit
pnpm --filter @salary-hijacking/api test:integration
pnpm --filter @salary-hijacking/api test:e2e
pnpm --filter @salary-hijacking/api privacy:check
pnpm --filter @salary-hijacking/api security:scan
pnpm --filter @salary-hijacking/api build
```

---

## 15. TypeScript 기준

`services/api/tsconfig.json`은 다음을 원칙으로 한다.

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

## 16. Repository Injection

라우트는 DB 구현을 직접 import하지 않고 repository contract를 통해 주입받는다.

```text
Route → Middleware Context → Validator → Repository Contract → DB/External Adapter
```

이 구조의 목적은 다음과 같다.

1. local/dev/test에서 in-memory fallback 사용
2. production에서 Neon/Drizzle repository 연결
3. 도메인별 E2E/통합 테스트 격리
4. Cloudflare Workers 런타임 의존 최소화
5. 서버 권위 계산 로직과 저장소 구현 분리

---

## 17. 도메인별 필수 기능

### Auth

- 회원가입
- 로그인
- 소셜 로그인/OAuth callback
- refresh rotation
- logout/logout-all
- me
- password reset
- email verification
- admin login
- admin MFA verify

### Users

- 마이페이지 조회/수정
- 설정 조회/수정
- 동의 조회/수정
- 개인정보 export
- 탈퇴/복구
- 활동 요약

### Payroll

- 급여계획 CRUD
- 급여 홈
- 현재 계획
- summary/calendar
- simulate/recalculate
- activate/pause/archive

### Daily Budgets

- 일일예산 CRUD
- 오늘 예산
- 날짜별 예산
- summary/calendar
- spend 기록
- adjustment
- recalculate

### Fixed Expenses

- 고정지출 CRUD
- pause/resume/end
- payment record
- summary/upcoming/calendar
- daily budget impact

### Variable Expenses

- 변동지출 CRUD
- today/recent/summary/calendar/category
- refund/void
- budget impact

### Savings

- 저축목표 CRUD
- pause/resume/archive
- deposit/withdraw/transaction
- upcoming/summary/calendar
- daily budget impact

### Notifications

- 알림 목록/생성
- read/read-all/archive/delete
- unread count/summary
- preferences
- devices
- rule preview

### Growth

- LV/EXP profile
- tasks CRUD
- progress
- challenges
- contents
- badges
- leaderboard
- recommendations without raw financial targeting

### Community

- boards
- posts CRUD
- comments CRUD
- likes
- reports
- anonymous display
- moderation-ready contract

### Uploads

- prepare
- direct upload
- finalize
- scan/quarantine
- download URL
- attach
- quota

### Admin

- dashboard
- users
- community moderation
- reports
- notices
- ads campaigns
- growth tasks
- audit logs
- role members
- mutation reason enforcement

---

## 18. 테스트 기준

테스트는 최소 다음 레이어로 구성한다.

1. Unit: validators, calculators, redaction, route dispatch
2. Integration: route + middleware + repository contract
3. E2E: auth → payroll → budget → expense → savings → notification
4. Admin E2E: admin login/MFA → mutation reason → audit event
5. Privacy QA: raw financial data response/log/ad payload absence
6. Performance smoke: health/ready/manifest, representative domain routes
7. Deployment smoke: staging Worker URL health check

필수 smoke endpoint는 다음과 같다.

```text
GET /health
GET /api/v1/ready
GET /api/v1/manifest
GET /api/v1/app-config
GET /api/v1/payroll/summary
GET /api/v1/daily-budgets/summary
GET /api/v1/fixed-expenses/summary
GET /api/v1/variable-expenses/summary
GET /api/v1/savings/summary
GET /api/v1/notifications/summary
GET /api/v1/growth/profile
GET /api/v1/community/boards
GET /api/v1/uploads/quota
GET /api/v1/users/me
```

---

## 19. 운영 안정성 기준

운영 환경에서 다음 기준을 유지한다.

- 모든 mutation은 idempotency key 지원 여부를 도메인별로 명확히 한다.
- 모든 응답에 requestId를 포함한다.
- 모든 에러는 표준 JSON envelope를 따른다.
- 모든 관리자 mutation은 reason을 요구한다.
- 운영 webhook/Queue 로그는 sanitization을 거친다.
- Cloudflare R2/Queue/Cron binding 누락 시 readiness에서 감지 가능해야 한다.
- DB 장애는 외부로 stack trace를 노출하지 않는다.
- 민감 데이터는 운영 콘솔 로그에도 남기지 않는다.

---

## 20. 금지 패턴

아래 패턴은 `services/api`에서 금지한다.

```text
클라이언트 계산값을 그대로 확정 저장
userId ownership 검증 없는 상세/수정/삭제
관리자 mutation reason 누락
광고 도메인과 급여/지출/저축 원문 데이터 직접 join
console.log로 token/account/card/salary/expense/savings 출력
Response에 stack trace 포함
catch(error: any) 후 원문 반환
라우트에서 DB client 직접 생성
라우트 파일에서 env secret 직접 로깅
@cloudflare/workers-types를 설치 없이 tsconfig types에 고정
TypeScript baseUrl deprecation 방치
```

---

## 21. 완료 기준

`services/api` 파일 단위 완료 기준은 다음과 같다.

- `package.json` JSON 문법 정상
- `tsconfig.json` TypeScript 5.8+ strict 기준 정상
- `wrangler.toml` TOML 문법 정상
- `src/index.ts` Worker default export 정상
- `src/app.ts` 12개 라우트 연결 정상
- middlewares 4종 연결 가능
- routes 12종 completeness assertion 제공
- health/ready/manifest/app-config 제공
- 민감 금융 데이터 광고 분리 정책 명시
- 관리자 reason/audit 정책 명시
- README 운영 문서 최신화

프로젝트 종합 운영 완료 기준은 별도다. 실제 운영 100%는 API 파일뿐 아니라 DB repository, Cloudflare 리소스, secrets, 프론트엔드, 관리자 콘솔, E2E/QA, staging/production deploy까지 통과해야 확정된다.

---

## 22. 파일 단위 상태

```text
문서상·이론상 파일 단위 상태: 최종본
대상 경로: services/api/README.md
서비스 범위: Cloudflare Workers API 서버
핵심 도메인: 인증, 관리자, 사용자, 급여, 일일예산, 고정지출, 변동지출, 저축, 알림, LV UP, 커뮤니티, 업로드
보안 기준: 서버 권위, 소유권 경계, 민감정보 마스킹, 광고 금융 데이터 분리, 관리자 사유 강제
운영 기준: health/readiness/manifest/app-config, Wrangler 배포, R2/Queue/Cron 준비, QA 게이트
```
