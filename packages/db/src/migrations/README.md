# packages/db/src/migrations · 급여납치 DB 마이그레이션 운영 문서

문서 상태: 최종본  
대상 경로: `packages/db/src/migrations/README.md`  
프로젝트: 급여납치 Salary Hijacking Platform  
계약 버전: `1.0.0`  
기준 시간대: `Asia/Seoul`  
기준 통화: `KRW`  
데이터베이스 기준: Neon PostgreSQL  
핵심 역할: 급여·예산·지출·저축·알림·레벨업·커뮤니티·광고·운영 데이터를 서버 권위 구조로 안전하게 진화시키는 migration source of truth

---

## 1. 목적

`packages/db/src/migrations`는 급여납치 플랫폼의 데이터베이스 구조 변경 이력을 저장하는 디렉터리다. 이 디렉터리의 마이그레이션은 앱, API, 관리자 콘솔, 알림 worker, scheduler, 광고/제휴 운영, QA/E2E, UAT, release gate가 공유하는 데이터 구조의 기준이 된다.

이 문서는 다음을 보장한다.

1. 급여·예산·지출·저축 계산에 필요한 DB 구조를 서버 권위 기준으로 관리한다.
2. 금액 데이터는 KRW 정수 단위로 저장하고 소수점 금액을 허용하지 않는다.
3. 사용자별 민감 금융 데이터는 auth, community, ads, logs payload와 직접 결합하지 않는다.
4. schema, index, RLS, audit, retention, seed, QA 검증 기준을 하나의 운영 문서로 통일한다.
5. production migration은 재현 가능하고 검증 가능하며 rollback 전략을 포함해야 한다.
6. migration 변경은 API contract, 서비스 로직, 관리자 콘솔, 모바일 UI, E2E 시나리오와 함께 검증된다.

---

## 2. 마이그레이션 원칙

| 원칙           | 기준                                                                                               |
| -------------- | -------------------------------------------------------------------------------------------------- |
| 서버 권위      | 급여, 예산, 지출, 저축, 납치금액 계산의 최종 값은 서버/API/DB 기준으로 산출한다.                   |
| KRW 정수       | 모든 금액 원천 필드는 `BIGINT` 또는 동등한 정수 타입으로 저장한다.                                 |
| 음수 금액 금지 | 급여, 예산, 지출, 저축 입력값은 0원 이상이어야 한다. 환불/정정은 별도 correction event로 기록한다. |
| 일일 예산 초과 | 일일 잔액을 음수로 표시하지 않고 `over_amount_krw` 또는 파생 계산으로 초과분을 표현한다.           |
| 시간대         | 사용자 기준 날짜 계산은 `Asia/Seoul`을 기준으로 한다. 저장 시각은 `timestamptz`를 사용한다.        |
| 불변 이력      | 지출, 저축, 알림, 감사 로그는 삭제보다 상태 변경·soft delete·audit trail을 우선한다.               |
| 멱등성         | 지출 생성, 알림 발송, batch job, webhook성 이벤트는 idempotency key를 사용한다.                    |
| 개인정보 보호  | token, secret, raw PII, raw financial source data는 log, community, ads payload에 저장하지 않는다. |
| 광고 분리      | 광고/제휴 이벤트는 급여액, 지출액, 저축액, 납치금액의 원천 raw data와 분리한다.                    |
| 운영 검증      | migration 추가 후 lint, typecheck, DB dry-run, seed 검증, E2E/QA 검증을 통과해야 한다.             |

---

## 3. 디렉터리 구조

```txt
packages/db/src/migrations/
├── README.md
├── 0001_init_users.sql
├── 0002_payroll_budget_expense.sql
├── 0003_growth_community_notifications.sql
├── 0004_admin_audit_ads.sql
└── ... future additive migrations
```

권장 주변 구조:

```txt
packages/db/src/
├── client/
│   └── neon.client.ts
├── migrations/
│   └── README.md
├── policies/
│   ├── index-policy.md
│   └── retention-policy.md
├── seeds/
│   ├── local.seed.sql
│   ├── staging.seed.sql
│   └── uat.seed.sql
└── schema/
    └── generated artifacts or typed DB contracts
```

---

## 4. 파일 명명 규칙

마이그레이션 파일은 다음 규칙을 따른다.

```txt
NNNN_domain_summary.sql
```

예시:

```txt
0001_init_users.sql
0002_payroll_budget_expense.sql
0003_growth_community_notifications.sql
0004_admin_audit_ads.sql
0005_retention_partitioning.sql
0006_admin_report_indexes.sql
```

규칙:

1. `NNNN`은 네 자리 증가 번호를 사용한다.
2. 번호는 변경하지 않는다.
3. 이미 공유·적용된 migration은 수정하지 않고 후속 migration으로 보정한다.
4. 파일명은 snake_case를 사용한다.
5. 하나의 파일은 하나의 도메인 또는 밀접한 도메인 묶음만 다룬다.
6. destructive change는 별도 migration으로 분리하고 사전 검증 절차를 포함한다.

---

## 5. 1차 구축 기준: 사용자·인증·프로필

사용자 기반 migration은 다음 요구를 충족해야 한다.

| 영역     | 필수 구조                                                              |
| -------- | ---------------------------------------------------------------------- |
| 사용자   | `users`, `user_profiles`, `user_settings` 또는 동등 구조               |
| 인증     | provider, provider subject, password auth 또는 social auth 연동 식별자 |
| 권한     | `user`, `admin`, `operator`, `auditor` 등 역할 기반 접근 기준          |
| 상태     | active, suspended, deleted 등 계정 상태                                |
| 개인정보 | 이메일, 닉네임, 프로필 이미지 등 최소 필드만 보관                      |
| 감사     | 민감 변경은 audit log에 기록                                           |

보안 기준:

- access token, refresh token, provider raw token은 plain text로 저장하지 않는다.
- 비밀번호는 해시만 저장한다.
- soft delete 상태에서도 금융 원천 데이터 접근은 정책에 따라 제한한다.

---

## 6. 2차 구축 기준: 급여·예산·지출·저축

급여 관리 migration은 급여납치 플랫폼의 핵심이며 다음 구조를 충족해야 한다.

| 영역      | 필수 데이터                                          |
| --------- | ---------------------------------------------------- |
| 급여 주기 | 급여월, 급여일, 수령 예정 급여, 확정 수령 급여, 상태 |
| 고정지출  | 결제일, 카테고리, 항목명, 금액, 반복 규칙, 납부 상태 |
| 고정저축  | 저축일, 상품명, 금액, 반복 규칙, 달성 상태           |
| 일일 예산 | 날짜, 설정금액, 사용금액, 잔여금액, 초과금액         |
| 변동지출  | 사용일시, 카테고리, 설명, 금액, idempotency key      |
| 납치금액  | 서버 계산 결과 또는 계산 가능한 원천 필드            |

금액 규칙:

```txt
expected_hijack_amount_krw = max(0, expected_salary_krw - planned_expense_krw - planned_saving_krw)
daily_remaining_amount_krw = max(0, daily_budget_amount_krw - used_amount_krw)
daily_over_amount_krw = max(0, used_amount_krw - daily_budget_amount_krw)
```

DB 제약 권장:

```sql
CHECK (amount_krw >= 0)
CHECK (daily_budget_amount_krw >= 0)
CHECK (used_amount_krw >= 0)
CHECK (over_amount_krw >= 0)
```

---

## 7. 3차 구축 기준: 알림·레벨업·커뮤니티

성장/커뮤니티 도메인은 금융 원천 데이터와 분리되어야 한다.

| 영역                | 필수 구조                                                      |
| ------------------- | -------------------------------------------------------------- |
| 알림                | type, title, body, target route, read state, delivered state   |
| 레벨업              | activity type, exp, level, completed_at, streak                |
| 독서/뉴스/영어/건강 | 콘텐츠 또는 미션 결과, 완료 여부, 경험치 보상                  |
| 커뮤니티            | board type, title, body, author, anonymous flag, question flag |
| 반응                | likes, comments, reports, shares                               |
| 신고/운영           | moderation status, hidden state, admin action                  |

커뮤니티 정책:

1. 익명 게시글은 일반 사용자에게 작성자 식별자를 노출하지 않는다.
2. 관리자와 운영자는 audit 가능한 권한으로만 moderation을 수행한다.
3. 급여액, 대출액, 저축액 등 raw financial source data를 커뮤니티 게시글 metadata에 자동 결합하지 않는다.
4. 게시글 검색 index는 민감 필드와 분리한다.

---

## 8. 4차 구축 기준: 관리자·감사·광고·제휴

운영 시스템 migration은 상용화 단계의 안정성을 담당한다.

| 영역        | 필수 구조                                                             |
| ----------- | --------------------------------------------------------------------- |
| 관리자      | admin users, admin roles, permissions                                 |
| 감사 로그   | actor, action, target, before/after summary, ip hash, user agent hash |
| 광고 캠페인 | campaign, creative, placement, period, status                         |
| 광고 이벤트 | impression, click, conversion, event time, placement                  |
| 제휴        | partner, campaign mapping, payout metadata                            |
| 운영 설정   | feature flags, notice, maintenance windows                            |

광고/제휴 데이터 정책:

1. 광고 이벤트는 사용자 금융 원천 데이터와 직접 join하지 않는다.
2. 광고 타겟팅에 민감 금융 데이터 사용이 필요한 경우 별도 명시 동의와 정책 migration이 선행되어야 한다.
3. 광고/제휴 로그에는 token, secret, raw PII를 저장하지 않는다.
4. 집계 분석은 user-level raw financial data가 아닌 비식별 집계 지표를 사용한다.

---

## 9. 5차 구축 기준: 상용 운영·성능·보존

상용 운영 단계에서는 migration이 성능과 보존 정책까지 포함해야 한다.

| 항목      | 기준                                                                         |
| --------- | ---------------------------------------------------------------------------- |
| 인덱스    | 사용자별 조회, 월별 급여 조회, 날짜별 지출 조회, 알림 read state 조회 최적화 |
| 파티셔닝  | 대용량 audit/event/notification table은 기간 기준 분리 검토                  |
| 보존 정책 | audit, notification, ads events, deleted user data 보존 기간 명시            |
| 백필      | 대규모 backfill은 batch size, checkpoint, retry 전략 포함                    |
| 락 관리   | 장시간 exclusive lock을 피하고 online-friendly migration 우선                |
| 모니터링  | migration 전후 row count, index size, slow query 확인                        |

---

## 10. RLS/RBAC 기준

마이그레이션은 PostgreSQL Row Level Security 또는 서비스 계층 RBAC 중 하나 이상의 보호 장치를 전제로 한다.

필수 접근 규칙:

1. 일반 사용자는 자기 `user_id` 데이터만 조회·수정할 수 있다.
2. 커뮤니티 공개 데이터는 공개 필드만 조회할 수 있다.
3. 관리자 기능은 role과 permission으로 제한한다.
4. audit log는 일반 사용자가 직접 수정할 수 없다.
5. ads event는 원천 금융 데이터와 분리된 최소 식별자만 가진다.
6. service role 사용 시 API 계층에서 권한 검사를 반드시 수행한다.

---

## 11. 멱등성 기준

다음 작업은 idempotency key 또는 unique constraint를 가져야 한다.

| 작업             | 예시 key                                      |
| ---------------- | --------------------------------------------- |
| 변동지출 생성    | `user_id + idempotency_key`                   |
| 알림 발송        | `user_id + notification_type + business_date` |
| 급여 주기 생성   | `user_id + payroll_month`                     |
| 일일 예산 생성   | `user_id + budget_date`                       |
| 레벨업 미션 완료 | `user_id + activity_type + business_date`     |
| 광고 클릭 이벤트 | `request_id` 또는 `event_id`                  |
| batch job        | `job_name + business_date + shard_key`        |

---

## 12. Seed와 migration 분리

Migration은 schema source of truth이고 seed는 환경별 초기 데이터다.

| 파일                     | 목적                                     |
| ------------------------ | ---------------------------------------- |
| `migrations/*.sql`       | schema, constraint, index, policy 변경   |
| `seeds/local.seed.sql`   | 로컬 개발용 예시 사용자/계획/지출 데이터 |
| `seeds/staging.seed.sql` | 스테이징 검증용 최소 운영 데이터         |
| `seeds/uat.seed.sql`     | UAT 시나리오 검증용 데이터               |

금지 사항:

- production migration에 테스트 사용자 대량 삽입 금지
- seed에 실제 개인정보 또는 실제 금융 데이터 사용 금지
- migration이 앱 실행 시 자동으로 반복 적용되는 구조 금지

---

## 13. Migration 작성 체크리스트

새 migration은 다음 조건을 만족해야 한다.

1. 파일명이 `NNNN_domain_summary.sql` 규칙을 따른다.
2. 이미 배포된 migration을 수정하지 않는다.
3. 모든 금액 필드는 정수 KRW 기준이다.
4. 음수 금액을 막는 constraint가 있다.
5. `created_at`, `updated_at` 또는 event time 기준이 명확하다.
6. 사용자 소유 데이터는 `user_id` 또는 동등 소유 키를 가진다.
7. 자주 조회되는 조건에는 index가 있다.
8. unique constraint 또는 idempotency 전략이 있다.
9. raw token, secret, PII 저장을 피한다.
10. 광고/제휴 데이터는 금융 원천 데이터와 분리한다.
11. RLS/RBAC 적용 지점이 명확하다.
12. rollback 또는 forward-fix 전략이 있다.
13. local/staging/uat seed와 충돌하지 않는다.
14. API contract와 서비스 로직 변경이 필요한지 확인했다.
15. E2E/QA 검증 시나리오가 연결되어 있다.
16. release gate에서 dry-run 또는 검증 명령을 통과한다.

---

## 14. 검증 명령

권장 검증 흐름:

```bash
pnpm run db:migrate:check
pnpm run db:migrate:dry-run
pnpm run db:seed:local
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run qa:e2e
pnpm run quality
pnpm run release
```

패키지 단위 검증 명령이 아직 분리되어 있지 않은 경우, 동일한 목적의 repo 표준 명령으로 대체한다.

필수 검증 항목:

1. migration SQL parse 성공
2. 빈 DB 적용 성공
3. 기존 staging snapshot 적용 성공
4. seed 적용 성공
5. 급여 홈 API 조회 성공
6. 지출 생성 idempotency 검증
7. 일일 예산 초과 계산 검증
8. 알림 생성·읽음 처리 검증
9. 커뮤니티 익명 게시글 조회 검증
10. 광고 이벤트가 금융 raw data를 포함하지 않는지 검증

---

## 15. Rollback과 forward-fix 정책

Production에서 이미 적용된 migration은 직접 수정하지 않는다. 문제 발생 시 다음 순서로 처리한다.

1. 영향 범위를 확인한다.
2. 데이터 손실 가능성이 있으면 write traffic을 제한한다.
3. rollback 가능한 DDL이면 승인 절차 후 rollback한다.
4. 데이터 변환이 포함된 경우 forward-fix migration을 우선한다.
5. audit log와 incident report를 남긴다.
6. API contract, app release, admin console 영향 여부를 확인한다.

Destructive migration 기준:

- column drop
- table drop
- type narrowing
- not null 강제
- unique constraint 신규 추가
- 대규모 backfill
- partition 재구성

위 작업은 사전 dry-run과 rollback 계획을 포함해야 한다.

---

## 16. 급여납치 도메인별 필수 불변 조건

| 도메인   | 불변 조건                                                     |
| -------- | ------------------------------------------------------------- |
| 급여     | 사용자의 급여 주기는 월 기준으로 중복 생성되지 않는다.        |
| 예산     | 일일 예산은 사용자·날짜 기준으로 하나의 active row를 가진다.  |
| 지출     | 지출 금액은 0원 이상이며, 중복 생성 방지를 위한 key를 가진다. |
| 저축     | 고정저축은 반복 규칙과 상태를 분리한다.                       |
| 알림     | 동일 business event에 대해 중복 발송을 방지한다.              |
| 레벨업   | 동일 날짜·동일 미션의 중복 보상을 방지한다.                   |
| 커뮤니티 | 익명 상태와 실제 작성자 식별자는 분리되어 노출된다.           |
| 광고     | 광고 event payload는 급여·지출·저축 원천값을 포함하지 않는다. |
| 운영     | 관리자 조작은 audit log로 추적된다.                           |

---

## 17. 금지 사항

`packages/db/src/migrations`에서는 다음을 금지한다.

1. 파일 내용이 단순 위치 안내만 있는 상태
2. 배포된 migration 번호 재사용
3. 배포된 migration 내용 수정
4. 금액 필드에 float, decimal, text 사용
5. 음수 금액 허용
6. client final payroll calculation을 전제로 한 DB 구조
7. raw financial source data를 community, ads, auth, log payload에 직접 저장
8. secret, token, raw PII plain text 저장
9. idempotency 없는 지출·알림·batch event 구조
10. index 없는 대용량 조회 table
11. rollback/forward-fix 전략 없는 destructive migration
12. 실제 개인정보가 포함된 seed 또는 예시 데이터
13. 검증 명령 없이 production migration 적용

---

## 18. 완료 기준

이 README는 다음 기준을 충족할 때 파일 단위 완료로 본다.

1. migrations 디렉터리의 목적을 설명한다.
2. 급여납치 DB migration 원칙을 설명한다.
3. 파일 명명 규칙을 설명한다.
4. 사용자·인증·프로필 구축 기준을 설명한다.
5. 급여·예산·지출·저축 구축 기준을 설명한다.
6. 알림·레벨업·커뮤니티 구축 기준을 설명한다.
7. 관리자·감사·광고·제휴 구축 기준을 설명한다.
8. 상용 운영·성능·보존 기준을 설명한다.
9. RLS/RBAC 기준을 설명한다.
10. idempotency 기준을 설명한다.
11. seed와 migration 분리 기준을 설명한다.
12. migration 작성 체크리스트를 포함한다.
13. 검증 명령을 포함한다.
14. rollback과 forward-fix 정책을 포함한다.
15. 도메인별 불변 조건을 포함한다.
16. 금지 사항을 포함한다.
17. 미완료 표식, 임시 문구, 단순 placeholder가 없다.

---

## 19. 최종 판정

`packages/db/src/migrations/README.md`는 급여납치 DB migration의 목적, 원칙, 구조, 명명 규칙, 도메인별 구축 기준, 보안·개인정보 정책, RLS/RBAC, idempotency, seed 분리, 검증 명령, rollback 정책, 금지 사항, 완료 기준을 통합 정의하는 최종 문서다.

문서상·이론상 이 파일은 더 이상 추가 작성이 필요 없는 파일 단위 최종본으로 사용한다.

프로젝트 종합 완성도 100%는 실제 repository의 SQL migration, seed, DB client, API contract, service route, admin console, mobile UI, CI/CD quality gate가 이 문서의 기준과 일치하고 검증 명령이 모두 통과했을 때 최종 확정한다.
