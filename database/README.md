# database

> 문서 상태: 최종본  
> 파일 위치: `database/README.md`  
> 프로젝트: 급여납치 Salary Hijacking Platform  
> 기준 DB: Neon PostgreSQL / PostgreSQL  
> 기준 시간대: `Asia/Seoul`  
> 기준 통화: KRW, 1원 단위 정수  
> 기준 마이그레이션: `0001_init_users.sql` ~ `0004_admin_audit_ads.sql`  
> 핵심 원칙: 서버 권위 계산, 사용자 소유권 격리, RLS, 관리자 RBAC, 감사 가능성, 재무 원천 데이터 보호, 광고 데이터 분리, 재실행 가능한 마이그레이션

---

## 1. 목적

이 디렉터리는 급여납치 플랫폼의 데이터베이스 구조, 마이그레이션, 시드, ERD, 정책, 백업, 보존/삭제, 인덱스 운영 기준을 관리한다.

급여납치 플랫폼은 사용자의 급여, 고정지출, 고정저축, 일일예산, 변동지출, 납치금액, 알림, LV UP 자기계발 활동, 커뮤니티, 광고/제휴, 관리자 운영 데이터를 다룬다. 이 중 급여액, 지출액, 저축액, 일일예산, 납치금액, 계산 스냅샷은 민감한 재무성 데이터로 분류하며 서버 권위 계산과 RLS 접근통제를 필수로 적용한다.

이 문서는 `database` 디렉터리의 운영 기준서이며 다음을 보장한다.

1. 마이그레이션 적용 순서와 책임을 명확히 한다.
2. 급여·예산·지출·저축 계산이 서버 권위로만 확정되도록 한다.
3. 사용자 데이터는 사용자 소유권과 RLS로 격리한다.
4. 관리자 기능은 RBAC와 감사로그를 통해 추적 가능하게 한다.
5. 광고/제휴 데이터는 재무 원천 데이터와 분리한다.
6. 로컬, staging, UAT seed는 실제 개인정보 없이 재실행 가능하게 관리한다.
7. ERD, 인덱스 정책, 보존/삭제 정책, 백업 기준을 동일한 데이터 계약으로 연결한다.

---

## 2. 디렉터리 구조

```txt
database/
├─ README.md
├─ erd/
│  └─ salary-hijacking-final-erd.md
├─ migrations/
│  ├─ 0001_init_users.sql
│  ├─ 0002_payroll_budget_expense.sql
│  ├─ 0003_growth_community_notifications.sql
│  └─ 0004_admin_audit_ads.sql
├─ policies/
│  ├─ index-policy.md
│  └─ retention-policy.md
├─ seeds/
│  ├─ local.seed.sql
│  ├─ staging.seed.sql
│  └─ uat.seed.sql
└─ backups/
   └─ .gitkeep
```

| 경로          | 역할                                                             |
| ------------- | ---------------------------------------------------------------- |
| `erd/`        | 최종 ERD, 테이블 관계, 데이터 분류, RLS/보존/운영 기준 문서화    |
| `migrations/` | PostgreSQL 스키마, 제약조건, 인덱스, 함수, 트리거, RLS 정책 적용 |
| `policies/`   | 인덱스 운영 정책, 보존/삭제 정책, 백업/로그/삭제 기준 관리       |
| `seeds/`      | local, staging, UAT 환경별 합성 테스트 데이터 제공               |
| `backups/`    | 백업 절차 문서, 복구 리허설 산출물, snapshot 운영 기록 위치      |

---

## 3. 데이터베이스 기술 기준

| 항목        | 기준                                                          |
| ----------- | ------------------------------------------------------------- |
| DB 엔진     | Neon PostgreSQL 또는 PostgreSQL 호환 환경                     |
| 시간대      | `Asia/Seoul`                                                  |
| 금액 타입   | `BIGINT`, KRW 1원 단위 정수                                   |
| UUID        | `gen_random_uuid()` 또는 deterministic UUID seed              |
| 트랜잭션    | 마이그레이션과 주요 서버 권위 계산은 transaction 기반         |
| 접근통제    | RLS + `app.current_user_id` + `app.is_admin` 컨텍스트         |
| 관리자 권한 | `admin_roles`, `admin_role_members`, 감사로그 기반 추적       |
| 로그 원칙   | 이메일, 전화번호, 토큰, secret, 재무 원천 데이터 원문 금지    |
| 광고 원칙   | 광고 이벤트에 급여액, 지출액, 저축액, 납치금액 원문 저장 금지 |

---

## 4. 마이그레이션 적용 순서

마이그레이션은 반드시 아래 순서로 적용한다.

```txt
0001_init_users.sql
→ 0002_payroll_budget_expense.sql
→ 0003_growth_community_notifications.sql
→ 0004_admin_audit_ads.sql
```

| 순서 | 파일                                      | 핵심 영역                                                     |
| ---: | ----------------------------------------- | ------------------------------------------------------------- |
|    1 | `0001_init_users.sql`                     | 사용자, 인증, 프로필, 설정, 동의, 기기, 관리자 RBAC           |
|    2 | `0002_payroll_budget_expense.sql`         | 급여계획, 고정지출, 고정저축, 일일예산, 변동지출, 계산 스냅샷 |
|    3 | `0003_growth_community_notifications.sql` | 알림, 알림 발송, LV UP, 커뮤니티, 댓글, 반응, 신고, 첨부      |
|    4 | `0004_admin_audit_ads.sql`                | 광고/제휴, 광고 이벤트, 관리자 감사로그, 공지, 운영 장애      |

마이그레이션은 각 파일 내부에서 선행 스키마 계약을 검증해야 한다. 선행 테이블, 함수, 확장, 공통 컨텍스트 함수가 없으면 적용을 중단한다.

---

## 5. 마이그레이션별 책임

### 5.1 `0001_init_users.sql`

사용자와 권한의 기초 인프라를 담당한다.

| 영역        | 대상                                                                  |
| ----------- | --------------------------------------------------------------------- |
| 사용자      | `users`                                                               |
| 인증        | `auth_identities`                                                     |
| 프로필      | `user_profiles`                                                       |
| 설정        | `user_settings`                                                       |
| 동의        | `user_consents`                                                       |
| 기기        | `user_devices`                                                        |
| 관리자 RBAC | `admin_roles`, `admin_role_members`                                   |
| 공통 함수   | `current_app_user_id()`, `current_app_is_admin()`, `set_updated_at()` |

필수 기준:

- 활성 사용자 이메일 중복 방지
- 소셜/이메일 identity 중복 방지
- 사용자 설정과 프로필의 1:1 관계 보장
- 푸시 토큰 원문 미저장, hash 저장
- 관리자 역할 seed 재실행 안정성 보장
- RLS owner/admin 정책 적용

### 5.2 `0002_payroll_budget_expense.sql`

급여·예산·지출·저축의 서버 권위 계산을 담당한다.

| 영역        | 대상                            |
| ----------- | ------------------------------- |
| 급여계획    | `payroll_plans`                 |
| 고정지출    | `fixed_expenses`                |
| 고정저축    | `savings_plans`                 |
| 일일예산    | `daily_budgets`                 |
| 변동지출    | `variable_expenses`             |
| 계산 스냅샷 | `payroll_calculation_snapshots` |

필수 기준:

- 모든 금액은 KRW `BIGINT` 정수
- 음수 금액 입력 금지
- 월별 활성 급여계획은 사용자당 1개
- 사용자별 일일예산은 날짜당 1개
- 변동지출은 `idempotency_key`로 중복 등록 방지
- 납치금액은 표시 기준 0원 미만으로 내려가지 않음
- 예산 초과는 `remaining_amount = 0`, `over_amount > 0`으로 표현
- 트리거와 함수가 급여계획/일일예산/스냅샷을 서버에서 재계산

### 5.3 `0003_growth_community_notifications.sql`

사용자 재방문, 자기계발, 커뮤니티 상호작용을 담당한다.

| 영역       | 대상                      |
| ---------- | ------------------------- |
| 알림       | `notifications`           |
| 알림 발송  | `notification_deliveries` |
| LV UP 미션 | `growth_tasks`            |
| LV UP 완료 | `growth_task_completions` |
| 성장 통계  | `user_growth_stats`       |
| 게시글     | `community_posts`         |
| 댓글       | `community_comments`      |
| 반응       | `community_reactions`     |
| 신고       | `community_reports`       |
| 첨부       | `attachments`             |

필수 기준:

- 알림 payload에 재무 원천 데이터, 토큰, 개인정보 원문 저장 금지
- LV UP seed는 고정 기준값과 중복 방지 로직으로 재실행 안정성 보장
- 미션 완료는 사용자/미션/날짜 단위로 중복 방지
- 커뮤니티 익명글은 화면 표시 익명성과 DB 소유권을 분리
- 댓글, 반응, 신고, 첨부의 target 정합성 보장
- 신고 처리와 운영자 조치는 감사 가능해야 함

### 5.4 `0004_admin_audit_ads.sql`

상용화 운영, 광고/제휴, 감사, 공지, 장애 대응을 담당한다.

| 영역            | 대상                        |
| --------------- | --------------------------- |
| 파트너          | `partner_accounts`          |
| 광고 캠페인     | `ad_campaigns`              |
| 광고 이벤트     | `ad_events`                 |
| 관리자 감사로그 | `admin_audit_logs`          |
| 공지            | `notices`                   |
| 운영 장애       | `operational_incidents`     |
| 광고 성과 View  | `admin_ad_campaign_metrics` |

필수 기준:

- 내부 파트너 seed는 `contract_reference` unique 기준으로 중복 방지
- 광고 캠페인은 승인/검수/중지/종료 상태 관리
- 광고 이벤트는 request 단위 멱등 처리
- 광고 이벤트에는 급여액, 지출액, 저축액, 납치금액 원문 저장 금지
- 관리자 변경은 `INSERT`, `UPDATE`, `DELETE` 모두 감사로그 기록
- 감사로그는 민감정보를 마스킹하고 requestId 추적 가능해야 함
- 공지와 장애 대응은 관리자 RBAC와 운영 감사 기준 적용

---

## 6. 서버 권위 계산 원칙

급여납치의 금액 계산은 클라이언트 표시값이 아니라 서버와 DB가 확정한다. 클라이언트는 입력과 표시를 담당하고, 최종 계산은 API와 DB 함수/트리거가 수행한다.

### 6.1 핵심 계산식

```txt
총 고정지출 = ACTIVE/SCHEDULED/PAID 고정지출 합계
총 고정저축 = ACTIVE/SCHEDULED/TRANSFERRED 고정저축 합계
일일 사용금액 = ACTIVE 변동지출 합계
일일 남은금액 = max(0, 일일 설정금액 - 일일 사용금액)
일일 초과금액 = max(0, 일일 사용금액 - 일일 설정금액)
예상 납치금액 = max(0, 수령 예정 급여 - 고정지출 - 고정저축 - 사용/예정 생활비)
계산 스냅샷 = 계산 시점의 입력/결과/원인/revision 보존
```

### 6.2 금액 검증 규칙

| 규칙               | 기준                     |
| ------------------ | ------------------------ |
| 금액 타입          | `BIGINT`                 |
| 통화               | KRW                      |
| 소수점             | 금지                     |
| 음수 입력          | 금지                     |
| 납치금액 음수 표시 | 금지, 0원으로 클램프     |
| 예산 초과          | `over_amount`로 명시     |
| 중복 지출          | `idempotency_key`로 차단 |
| 계산 주체          | 서버/API/DB 함수         |

---

## 7. RLS와 접근통제

모든 사용자 소유 데이터는 RLS를 전제로 한다.

| 접근 주체      | 허용 범위                                         |
| -------------- | ------------------------------------------------- |
| 일반 사용자    | 본인 `user_id` 데이터만 조회/수정                 |
| 관리자         | 활성 관리자 역할과 정책상 허용된 운영 데이터      |
| 시스템 worker  | 명시된 batch/notification/cleanup 작업 범위       |
| 광고/제휴 운영 | 재무 원천 데이터가 제거된 광고/캠페인/집계 데이터 |

애플리케이션은 DB 세션 또는 transaction 시작 시 다음 컨텍스트를 설정한다.

```sql
SET LOCAL app.current_user_id = '<authenticated-user-uuid>';
SET LOCAL app.is_admin = 'false';
SET LOCAL app.request_id = '<request-id>';
SET LOCAL app.ip_hash = '<sha256-ip-hash>';
SET LOCAL app.user_agent_hash = '<sha256-user-agent-hash>';
```

관리자 작업은 `app.is_admin = 'true'`와 활성 `admin_role_members` 검증을 모두 만족해야 한다.

---

## 8. 인덱스 정책

상세 기준은 `database/policies/index-policy.md`를 따른다.

핵심 원칙:

1. 사용자 데이터 조회 인덱스는 `user_id`를 선두 컬럼으로 둔다.
2. 최신순 목록은 `created_at DESC`, `spent_at DESC`, `calculated_at DESC` 등 정렬 방향을 명시한다.
3. active unique, idempotency, soft delete, worker queue에는 partial index를 사용한다.
4. 광고 인덱스에 급여액, 지출액, 저축액, 납치금액 원문을 포함하지 않는다.
5. 대형 테이블은 운영 규모에 따라 partition과 concurrent index를 검토한다.

주요 성능 목표:

| 쿼리                 |   p95 목표 |
| -------------------- | ---------: |
| 사용자 급여 홈       | 300ms 이하 |
| 월별 급여/예산 상세  | 500ms 이하 |
| 최신 변동지출 목록   | 400ms 이하 |
| 알림 목록            | 300ms 이하 |
| 커뮤니티 게시글 목록 | 500ms 이하 |
| 광고 후보 조회       | 150ms 이하 |
| 관리자 감사로그 검색 | 800ms 이하 |

---

## 9. 보존/삭제 정책

상세 기준은 `database/policies/retention-policy.md`를 따른다.

핵심 원칙:

1. 회원 탈퇴 시 식별 가능한 개인정보와 재무 원천 데이터는 삭제 또는 강한 비식별화한다.
2. 커뮤니티 글/댓글은 서비스 맥락에 따라 익명화 또는 마스킹할 수 있다.
3. 알림과 발송 이력은 제한 기간 후 삭제한다.
4. 광고 이벤트는 동의 스냅샷과 비식별 이벤트 중심으로 보존한다.
5. 관리자 감사로그, 장애 대응, 광고 승인 이력은 장기 감사 목적에 따라 보존한다.
6. 백업은 장애 복구 목적으로만 사용하며 보존 기간 만료 후 삭제한다.

---

## 10. Seed 운영 기준

`database/seeds`는 실제 고객 데이터가 아닌 합성 데이터만 사용한다.

| 파일               | 목적                                                       | 실행 환경          |
| ------------------ | ---------------------------------------------------------- | ------------------ |
| `local.seed.sql`   | 로컬 개발/QA, UI 동작 확인, API 개발 보조                  | local DB           |
| `staging.seed.sql` | staging 시연, QA, preview 배포 검증                        | staging/preview DB |
| `uat.seed.sql`     | 사용자 승인 테스트, happy path/예산 초과/커뮤니티 인수검증 | UAT DB             |

Seed 파일 공통 기준:

- deterministic UUID 사용
- `ON CONFLICT` 또는 `WHERE NOT EXISTS`로 재실행 멱등성 보장
- 실제 이메일 대신 `example.invalid` 또는 로컬 전용 도메인 사용
- 전화번호 원문 저장 금지
- push token 원문 저장 금지, hash만 저장
- 광고 이벤트에 재무 원천 데이터 저장 금지
- seed 실행 전 선행 마이그레이션 계약 검증
- seed 실행 후 서버 권위 재계산 함수 호출

권장 실행 순서:

```bash
psql "$DATABASE_URL" -f database/migrations/0001_init_users.sql
psql "$DATABASE_URL" -f database/migrations/0002_payroll_budget_expense.sql
psql "$DATABASE_URL" -f database/migrations/0003_growth_community_notifications.sql
psql "$DATABASE_URL" -f database/migrations/0004_admin_audit_ads.sql
psql "$DATABASE_URL" -f database/seeds/local.seed.sql
```

staging/UAT는 환경에 맞는 seed만 적용한다.

```bash
psql "$STAGING_DATABASE_URL" -f database/seeds/staging.seed.sql
psql "$UAT_DATABASE_URL" -f database/seeds/uat.seed.sql
```

운영 DB에서는 seed 실행을 금지한다.

---

## 11. 백업과 복구

백업은 장애 복구, 배포 롤백, 데이터 손상 대응 목적으로만 사용한다.

| 백업 유형             | 기준                         |
| --------------------- | ---------------------------- |
| Neon PITR/WAL         | 인프라 플랜 기준 7~35일      |
| 일일 snapshot         | 운영 환경 기준 7~30일        |
| 배포 전 수동 snapshot | 배포 안정화 후 7일 이내 삭제 |
| 장애 대응 snapshot    | 사고 종료 후 30일 이내 삭제  |
| 법적 보존 snapshot    | 별도 승인 기간 적용          |

복구 원칙:

1. 복구 전 영향 범위와 데이터 시점을 명확히 기록한다.
2. 복구 작업자는 관리자 RBAC와 운영 승인 절차를 통과해야 한다.
3. 복구 후 마이그레이션 버전, RLS, 함수, 트리거, 인덱스, seed 잔존 여부를 확인한다.
4. 탈퇴/삭제 요청이 있었던 사용자는 복구 후 삭제 요청을 재적용한다.
5. 복구 결과와 requestId는 감사로그 또는 운영 장애 기록에 남긴다.

---

## 12. 로컬 개발 기준

로컬 개발자는 다음 순서로 DB를 준비한다.

```bash
createdb salary_hijacking_local
export DATABASE_URL="postgres://localhost:5432/salary_hijacking_local"
psql "$DATABASE_URL" -f database/migrations/0001_init_users.sql
psql "$DATABASE_URL" -f database/migrations/0002_payroll_budget_expense.sql
psql "$DATABASE_URL" -f database/migrations/0003_growth_community_notifications.sql
psql "$DATABASE_URL" -f database/migrations/0004_admin_audit_ads.sql
psql "$DATABASE_URL" -f database/seeds/local.seed.sql
```

검증 SQL:

```sql
SELECT COUNT(*) FROM public.users;
SELECT COUNT(*) FROM public.payroll_plans;
SELECT COUNT(*) FROM public.daily_budgets;
SELECT COUNT(*) FROM public.variable_expenses;
SELECT COUNT(*) FROM public.notifications;
SELECT COUNT(*) FROM public.community_posts;
SELECT COUNT(*) FROM public.ad_campaigns;
SELECT COUNT(*) FROM public.admin_audit_logs;
```

---

## 13. CI/CD 검증 기준

DB 변경 PR은 다음 검증을 통과해야 한다.

| 검증              | 기준                                                            |
| ----------------- | --------------------------------------------------------------- |
| SQL 문법          | PostgreSQL 기준 문법 오류 없음                                  |
| 마이그레이션 순서 | 선행 계약 검증 포함                                             |
| 재실행 안정성     | seed, index, role, partner 중복 없음                            |
| RLS               | 일반 사용자와 관리자 정책 분리                                  |
| 계산 테스트       | 급여/예산/지출/저축 계산 케이스 통과                            |
| 민감정보          | secret, token, 이메일/전화번호 원문, 재무 원천 데이터 로그 금지 |
| 광고 분리         | 광고 이벤트와 재무 원천 데이터 결합 금지                        |
| rollback          | 운영 영향이 있는 변경은 rollback 또는 복구 계획 포함            |
| 문서              | ERD, 정책, README, API 계약과 일치                              |

---

## 14. PR 체크리스트

DB 관련 PR은 아래 항목을 확인한다.

- [ ] 마이그레이션 번호와 적용 순서가 올바르다.
- [ ] 선행 테이블/함수/확장 검증이 포함되어 있다.
- [ ] 모든 금액 컬럼은 KRW `BIGINT` 정수 기준이다.
- [ ] 음수 금액과 소수점 금액을 허용하지 않는다.
- [ ] 사용자 소유 데이터는 RLS 정책을 가진다.
- [ ] 관리자 작업은 RBAC와 감사로그 기준을 가진다.
- [ ] seed는 실제 개인정보와 실제 금융정보를 포함하지 않는다.
- [ ] seed는 여러 번 실행해도 중복이 누적되지 않는다.
- [ ] 광고/제휴 데이터는 재무 원천 데이터와 분리되어 있다.
- [ ] 인덱스는 `index-policy.md`와 일치한다.
- [ ] 보존/삭제 기준은 `retention-policy.md`와 일치한다.
- [ ] ERD와 테이블/관계/정책이 일치한다.
- [ ] rollback 또는 복구 방안이 문서화되어 있다.

---

## 15. 금지 사항

다음 행위는 금지한다.

1. 운영 DB에서 local/staging/UAT seed 실행
2. 급여액, 지출액, 저축액, 납치금액을 애플리케이션 로그나 광고 이벤트에 원문 저장
3. 이메일, 전화번호, IP 원문, User-Agent 원문, push token, refresh token, secret key 저장
4. RLS 없이 사용자 소유 데이터를 조회하는 API 작성
5. 관리자 권한 변경을 감사로그 없이 수행
6. `ON CONFLICT DO NOTHING`을 conflict target 없이 남발
7. unique 기준 없는 seed upsert 작성
8. DB 마이그레이션에서 임시 테이블/임시 정책을 최종본처럼 방치
9. 커뮤니티 익명글의 작성자 식별정보를 API 응답으로 노출
10. 백업 데이터를 사용자 단위 복원 또는 임의 조회 목적으로 사용

---

## 16. 장애 대응 Runbook

DB 장애 또는 데이터 정합성 문제가 발생하면 다음 순서로 대응한다.

1. 영향 범위 확인: 사용자, 급여계획, 지출, 알림, 커뮤니티, 광고, 관리자 중 어느 영역인지 식별
2. requestId, userId, targetId, 발생 시각, 배포 버전 기록
3. 쓰기 장애이면 신규 write를 일시 제한하거나 queue로 전환
4. 계산 장애이면 `payroll_calculation_snapshots`와 재계산 함수를 확인
5. RLS 장애이면 일반 사용자와 관리자 컨텍스트를 분리해 재현
6. 광고/감사 장애이면 재무 원천 데이터 노출 여부를 우선 확인
7. 필요 시 snapshot 기준 복구 또는 rollback 수행
8. `operational_incidents`와 `admin_audit_logs`에 조치 내역 기록
9. 사용자 영향이 있으면 공지 또는 개별 안내
10. 재발 방지를 위해 migration/test/policy를 업데이트

---

## 17. 보안과 개인정보 기준

급여납치 DB는 다음 데이터를 민감 데이터로 본다.

| 등급 | 데이터                                                                |
| ---- | --------------------------------------------------------------------- |
| S1   | 급여액, 고정지출, 고정저축, 일일예산, 변동지출, 납치금액, 계산 스냅샷 |
| S2   | 이메일, 전화번호, 소셜 identity, 기기 hash, 동의 이력                 |
| S3   | 알림, 커뮤니티 글/댓글/신고, 첨부                                     |
| S4   | 관리자 감사로그, 장애 대응, 공지                                      |
| S5   | 광고/제휴 이벤트, 캠페인, 파트너, 정산 집계                           |

보호 기준:

- S1은 광고/로그/커뮤니티/첨부에 원문 저장하지 않는다.
- S2는 hash 또는 마스킹을 우선한다.
- S3는 익명화와 신고 처리 기준을 가진다.
- S4는 장기 보존하되 민감정보 원문을 제거한다.
- S5는 재무 원천 데이터와 분리하고 동의 스냅샷만 최소 보존한다.

---

## 18. 검증 SQL 모음

### 18.1 RLS 정책 확인

```sql
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### 18.2 인덱스 확인

```sql
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

### 18.3 계산 스냅샷 확인

```sql
SELECT
  user_id,
  payroll_plan_id,
  year_month,
  calculation_reason,
  calculated_at
FROM public.payroll_calculation_snapshots
ORDER BY calculated_at DESC
LIMIT 20;
```

### 18.4 광고 이벤트 민감정보 점검

```sql
SELECT
  ad_event_id,
  event_type,
  placement,
  consent_snapshot,
  event_context
FROM public.ad_events
WHERE event_context::text ~* '(salary|payroll|expense_amount|saving_amount|hijack_amount|token|secret|phone|email)';
```

위 쿼리는 결과가 없어야 한다.

### 18.5 seed 중복 점검

```sql
SELECT user_id, year_month, COUNT(*)
FROM public.payroll_plans
WHERE status = 'ACTIVE'
GROUP BY user_id, year_month
HAVING COUNT(*) > 1;
```

```sql
SELECT user_id, budget_date, COUNT(*)
FROM public.daily_budgets
GROUP BY user_id, budget_date
HAVING COUNT(*) > 1;
```

두 쿼리는 결과가 없어야 한다.

---

## 19. 환경변수 기준

| 변수                   | 용도                  | 주의                       |
| ---------------------- | --------------------- | -------------------------- |
| `DATABASE_URL`         | 기본 DB 연결          | 로그 출력 금지             |
| `DIRECT_DATABASE_URL`  | migration/direct 연결 | CI secret로만 관리         |
| `STAGING_DATABASE_URL` | staging DB            | 운영 DB와 분리             |
| `UAT_DATABASE_URL`     | UAT DB                | 운영 DB와 분리             |
| `SHADOW_DATABASE_URL`  | migration 검증        | 실제 데이터 사용 금지      |
| `DATABASE_SSL_MODE`    | SSL 정책              | 배포 환경에서 require 권장 |

DB URL, password, token, private key는 commit, issue, PR, log, screenshot에 노출하지 않는다.

---

## 20. 파일 단위 완료 기준

`database/README.md`는 다음 조건을 충족할 때 파일 단위 완료로 본다.

1. `database` 디렉터리의 목적과 책임을 설명한다.
2. ERD, migration, policy, seed, backup 구조를 설명한다.
3. `0001`~`0004` 마이그레이션의 역할과 적용 순서를 정의한다.
4. 급여·예산·지출·저축 서버 권위 계산 원칙을 정의한다.
5. RLS와 관리자 RBAC 기준을 정의한다.
6. 인덱스 정책과 보존/삭제 정책의 참조 관계를 정의한다.
7. local/staging/UAT seed 운영 기준을 정의한다.
8. 백업과 복구 기준을 정의한다.
9. CI/CD와 PR 체크리스트를 정의한다.
10. 보안/개인정보/광고 분리 금지사항을 정의한다.
11. 장애 대응 Runbook을 제공한다.
12. 검증 SQL을 제공한다.
13. 미완료 표식, 임시 메모, 불명확한 작업 메모가 없다.

---

## 21. 최종 판정

`database/README.md`는 급여납치 플랫폼의 Neon PostgreSQL 기반 데이터베이스 구조, 마이그레이션, 시드, 백업, ERD, 인덱스 정책, 데이터 보존/삭제 정책, RLS, 관리자 RBAC, 서버 권위 계산, 광고/제휴 데이터 분리, 운영 장애 대응 기준을 통합 설명하는 최종 데이터베이스 운영 문서다.

이 파일은 문서상·이론상 `database/README.md` 파일 단위 기준으로 더 이상 추가 작성이 필요 없는 최종본으로 사용한다. 단, 프로젝트 종합 완성도 100%는 실제 DB 마이그레이션 적용, API/RBAC/E2E/CI/CD, 운영 백업/복구 리허설이 본 문서와 일치하게 통과했을 때 최종 확정한다.
