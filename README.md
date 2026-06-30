# Salary Hijacking Platform · 급여납치

> 문서 상태: 최종본  
> 파일 위치: `README.md`  
> 프로젝트: 급여납치 Salary Hijacking Platform  
> 기준 구조: `salary-hijacking-platform` monorepo  
> 기준 패키지 매니저: `pnpm@10`  
> 기준 태스크 러너: Turborepo  
> 기준 DB: Neon PostgreSQL / PostgreSQL  
> 기준 시간대: `Asia/Seoul`  
> 기준 통화: KRW, 1원 단위 정수  
> 핵심 원칙: 서버 권위 계산, RLS, 관리자 RBAC, 감사 가능성, 재무 원천 데이터 보호, 광고 데이터 분리, 자동화 검증, 상용 운영 준비

---

## 1. 프로젝트 개요

급여납치는 직장인·아르바이트생·프리랜서 등 월급 또는 정기 수입을 기반으로 생활하는 사용자가 급여 수령 직후부터 고정지출, 고정저축, 생활비, 일일 소비, 변동지출, 알림, 자기계발 루틴, 커뮤니티 인증, 광고/제휴 혜택까지 통합 관리할 수 있도록 설계된 모바일 중심 급여관리·가계부·자기계발 플랫폼이다.

서비스의 핵심 질문은 “얼마를 썼는가?”가 아니라 “이번 월급에서 얼마를 지켜냈는가?”이다. 급여납치는 사용자의 수령 예정 급여에서 고정지출, 고정저축, 생활비, 변동지출을 서버 권위로 계산하고, 사용자가 지켜낸 금액을 납치금액으로 시각화한다.

급여납치 플랫폼은 다음 도메인을 통합한다.

1. 사용자 인증과 프로필
2. 급여 계획과 급여일 관리
3. 고정지출 관리
4. 고정저축 관리
5. 일일 예산 관리
6. 변동지출 기록
7. 납치금액과 계산 스냅샷
8. 알림과 푸시 발송
9. LV UP 자기계발 루틴
10. 커뮤니티와 글쓰기
11. 마이페이지
12. 관리자 콘솔
13. 광고/제휴 운영
14. 운영 지표와 장애 대응
15. 보안·개인정보·데이터 보존 정책
16. QA, E2E, UAT, 릴리즈 운영

---

## 2. 저장소 구성 원칙

이 저장소는 문서상·이론상 최종 구조를 기준으로 하는 통합 모노레포다. 모바일 앱, 관리자 웹, 백엔드 API, 스케줄러, 알림 worker, 공통 패키지, 데이터베이스, 인프라, QA, 운영, 출시 문서가 하나의 저장소 안에서 관리된다.

구성 원칙은 다음과 같다.

1. 루트 파일은 monorepo 실행 계약을 정의한다.
2. `docs/`는 모든 구현의 상위 요구사항과 판단 기준이다.
3. `database/`는 서버 권위 계산과 데이터 정합성의 원천이다.
4. `packages/`는 타입, API 계약, DB, 보안, UI, 유틸의 공유 경계다.
5. `services/`는 API, 알림, 스케줄러 등 서버 런타임을 담당한다.
6. `apps/`는 사용자 모바일 앱과 관리자 콘솔을 담당한다.
7. `infra/`, `.github/`, `scripts/`, `tools/`는 배포와 자동화 품질 게이트를 담당한다.
8. `security/`, `qa/`, `ops/`, `observability/`, `release/`는 상용화와 운영 안정성을 담당한다.
9. 급여·지출·저축·예산·납치금액은 민감한 재무 데이터로 분류한다.
10. 광고/제휴 이벤트는 재무 원천 데이터와 분리한다.

---

## 3. 최상위 작업 순서

프로젝트 작업은 최상위 폴더 기준으로 아래 순서로 진행한다.

```txt
루트 파일
→ docs
→ database
→ packages
→ services
→ apps
→ assets
→ infra
→ scripts
→ tools
→ .github
→ security
→ observability
→ qa
→ ops
→ release
```

| 순서 | 대상             | 목적                                                                                                                                           |
| ---: | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
|    0 | 루트 파일        | `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `.env.example`, `MANIFEST.json`, `TREE.txt`, `SECURITY.md`, `LICENSE` 등 저장소 계약 확정 |
|    1 | `docs/`          | 제품, 기능, UX/UI, 데이터, API, 보안, QA, 운영, 출시 요구사항 확정                                                                             |
|    2 | `database/`      | ERD, migration, policy, seed, backup, RLS, 서버 권위 계산 확정                                                                                 |
|    3 | `packages/`      | 공통 타입, API 계약, DB 클라이언트, 보안, UI, 유틸 확정                                                                                        |
|    4 | `services/`      | API, notification worker, scheduler 구현                                                                                                       |
|    5 | `apps/`          | 모바일 앱과 관리자 콘솔 구현                                                                                                                   |
|    6 | `assets/`        | 브랜드, 디자인, 프로토타입, 스토어 자산 정리                                                                                                   |
|    7 | `infra/`         | Cloudflare, Neon, domain, env, GitHub environment/secrets 구성                                                                                 |
|    8 | `scripts/`       | DB, 개발환경, 문서, 품질, 릴리즈 자동화                                                                                                        |
|    9 | `tools/`         | API contract, DB schema, doc lint, security audit 도구                                                                                         |
|   10 | `.github/`       | CI/CD, issue, PR, CODEOWNERS, 보안 스캔 workflow                                                                                               |
|   11 | `security/`      | 위협모델, PIA, 보안 체크리스트, 취약점 대응                                                                                                    |
|   12 | `observability/` | 로그, 메트릭, 대시보드, 알림 규칙                                                                                                              |
|   13 | `qa/`            | 테스트 계획, 테스트 케이스, 보안/성능/UAT 검증                                                                                                 |
|   14 | `ops/`           | 관리자 운영, CS, 모더레이션, 장애 대응, 운영 지표                                                                                              |
|   15 | `release/`       | 릴리즈 노트, 롤백, 스토어 등록, 버전 정책                                                                                                      |

---

## 4. 최상위 폴더

| 폴더                      | 역할                                                                                |
| ------------------------- | ----------------------------------------------------------------------------------- |
| `.github/`                | 이슈 템플릿, PR 템플릿, CODEOWNERS, CI/CD, 배포, 릴리즈, 보안 스캔 workflow         |
| `apps/mobile/`            | Expo Router 기반 사용자용 모바일 앱                                                 |
| `apps/admin/`             | Next.js 기반 관리자 웹 콘솔                                                         |
| `services/api/`           | Cloudflare Workers 기반 API 서버                                                    |
| `services/scheduler/`     | 급여일, 고정지출, 월마감, 보존/삭제, 알림 스케줄러                                  |
| `services/notifications/` | 푸시 알림 발송, 토큰 정리, 실패 재시도, 알림 큐 처리                                |
| `packages/api-contract/`  | API 요청/응답 schema, error code, OpenAPI 계약                                      |
| `packages/config/`        | ESLint, Prettier, TypeScript 공통 설정                                              |
| `packages/db/`            | Neon 클라이언트, DB schema, migration helper                                        |
| `packages/security/`      | 암호화, 마스킹, 권한, rate limit 유틸                                               |
| `packages/types/`         | payroll, expense, growth, notification, community, user 도메인 타입                 |
| `packages/ui/`            | 모바일/관리자 공통 UI 컴포넌트와 디자인 토큰                                        |
| `packages/utils/`         | 날짜, 금액, pagination, string 유틸                                                 |
| `database/`               | Neon PostgreSQL migration, seed, ERD, index/retention policy                        |
| `infra/`                  | Cloudflare, Neon, domain, env, GitHub environment/secrets 설계                      |
| `docs/`                   | 최종 기획·기능·UX·데이터·API·기술·보안·QA·운영·출시·협업 문서                       |
| `qa/`                     | 테스트 전략, 테스트 케이스, API/성능/보안/UAT 검증 자료                             |
| `ops/`                    | 관리자 운영, 커뮤니티 모더레이션, 콘텐츠 운영, CS, incident, 운영 지표              |
| `release/`                | 릴리즈 노트, 롤백 계획, 스크린샷, 스토어 메타데이터, 버전 정책                      |
| `assets/`                 | 브랜드, 디자인, 프로토타입, 스토어, 스크린샷 자산                                   |
| `scripts/`                | DB/dev/docs/quality/release 자동화 스크립트                                         |
| `tools/`                  | API contract check, DB schema check, doc lint, security audit 내부 도구             |
| `security/`               | threat model, privacy impact assessment, security checklist, vulnerability response |
| `observability/`          | log schema, metrics dictionary, dashboard spec, alert rules                         |

---

## 5. 핵심 기능

### 5.1 인증과 사용자

- 이메일/소셜 로그인 기반 인증 구조
- 사용자 프로필, 설정, 동의, 기기 관리
- push token 원문 저장 금지, hash 기반 관리
- 사용자별 데이터 소유권 격리
- 관리자 RBAC와 audit log 기반 권한 추적

### 5.2 급여 홈

- 이번 급여일과 다음 급여일 표시
- 수령 예정 급여, 지출 금액, 납치금액 표시
- 전체 누적 납치금액 표시
- 고정지출, 일일 예산, 변동지출 요약
- 광고 배너 노출 영역
- 서버 권위 계산 결과만 최종 확정값으로 표시

### 5.3 급여 계획

- 급여일 등록
- 월별 수령 예정 급여 등록
- 목표 납치금액 등록
- 월별 계획/실적 조회
- 계산 revision과 계산 스냅샷 기록

### 5.4 고정지출

- 구독료, 대출, 보험, 통신비, 월세, 기타 반복 지출 등록
- 결제 예정, 납부 완료, 중지 상태 관리
- 월별 합산과 급여 계획 재계산 반영

### 5.5 고정저축

- 적금, 청약, 투자, 비상금, 연금 등 고정 저축 등록
- 이체 예정, 이체 완료, 중지 상태 관리
- 고정저축 합계와 납치금액 계산 반영

### 5.6 일일 예산

- 날짜별 일일 사용 한도 관리
- 사용 금액과 남은 금액 계산
- 예산 초과 시 `over_amount`로 표현
- 남은 금액은 표시 기준 0원 미만으로 내려가지 않음

### 5.7 변동지출

- 식비, 교통, 카페, 쇼핑, 문화, 교육, 건강, 기타 등 당일 지출 기록
- `idempotency_key` 기반 중복 등록 방지
- 변동지출 추가/수정/삭제 시 일일 예산과 급여계획 재계산

### 5.8 알림

- 급여일 알림
- 고정지출 납부 예정 알림
- 예산 초과 알림
- 목표 달성 알림
- LV UP 미션 알림
- 커뮤니티 반응 알림
- 푸시 발송 실패 재시도와 토큰 정리

### 5.9 LV UP

- 독서, 뉴스, 영어, 건강 미션
- 미션 완료와 경험치 보상
- 사용자 성장 통계
- 일일/주간/월간 자기계발 활동 기록

### 5.10 커뮤니티

- 전체, 자유, 레벨업 인증, 취미 등 게시판
- 글쓰기, 댓글, 대댓글, 좋아요, 북마크, 공유
- 익명글 화면 표시와 DB 소유권 분리
- 신고, 숨김, 운영자 조치, 감사 가능성

### 5.11 마이페이지

- 프로필 관리
- 누적 납치금액
- 레벨 현황
- 자기관리 성과
- 내 게시글, 알림 설정, 문의, 공지사항

### 5.12 관리자 콘솔

- 사용자 관리
- 게시글/신고 관리
- 공지 관리
- 이벤트 관리
- 광고/배너 관리
- 운영 지표 관리
- 관리자 감사로그
- 장애 대응 기록

### 5.13 광고/제휴

- 파트너 계정
- 광고 캠페인
- 광고 이벤트
- placement, consent snapshot, event context 관리
- 광고 이벤트에 급여액, 지출액, 저축액, 납치금액 원문 저장 금지

---

## 6. 고정 기술 기준

| 영역          | 기준                                         |
| ------------- | -------------------------------------------- |
| 패키지 매니저 | pnpm 10                                      |
| 모노레포 러너 | Turborepo                                    |
| 언어          | TypeScript                                   |
| 모바일 앱     | React Native + Expo Router                   |
| 관리자 웹     | Next.js / React                              |
| API 서버      | Cloudflare Workers + Hono 계열 라우팅 구조   |
| 알림 worker   | Cloudflare Workers / Queues 기반 구조        |
| 스케줄러      | Cloudflare Workers Cron Triggers 기반 구조   |
| DB            | Neon PostgreSQL / PostgreSQL                 |
| DB 접근       | `packages/db` 기반 Neon client/schema 계층   |
| API 계약      | `packages/api-contract` schema 기반          |
| UI            | `packages/ui` 공통 컴포넌트와 design token   |
| 보안          | RLS, RBAC, audit log, masking, rate limit    |
| 배포          | GitHub Actions + Cloudflare + Neon           |
| 관측성        | 구조화 로그, metrics, dashboard, alert rules |
| 문서          | `docs/final-documents` 기준 최종 문서 세트   |

---

## 7. 표준 실행 명령

### 7.1 초기 설치

```bash
pnpm install
```

### 7.2 개발

```bash
pnpm dev
pnpm preview
```

### 7.3 품질 검증

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:unit
pnpm test:integration
pnpm test:e2e
pnpm test:qa
pnpm quality
```

### 7.4 빌드

```bash
pnpm build
pnpm build:api
pnpm build:admin
pnpm build:mobile
```

### 7.5 데이터베이스

```bash
pnpm db:validate
pnpm db:migrate
pnpm db:seed
pnpm db:reset
pnpm db:backup
pnpm db:restore:check
```

### 7.6 보안과 개인정보

```bash
pnpm security:scan
pnpm privacy:check
```

### 7.7 문서와 계약

```bash
pnpm api:contract
pnpm docs:lint
pnpm docs:build
```

### 7.8 배포와 릴리즈

```bash
pnpm deploy
pnpm deploy:api
pnpm deploy:admin
pnpm deploy:mobile
pnpm release
```

### 7.9 진단

```bash
pnpm doctor
```

---

## 8. 환경변수 기준

환경변수의 실제 값은 `.env.example`, `infra/env/env-matrix.md`, GitHub Environments, Cloudflare, Neon secret 설정을 기준으로 관리한다.

| 변수                       | 목적                                 | 주의                            |
| -------------------------- | ------------------------------------ | ------------------------------- |
| `APP_ENV`                  | local, staging, uat, production 구분 | 배포 환경별 분리                |
| `NODE_ENV`                 | Node 실행 환경                       | production 빌드에서 명확히 설정 |
| `TZ`                       | 시간대                               | `Asia/Seoul` 권장               |
| `DATABASE_URL`             | 기본 DB 연결                         | 로그 출력 금지                  |
| `DIRECT_DATABASE_URL`      | migration/direct 연결                | CI secret로만 관리              |
| `STAGING_DATABASE_URL`     | staging DB                           | 운영 DB와 분리                  |
| `UAT_DATABASE_URL`         | UAT DB                               | 운영 DB와 분리                  |
| `SHADOW_DATABASE_URL`      | migration 검증                       | 실제 데이터 사용 금지           |
| `DATABASE_SSL_MODE`        | DB SSL 정책                          | 배포 환경에서 require 권장      |
| `NEXT_PUBLIC_API_BASE_URL` | 관리자 웹 API URL                    | public 노출 가능 범위만 사용    |
| `EXPO_PUBLIC_API_BASE_URL` | 모바일 앱 API URL                    | public 노출 가능 범위만 사용    |
| `CLOUDFLARE_API_TOKEN`     | Cloudflare 배포                      | secret 관리                     |
| `NEON_API_KEY`             | Neon 관리 작업                       | secret 관리                     |
| `EXPO_TOKEN`               | EAS/Expo 작업                        | secret 관리                     |
| `SENTRY_DSN`               | 오류 관측                            | 민감정보 전송 금지              |
| `SLACK_WEBHOOK_URL`        | 운영 알림                            | secret 관리                     |

금지 사항:

- DB URL, token, secret, private key를 commit하지 않는다.
- issue, PR, screenshot, log, seed, docs에 실제 secret을 남기지 않는다.
- salary, expense, saving, hijack amount 원문을 로그 또는 광고 이벤트에 저장하지 않는다.

---

## 9. 데이터베이스 원칙

`database/`는 Neon PostgreSQL 기준으로 관리한다.

마이그레이션 적용 순서:

```txt
0001_init_users.sql
→ 0002_payroll_budget_expense.sql
→ 0003_growth_community_notifications.sql
→ 0004_admin_audit_ads.sql
```

| 파일                                      | 책임                                                                                                |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `0001_init_users.sql`                     | users, auth identities, profiles, settings, consents, devices, admin RBAC                           |
| `0002_payroll_budget_expense.sql`         | payroll plans, fixed expenses, savings, daily budgets, variable expenses, calculation snapshots     |
| `0003_growth_community_notifications.sql` | notifications, deliveries, growth tasks, community posts, comments, reactions, reports, attachments |
| `0004_admin_audit_ads.sql`                | partner accounts, ad campaigns, ad events, admin audit logs, notices, incidents                     |

필수 DB 원칙:

1. 모든 금액은 KRW `BIGINT` 정수다.
2. 음수 금액과 소수점 금액을 허용하지 않는다.
3. 납치금액은 표시 기준 0원 미만으로 내려가지 않는다.
4. 일일 예산 초과는 `over_amount`로 명시한다.
5. 중복 지출은 `idempotency_key`로 방지한다.
6. 계산은 서버/API/DB 함수가 최종 확정한다.
7. 사용자 데이터는 RLS와 `app.current_user_id`로 격리한다.
8. 관리자 작업은 RBAC와 감사로그를 통과해야 한다.
9. 광고 이벤트에는 재무 원천 데이터를 저장하지 않는다.
10. local/staging/UAT seed는 실제 개인정보 없이 재실행 가능해야 한다.

---

## 10. 서버 권위 계산

급여납치의 급여·예산·지출·저축 계산은 클라이언트가 아니라 서버와 DB가 확정한다.

핵심 계산식:

```txt
총 고정지출 = ACTIVE/SCHEDULED/PAID 고정지출 합계
총 고정저축 = ACTIVE/SCHEDULED/TRANSFERRED 고정저축 합계
일일 사용금액 = ACTIVE 변동지출 합계
일일 남은금액 = max(0, 일일 설정금액 - 일일 사용금액)
일일 초과금액 = max(0, 일일 사용금액 - 일일 설정금액)
예상 납치금액 = max(0, 수령 예정 급여 - 고정지출 - 고정저축 - 생활비/변동지출)
계산 스냅샷 = 계산 시점의 입력값, 결과값, revision, reason 저장
```

클라이언트는 다음 역할만 수행한다.

- 입력값 수집
- 사용자 경험을 위한 임시 표시
- 서버 응답 결과 렌더링
- validation error 표시
- offline/재시도 UX 처리

최종 데이터는 API와 DB에서 검증·계산·저장한다.

---

## 11. 보안과 개인정보

급여납치 플랫폼은 다음 데이터를 민감 데이터로 분류한다.

| 등급 | 데이터                                                                |
| ---- | --------------------------------------------------------------------- |
| S1   | 급여액, 고정지출, 고정저축, 일일예산, 변동지출, 납치금액, 계산 스냅샷 |
| S2   | 이메일, 전화번호, 소셜 identity, 기기 hash, 동의 이력                 |
| S3   | 알림, 커뮤니티 글/댓글/신고, 첨부                                     |
| S4   | 관리자 감사로그, 장애 대응, 공지                                      |
| S5   | 광고/제휴 이벤트, 캠페인, 파트너, 정산 집계                           |

보안 기준:

1. RLS 없는 사용자 데이터 조회 금지
2. 관리자 RBAC 없는 운영 기능 실행 금지
3. 감사로그 없는 관리자 변경 금지
4. raw token, secret, phone, IP, User-Agent 저장 금지
5. push token 원문 저장 금지
6. 광고/제휴 이벤트와 재무 원천 데이터 결합 금지
7. 실제 사용자 데이터를 local/staging/UAT/issue/PR/screenshot/docs에 사용 금지
8. 익명 커뮤니티 글에서 작성자 식별정보 API 노출 금지
9. 취약점은 비공개 채널로 신고
10. 긴급 보안 이슈는 핫픽스 브랜치와 롤백 계획을 함께 운영

---

## 12. API와 백엔드 원칙

API는 `services/api`에서 관리하며, `packages/api-contract`와 일치해야 한다.

필수 원칙:

- 모든 응답은 표준 response schema 사용
- 모든 오류는 표준 error code 사용
- 모든 요청은 requestId 추적 가능
- 인증 middleware와 권한 middleware 분리
- 사용자 도메인은 user owner check 필수
- 관리자 도메인은 RBAC와 audit log 필수
- 금액 계산 API는 서버 권위 DB 함수 또는 transaction을 통해 처리
- idempotency가 필요한 write API는 idempotency key 요구
- 민감정보는 response에서 마스킹 또는 제외
- rate limit, audit log, error middleware 적용

---

## 13. 앱 UX 원칙

### 13.1 모바일 앱

모바일 앱은 다음 주요 화면을 제공한다.

- 스플래시
- 로그인/회원가입
- 급여 홈
- 급여 계획
- 일일 예산
- 고정지출
- 고정저축
- 변동지출
- 알림
- LV UP 메인
- 독서 레벨업
- 뉴스 레벨업
- 영어 레벨업
- 건강 레벨업
- 커뮤니티 목록
- 게시글 상세
- 글쓰기
- 마이페이지

UX 원칙:

1. 첫 화면에서 납치금액과 일일 예산을 즉시 보여준다.
2. 금액 입력은 숫자만 허용하고 원 단위 콤마를 표시한다.
3. 예산 초과는 명확한 색상과 메시지로 표시한다.
4. 지출 추가 후 서버 계산 결과를 재조회한다.
5. 레벨업 기능은 매일 실행 가능한 짧은 루틴으로 제공한다.
6. 커뮤니티는 소비 통제와 자기계발 인증을 중심으로 설계한다.

### 13.2 관리자 콘솔

관리자 콘솔은 다음 기능을 제공한다.

- dashboard
- users
- posts
- reports
- notices
- events
- banners
- metrics
- admin login

운영 원칙:

1. 관리자 접근은 RBAC 기반이다.
2. 관리자 변경은 감사로그를 남긴다.
3. 사용자 재무 원천 데이터는 운영 UI에 최소 표시한다.
4. 광고/배너 운영은 승인, 중지, 종료 상태를 관리한다.
5. 신고/모더레이션 처리는 사유와 처리자를 남긴다.

---

## 14. QA와 품질 게이트

PR 또는 release 전 다음 품질 게이트를 통과해야 한다.

```bash
pnpm run format:check
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm run db:validate
pnpm run api:contract
pnpm run security:scan
pnpm run privacy:check
pnpm run test:e2e
pnpm run test:qa
pnpm run build
```

검증 영역:

| 영역      | 기준                                                    |
| --------- | ------------------------------------------------------- |
| 금액 계산 | KRW 정수, 음수/소수 금지, 납치금액 clamp, 초과금액 계산 |
| 인증/인가 | 일반 사용자와 관리자 권한 분리                          |
| RLS       | 본인 데이터만 접근 가능                                 |
| API 계약  | schema와 route 일치                                     |
| UI        | 핵심 화면과 접근성, 반응형 기준 충족                    |
| 알림      | 예약, 발송, 실패 재시도, 토큰 정리                      |
| 커뮤니티  | 글쓰기, 익명, 신고, 댓글, 반응                          |
| 광고      | 동의 스냅샷, 재무 데이터 분리                           |
| 운영      | audit log, incident, rollback                           |
| 보안      | secret, token, PII, raw financial data 노출 없음        |

---

## 15. CI/CD와 배포

`.github/workflows`는 다음 workflow를 포함한다.

| workflow            | 책임                                                     |
| ------------------- | -------------------------------------------------------- |
| `ci.yml`            | 설치, lint, typecheck, test, build, DB/static validation |
| `deploy-api.yml`    | API 빌드, 검증, DB migration, Cloudflare Workers 배포    |
| `deploy-admin.yml`  | 관리자 콘솔 빌드와 Cloudflare Pages 배포                 |
| `mobile-build.yml`  | Expo/EAS 모바일 빌드 검증                                |
| `release.yml`       | 릴리즈 품질 게이트, 산출물, 체크섬, GitHub release       |
| `security-scan.yml` | dependency, CodeQL, secret, security test                |

배포 원칙:

1. `quality` 통과 전 배포 금지
2. production migration은 백업/rollback 계획 확인 후 실행
3. API, admin, mobile은 분리 배포 가능해야 한다.
4. 배포 후 healthcheck와 smoke test를 실행한다.
5. 장애 발생 시 rollback plan을 적용한다.

---

## 16. 운영과 관측성

운영에 필요한 문서는 `ops/`, `observability/`, `release/`, `security/`에 분리되어 있다.

필수 운영 항목:

- 구조화 로그
- requestId 추적
- API error rate
- notification failure rate
- DB migration status
- payroll calculation failure
- budget overrun notification failure
- community report backlog
- ad campaign delivery metrics
- admin audit log search
- incident response log
- release/rollback log

민감정보 로그 금지:

- 급여액 원문
- 지출액 원문
- 저축액 원문
- 납치금액 원문
- 전화번호 원문
- IP 원문
- User-Agent 원문
- push token 원문
- refresh token
- secret key

---

## 17. 문서 기준

`docs/final-documents`는 다음 최종 문서 세트를 포함한다.

1. 최상위 기획 문서
2. 사용자·시장·전략 문서
3. UXUI 기획 문서
4. 기능 기획 문서
5. 데이터·DB 문서
6. API·백엔드 문서
7. 기술 설계 문서
8. 보안·개인정보·정책 문서
9. QA·테스트 문서
10. 운영·관리자 문서
11. 출시 문서
12. 개발 협업 문서

문서 변경 원칙:

1. 문서와 구현이 충돌하면 PR에서 반드시 정합성을 맞춘다.
2. DB/보안/API 변경은 관련 문서를 함께 수정한다.
3. 화면 변경은 UX/UI 문서와 QA 문서를 함께 수정한다.
4. 운영 정책 변경은 ops, security, release 문서를 함께 수정한다.
5. 문서에는 실제 개인정보, token, secret, 운영 DB 값이 들어가면 안 된다.

---

## 18. 변경 금지 원칙

다음은 임의 변경하지 않는다.

1. 루트 workspace 구조
2. `database/migrations` 파일 순서
3. `database/policies` 위치
4. `database/seeds` 환경별 분리
5. `packages/api-contract` API 계약 경계
6. `packages/security` 보안 유틸 경계
7. `services/api/src/middlewares` 인증/감사/error/rate limit 경계
8. `apps/mobile/app` 라우팅 구조
9. `apps/admin/src/app` 관리자 라우팅 구조
10. `.github/workflows` 배포/보안 workflow 구조
11. `docs/final-documents` 최종 문서 체계
12. `security/` 취약점 대응 문서 위치
13. 광고 데이터와 재무 원천 데이터 분리 원칙
14. 서버 권위 계산 원칙
15. RLS/RBAC/audit log 원칙

구조 변경이 필요한 경우 `docs/governance/structure-change-policy.md`와 PR 승인 절차를 따른다.

---

## 19. PR 완료 기준

PR은 다음 조건을 만족해야 한다.

- [ ] 요구사항과 연결된 문서가 명확하다.
- [ ] API 계약 또는 DB 변경 시 관련 문서가 수정되었다.
- [ ] 금액 계산은 서버 권위 기준을 따른다.
- [ ] 금액은 KRW 정수이며 음수/소수 입력을 막는다.
- [ ] 사용자 데이터 접근은 RLS/owner check를 통과한다.
- [ ] 관리자 기능은 RBAC/audit log를 통과한다.
- [ ] 광고 이벤트는 재무 원천 데이터와 분리된다.
- [ ] secret, token, 실제 개인정보, 실제 금융정보가 포함되지 않는다.
- [ ] lint/typecheck/test/build가 통과한다.
- [ ] E2E 또는 QA 영향 범위가 검토되었다.
- [ ] rollback 또는 복구 계획이 필요한 변경인지 판단했다.
- [ ] 운영 영향이 있는 변경은 release/ops 문서와 일치한다.

---

## 20. 빠른 시작 예시

로컬 개발 환경에서 기본 검증을 진행하는 예시는 다음과 같다.

```bash
pnpm install
pnpm run doctor
pnpm run dev
```

DB 포함 로컬 검증 예시는 다음과 같다.

```bash
pnpm run db:validate
pnpm run db:migrate
pnpm run db:seed
pnpm run test:integration
pnpm run test:e2e
```

릴리즈 전 검증 예시는 다음과 같다.

```bash
pnpm run quality
pnpm run build
pnpm run docs:build
pnpm run security:scan
pnpm run privacy:check
pnpm run release
```

---

## 21. 최종 판정

이 `README.md`는 급여납치 플랫폼의 서비스 개요, 저장소 구성 원칙, 최상위 작업 순서, 폴더별 책임, 핵심 기능, 기술 기준, 실행 명령, 환경변수, 데이터베이스, 서버 권위 계산, 보안·개인정보, API, 앱 UX, QA, CI/CD, 운영, 문서, 변경 금지 원칙, PR 완료 기준을 통합 설명하는 루트 최종 문서다.

문서상·이론상 `README.md` 파일 단위 기준으로 더 이상 추가 작성이 필요 없는 최종본으로 사용한다.

단, 프로젝트 종합 완성도 100%는 실제 repository 파일, package scripts, DB migration, seed, API/RBAC/E2E/QA, CI/CD, 보안 스캔, 배포, 백업/복구 리허설이 이 문서와 일치하게 통과했을 때 최종 확정한다.
