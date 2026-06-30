# 인덱스 정책

> 문서 상태: 최종본  
> 파일 위치: `database/policies/index-policy.md`  
> 적용 서비스: 급여납치(`salary-hijacking-platform`)  
> 적용 범위: 사용자/인증 · 급여/예산/지출/저축 · 서버 권위 계산 · 알림 · LV UP · 커뮤니티 · 광고/제휴 · 관리자 운영 · 감사로그  
> 기준 DB: Neon PostgreSQL / PostgreSQL  
> 기준 시간대: `Asia/Seoul`  
> 기준 통화: KRW, 1원 단위 정수  
> 기준 마이그레이션: `0001_init_users.sql` ~ `0004_admin_audit_ads.sql`  
> 핵심 원칙: 사용자 소유권 기반 조회, 서버 권위 계산 성능, 개인정보 최소 접근, 광고/재무 원천 데이터 분리, 관리자 감사 추적, 재실행 가능한 마이그레이션

---

## 1. 문서 목적

이 문서는 급여납치 플랫폼의 PostgreSQL 인덱스 설계·운영·검증 정책을 정의한다. 기존의 간단한 설명을 대체하며, 데이터베이스 마이그레이션, API 쿼리 설계, 관리자 콘솔 검색, QA 성능 검증, 보안 검토, 운영 장애 대응에서 동일하게 참조하는 기준 문서로 사용한다.

인덱스 정책의 목표는 다음과 같다.

1. 사용자별 월별 급여계획, 고정지출, 고정저축, 일일예산, 변동지출 조회를 안정적으로 처리한다.
2. 서버 권위 급여·예산·지출·저축·납치금액 계산과 재계산 트리거가 대량 데이터에서도 병목이 되지 않게 한다.
3. 알림 목록, 발송 재시도, LV UP 미션, 커뮤니티 게시글/댓글/반응/신고, 첨부 조회 성능을 보장한다.
4. 광고/제휴 캠페인 노출, 이벤트 집계, 관리자 감사로그, 공지, 장애 대응 검색 성능을 보장한다.
5. RLS와 사용자 소유권 검증이 적용된 상태에서도 API 쿼리가 인덱스를 활용할 수 있도록 한다.
6. 개인정보·재무 원천 데이터 접근 범위를 최소화하고, 광고 데이터와 재무 원천 데이터가 직접 결합되지 않도록 한다.
7. 마이그레이션 재실행 시 인덱스 중복 생성, 이름 충돌, 불완전한 partial unique 정책이 발생하지 않게 한다.

---

## 2. 적용 범위

| 구분                | 대상                                                                                               |
| ------------------- | -------------------------------------------------------------------------------------------------- |
| 사용자/인증         | `users`, `auth_identities`, `user_profiles`, `user_settings`, `user_consents`, `user_devices`      |
| 관리자 RBAC         | `admin_roles`, `admin_role_members`                                                                |
| 급여/예산/지출/저축 | `payroll_plans`, `fixed_expenses`, `savings_plans`, `daily_budgets`, `variable_expenses`           |
| 계산 스냅샷         | `payroll_calculation_snapshots`                                                                    |
| 알림                | `notifications`, `notification_deliveries`                                                         |
| LV UP               | `growth_tasks`, `growth_task_completions`, `user_growth_stats`                                     |
| 커뮤니티            | `community_posts`, `community_comments`, `community_reactions`, `community_reports`, `attachments` |
| 광고/제휴           | `partner_accounts`, `ad_campaigns`, `ad_events`, `admin_ad_campaign_metrics`                       |
| 관리자 운영         | `admin_audit_logs`, `notices`, `operational_incidents`                                             |
| 운영 검증           | 마이그레이션, API 쿼리, 관리자 콘솔, QA 성능 테스트, 릴리즈 체크리스트                             |

---

## 3. 인덱스 설계 원칙

### 3.1 사용자 소유권 우선

사용자 데이터 테이블의 일반 조회 인덱스는 `user_id`를 선두 컬럼으로 둔다. 급여, 예산, 지출, 알림, LV UP 완료, 커뮤니티 사용자 작성 내역, 광고 이벤트의 사용자 조회는 모두 사용자 소유권 검증과 RLS를 전제로 하므로 `user_id` 선두 인덱스가 기본이다.

예외는 다음과 같다.

| 예외               | 이유                                                                                                     |
| ------------------ | -------------------------------------------------------------------------------------------------------- |
| 관리자 목록 조회   | `status`, `created_at`, `severity`, `target_type` 등 운영 필터가 선두가 될 수 있다.                      |
| 공개 커뮤니티 목록 | `board_type`, `status`, `created_at` 순으로 목록 최적화를 우선한다.                                      |
| 발송 재시도 큐     | `status`, `scheduled_at`, `attempted_at` 순으로 worker poll 성능을 우선한다.                             |
| 광고 활성 캠페인   | `placement`, `status`, `start_at`, `end_at`, `priority` 순으로 노출 후보 조회를 우선한다.                |
| 감사로그           | `target_type`, `target_id`, `created_at` 또는 `actor_user_id`, `created_at` 순으로 조사 동선을 우선한다. |

### 3.2 정렬 방향 명시

최신순 목록은 `created_at DESC`, `updated_at DESC`, `spent_at DESC`, `calculated_at DESC`, `occurred_at DESC`를 명시한다. 댓글처럼 오래된 순서가 화면 기준인 경우에는 `created_at ASC`를 사용한다.

### 3.3 Partial index 적극 사용

상태가 제한된 조회나 soft delete, active unique, idempotency에는 partial index를 사용한다.

| 패턴                       | 예시                                                      |
| -------------------------- | --------------------------------------------------------- |
| 활성 이메일 unique         | `WHERE email IS NOT NULL AND deleted_at IS NULL`          |
| 활성 관리자 역할 unique    | `WHERE status = 'ACTIVE'`                                 |
| 변동지출 멱등키 unique     | `WHERE idempotency_key IS NOT NULL`                       |
| 활성 푸시 토큰             | `WHERE push_token_hash IS NOT NULL AND status = 'ACTIVE'` |
| 게시글 인기 조회           | `WHERE status = 'PUBLISHED'` 또는 status 선두 복합 인덱스 |
| 내부 파트너 seed 중복 방지 | `WHERE contract_reference IS NOT NULL`                    |

### 3.4 Unique index는 비즈니스 불변식을 표현한다

단순 성능 목적이 아니라 데이터 무결성 목적의 unique index는 명확한 이름과 조건을 가져야 한다.

| 불변식                     | 인덱스                                   |
| -------------------------- | ---------------------------------------- |
| 활성 이메일 중복 금지      | `uq_users_email_active`                  |
| 소셜 계정 중복 연결 금지   | `uq_auth_provider_key`                   |
| 월별 활성 급여계획 1개     | `uq_payroll_user_month_active`           |
| 사용자별 일일예산 1개      | `uq_daily_budget_user_date`              |
| 변동지출 중복 등록 방지    | `uq_variable_idempotency`                |
| 일일 미션 중복 완료 방지   | `uq_growth_completion_daily`             |
| 커뮤니티 반응 중복 방지    | `uq_reaction_unique`                     |
| 중복 신고 방지             | `uq_reporter_target_open`                |
| 광고 이벤트 멱등 처리      | `uq_ad_events_request_once`              |
| 내부 파트너 seed 중복 방지 | `uq_partner_accounts_contract_reference` |

### 3.5 재무 원천 데이터와 광고 데이터 분리

광고/제휴 인덱스는 캠페인, 지면, 이벤트 시각, 이벤트 유형, 동의 스냅샷, 비식별 세션/기기 해시 기준으로만 설계한다. 급여액, 지출액, 저축액, 납치금액, 대출 정보, 계좌 정보, 카드번호, 사용자 메모 원문을 광고 인덱스 컬럼이나 expression index에 포함하지 않는다.

### 3.6 RLS 친화성

RLS가 활성화된 테이블은 policy 조건과 API where 조건이 같은 선두 컬럼을 사용해야 한다. 일반 사용자 데이터는 `user_id`, 관리자 운영 데이터는 관리자 컨텍스트와 운영 필터를 기준으로 한다.

### 3.7 쓰기 비용과 읽기 성능 균형

인덱스는 쓰기 성능을 저하시킨다. 다음 테이블은 쓰기량이 크므로 인덱스 추가를 엄격히 제한한다.

| 고쓰기 테이블             | 제한 기준                                         |
| ------------------------- | ------------------------------------------------- |
| `variable_expenses`       | 사용자/날짜/예산 재계산에 필요한 인덱스만 허용    |
| `notification_deliveries` | 재시도 큐와 기기별 이력에 필요한 인덱스만 허용    |
| `community_reactions`     | target 집계와 사용자 이력, unique만 허용          |
| `ad_events`               | 캠페인/이벤트 유형/지면/사용자/멱등키 기준만 허용 |
| `admin_audit_logs`        | 조사 동선 중심으로만 허용                         |

---

## 4. 인덱스 명명 규칙

| 유형             | Prefix                         | 예시                         |
| ---------------- | ------------------------------ | ---------------------------- |
| 일반 조회        | `idx_`                         | `idx_variable_user_spent`    |
| Unique 제약      | `uq_`                          | `uq_daily_budget_user_date`  |
| Foreign key 보조 | `idx_<table>_<fk>`             | `idx_auth_identities_user`   |
| 상태/시간 조회   | `idx_<domain>_<status>_<time>` | `idx_notifications_schedule` |
| 관리자 검색      | `idx_admin_<target>`           | `idx_admin_audit_target`     |
| 광고 집계        | `idx_ad_<target>`              | `idx_ad_events_campaign`     |

금지 규칙은 다음과 같다.

1. 자동 생성명만 사용하는 인덱스 금지.
2. 의미가 불명확한 `idx_1`, `idx_temp`, `idx_test` 금지.
3. 같은 컬럼 조합의 중복 인덱스 금지.
4. 컬럼 순서만 다른 인덱스는 실제 쿼리 패턴과 `EXPLAIN` 근거가 있을 때만 허용.
5. 삭제 예정 인덱스는 운영 영향 분석과 rollback 계획 없이 제거 금지.

---

## 5. 필수 인덱스 카탈로그

### 5.1 사용자/인증/기기/RBAC

| 인덱스명                             | 대상                                                                                                             | 목적                         | 필수 |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------- | ---------------------------- | ---: |
| `uq_users_email_active`              | `users(lower(email)) WHERE email IS NOT NULL AND deleted_at IS NULL`                                             | 활성 사용자 이메일 중복 방지 |    Y |
| `idx_users_status_created`           | `users(status, created_at DESC)`                                                                                 | 관리자 회원 목록             |    Y |
| `idx_users_last_login`               | `users(last_login_at DESC) WHERE last_login_at IS NOT NULL`                                                      | 휴면/활성 사용자 분석        |    Y |
| `idx_users_phone_hash`               | `users(phone_number_hash) WHERE phone_number_hash IS NOT NULL AND deleted_at IS NULL`                            | 전화번호 해시 기반 검색      |    Y |
| `uq_auth_provider_key`               | `auth_identities(provider, provider_user_key)`                                                                   | 소셜/이메일 식별자 중복 방지 |    Y |
| `idx_auth_identities_user`           | `auth_identities(user_id, linked_at DESC)`                                                                       | 사용자 인증수단 조회         |    Y |
| `idx_auth_identities_active_user`    | `auth_identities(user_id, provider) WHERE revoked_at IS NULL`                                                    | 활성 인증수단 조회           |    Y |
| `idx_user_profiles_display_name`     | `user_profiles(display_name)`                                                                                    | 프로필 표시명 검색           |    Y |
| `idx_user_consents_user_type_time`   | `user_consents(user_id, consent_type, created_at DESC)`                                                          | 최신 동의 이력 조회          |    Y |
| `idx_user_consents_latest_granted`   | `user_consents(user_id, consent_type, granted, created_at DESC)`                                                 | 광고/마케팅/분석 동의 확인   |    Y |
| `idx_user_devices_user_status`       | `user_devices(user_id, status, last_seen_at DESC)`                                                               | 활성 기기 조회               |    Y |
| `idx_user_devices_push_token_hash`   | `user_devices(push_token_hash) WHERE push_token_hash IS NOT NULL AND status = 'ACTIVE'`                          | 푸시 토큰 해시 조회          |    Y |
| `uq_user_devices_fingerprint_active` | `user_devices(user_id, device_fingerprint_hash) WHERE device_fingerprint_hash IS NOT NULL AND status = 'ACTIVE'` | 동일 활성 기기 중복 방지     |    Y |
| `uq_admin_role_members_active`       | `admin_role_members(admin_role_id, user_id) WHERE status = 'ACTIVE'`                                             | 관리자 역할 중복 부여 방지   |    Y |
| `idx_admin_role_members_user_status` | `admin_role_members(user_id, status, assigned_at DESC)`                                                          | 사용자별 관리자 권한 조회    |    Y |
| `idx_admin_role_members_role_status` | `admin_role_members(admin_role_id, status, assigned_at DESC)`                                                    | 역할별 멤버 조회             |    Y |

### 5.2 급여/예산/지출/저축/계산

| 인덱스명                            | 대상                                                                            | 목적                        | 필수 |
| ----------------------------------- | ------------------------------------------------------------------------------- | --------------------------- | ---: |
| `uq_payroll_user_month_active`      | `payroll_plans(user_id, year_month) WHERE status = 'ACTIVE'`                    | 월별 활성 급여계획 1개 보장 |    Y |
| `idx_payroll_user_month`            | `payroll_plans(user_id, year_month DESC)`                                       | 월별 급여계획 조회          |    Y |
| `idx_payroll_user_status_month`     | `payroll_plans(user_id, status, year_month DESC)`                               | 상태별 계획 조회            |    Y |
| `idx_payroll_status_updated`        | `payroll_plans(status, updated_at DESC)`                                        | 관리자 운영 목록            |    Y |
| `idx_fixed_user_plan`               | `fixed_expenses(user_id, payroll_plan_id, expense_day)`                         | 계획별 고정지출 조회        |    Y |
| `idx_fixed_plan_status`             | `fixed_expenses(payroll_plan_id, status, expense_day)`                          | 서버 권위 고정지출 합계     |    Y |
| `idx_fixed_user_category_status`    | `fixed_expenses(user_id, category, status)`                                     | 카테고리별 고정지출 조회    |    Y |
| `idx_savings_user_plan`             | `savings_plans(user_id, payroll_plan_id, saving_day)`                           | 계획별 고정저축 조회        |    Y |
| `idx_savings_plan_status`           | `savings_plans(payroll_plan_id, status, saving_day)`                            | 서버 권위 고정저축 합계     |    Y |
| `idx_savings_user_category_status`  | `savings_plans(user_id, category, status)`                                      | 카테고리별 저축 조회        |    Y |
| `uq_daily_budget_user_date`         | `daily_budgets(user_id, budget_date)`                                           | 사용자별 일일예산 1개 보장  |    Y |
| `idx_daily_budget_user_date`        | `daily_budgets(user_id, budget_date DESC)`                                      | 날짜별 예산 조회            |    Y |
| `idx_daily_budget_user_status_date` | `daily_budgets(user_id, status, budget_date DESC)`                              | 예산 초과/마감 목록         |    Y |
| `uq_variable_idempotency`           | `variable_expenses(user_id, idempotency_key) WHERE idempotency_key IS NOT NULL` | 지출 중복 등록 방지         |    Y |
| `idx_variable_user_spent`           | `variable_expenses(user_id, spent_at DESC)`                                     | 최신 지출 내역              |    Y |
| `idx_variable_budget`               | `variable_expenses(daily_budget_id, status)`                                    | 일일예산 재계산             |    Y |
| `idx_variable_user_category_spent`  | `variable_expenses(user_id, category, spent_at DESC)`                           | 카테고리별 변동지출         |    Y |
| `idx_variable_active_budget_spent`  | `variable_expenses(daily_budget_id, spent_at DESC) WHERE status = 'ACTIVE'`     | 활성 지출 합계/목록         |    Y |
| `idx_calc_snapshot_user_month`      | `payroll_calculation_snapshots(user_id, year_month DESC, calculated_at DESC)`   | 계산 이력 조회              |    Y |
| `idx_calc_snapshot_plan_time`       | `payroll_calculation_snapshots(payroll_plan_id, calculated_at DESC)`            | 계획별 snapshot             |    Y |
| `idx_calc_snapshot_reason_time`     | `payroll_calculation_snapshots(calculation_reason, calculated_at DESC)`         | 재계산 원인별 운영 추적     |    Y |

### 5.3 알림

| 인덱스명                                   | 대상                                                                                            | 목적                    | 필수 |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------- | ----------------------- | ---: |
| `idx_notifications_user_status`            | `notifications(user_id, status, created_at DESC)`                                               | 사용자 알림 목록/미읽음 |    Y |
| `idx_notifications_user_type_created`      | `notifications(user_id, type, created_at DESC)`                                                 | 유형별 알림 조회        |    Y |
| `idx_notifications_schedule`               | `notifications(status, scheduled_at ASC) WHERE status = 'SCHEDULED'`                            | 알림 발송 worker poll   |    Y |
| `idx_notifications_expire`                 | `notifications(expires_at ASC) WHERE expires_at IS NOT NULL AND status IN ('SCHEDULED','SENT')` | 만료 알림 정리          |    Y |
| `idx_notification_deliveries_notification` | `notification_deliveries(notification_id, created_at DESC)`                                     | 알림별 발송 이력        |    Y |
| `idx_notification_deliveries_status`       | `notification_deliveries(status, attempted_at DESC)`                                            | 발송 실패 재시도        |    Y |
| `idx_notification_deliveries_device`       | `notification_deliveries(device_id, created_at DESC) WHERE device_id IS NOT NULL`               | 기기별 발송 이력        |    Y |

### 5.4 LV UP

| 인덱스명                                 | 대상                                                                                           | 목적                         | 필수 |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------- | ---: |
| `uq_growth_tasks_type_title_active_from` | `growth_tasks(type, title, active_from)`                                                       | 동일 시작시각 미션 중복 방지 |    Y |
| `idx_growth_tasks_active`                | `growth_tasks(type, status, active_from, active_to)`                                           | 활성 미션 조회               |    Y |
| `idx_growth_tasks_category_status`       | `growth_tasks(category, status, active_from DESC)`                                             | 카테고리별 미션              |    Y |
| `uq_growth_completion_daily`             | `growth_task_completions(user_id, growth_task_id, completion_date) WHERE status = 'COMPLETED'` | 일일 미션 중복 완료 방지     |    Y |
| `idx_growth_completion_user_date`        | `growth_task_completions(user_id, completion_date DESC)`                                       | 사용자 완료 이력             |    Y |
| `idx_growth_completion_task_status`      | `growth_task_completions(growth_task_id, status, completed_at DESC)`                           | 미션별 완료 현황             |    Y |
| `idx_user_growth_stats_level_exp`        | `user_growth_stats(level DESC, total_exp DESC)`                                                | 성장 랭킹/관리자 분석        |    Y |

### 5.5 커뮤니티/첨부

| 인덱스명                         | 대상                                                                                               | 목적                  | 필수 |
| -------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------- | ---: |
| `idx_posts_board_status_created` | `community_posts(board_type, status, created_at DESC)`                                             | 게시판 목록           |    Y |
| `idx_posts_popular`              | `community_posts(status, like_count DESC, comment_count DESC, view_count DESC)`                    | 인기글                |    Y |
| `idx_posts_user_created`         | `community_posts(user_id, created_at DESC)`                                                        | 내가 쓴 글            |    Y |
| `idx_posts_status_report`        | `community_posts(status, report_count DESC, updated_at DESC)`                                      | 신고/모더레이션 후보  |    Y |
| `idx_comments_post_created`      | `community_comments(post_id, status, created_at ASC)`                                              | 댓글 목록             |    Y |
| `idx_comments_user_created`      | `community_comments(user_id, created_at DESC)`                                                     | 내가 쓴 댓글          |    Y |
| `idx_comments_parent`            | `community_comments(parent_comment_id, created_at ASC) WHERE parent_comment_id IS NOT NULL`        | 대댓글 목록           |    Y |
| `uq_reaction_unique`             | `community_reactions(user_id, target_type, target_id, reaction_type)`                              | 중복 반응 방지        |    Y |
| `idx_reactions_target`           | `community_reactions(target_type, target_id, reaction_type, created_at DESC)`                      | 대상별 반응 집계      |    Y |
| `idx_reactions_user_created`     | `community_reactions(user_id, created_at DESC)`                                                    | 사용자 반응 이력      |    Y |
| `uq_reporter_target_open`        | `community_reports(reporter_user_id, target_type, target_id) WHERE status IN ('OPEN','IN_REVIEW')` | 동일 신고 중복 방지   |    Y |
| `idx_reports_status`             | `community_reports(status, created_at ASC)`                                                        | 신고 처리 큐          |    Y |
| `idx_reports_target`             | `community_reports(target_type, target_id, created_at DESC)`                                       | 대상별 신고 이력      |    Y |
| `idx_reports_reporter`           | `community_reports(reporter_user_id, created_at DESC)`                                             | 신고자 이력           |    Y |
| `idx_attachments_owner`          | `attachments(owner_type, owner_id, status, created_at DESC)`                                       | 게시글/댓글 첨부 조회 |    Y |
| `idx_attachments_created_by`     | `attachments(created_by, created_at DESC) WHERE created_by IS NOT NULL`                            | 사용자 첨부 이력      |    Y |
| `idx_attachments_status`         | `attachments(status, created_at DESC)`                                                             | 검역/삭제/숨김 관리   |    Y |

### 5.6 광고/제휴/관리자 운영

| 인덱스명                                 | 대상                                                                                              | 목적                            | 필수 |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------- | ---: |
| `idx_partner_accounts_status_created`    | `partner_accounts(status, created_at DESC)`                                                       | 파트너 검수 목록                |    Y |
| `idx_partner_accounts_business_status`   | `partner_accounts(business_type, status, created_at DESC)`                                        | 유형별 파트너 조회              |    Y |
| `uq_partner_accounts_contract_reference` | `partner_accounts(contract_reference) WHERE contract_reference IS NOT NULL`                       | 내부 파트너 seed/계약 중복 방지 |    Y |
| `idx_ad_campaigns_active`                | `ad_campaigns(placement, status, start_at, end_at, priority)`                                     | 활성 광고 후보 조회             |    Y |
| `idx_ad_campaigns_partner_status`        | `ad_campaigns(partner_account_id, status, created_at DESC)`                                       | 파트너별 캠페인                 |    Y |
| `idx_ad_campaigns_review`                | `ad_campaigns(status, risk_level, updated_at DESC) WHERE status IN ('DRAFT','REVIEW','REJECTED')` | 검수 큐                         |    Y |
| `idx_ad_campaigns_schedule`              | `ad_campaigns(status, start_at, end_at) WHERE status IN ('SCHEDULED','LIVE')`                     | 예약/라이브 전환                |    Y |
| `uq_ad_events_request_once`              | `ad_events(ad_campaign_id, event_type, request_id) WHERE request_id IS NOT NULL`                  | 광고 이벤트 멱등성              |    Y |
| `idx_ad_events_campaign`                 | `ad_events(ad_campaign_id, occurred_at DESC)`                                                     | 캠페인 성과 집계                |    Y |
| `idx_ad_events_type_time`                | `ad_events(event_type, occurred_at DESC)`                                                         | 이벤트 유형별 통계              |    Y |
| `idx_ad_events_user_time`                | `ad_events(user_id, occurred_at DESC) WHERE user_id IS NOT NULL`                                  | 사용자 광고 이력                |    Y |
| `idx_ad_events_placement_time`           | `ad_events(placement, occurred_at DESC)`                                                          | 지면별 광고 통계                |    Y |
| `idx_admin_audit_target`                 | `admin_audit_logs(target_type, target_id, created_at DESC)`                                       | 대상별 감사 이력                |    Y |
| `idx_admin_audit_actor`                  | `admin_audit_logs(actor_user_id, created_at DESC) WHERE actor_user_id IS NOT NULL`                | 관리자별 감사 이력              |    Y |
| `idx_admin_audit_action_time`            | `admin_audit_logs(action, created_at DESC)`                                                       | 액션별 감사 검색                |    Y |
| `idx_admin_audit_severity_time`          | `admin_audit_logs(severity, created_at DESC)`                                                     | 심각도별 감사 검색              |    Y |
| `idx_admin_audit_request_id`             | `admin_audit_logs(request_id)`                                                                    | 요청 추적                       |    Y |
| `idx_notices_status_published`           | `notices(status, published_at DESC)`                                                              | 공지 목록                       |    Y |
| `idx_notices_audience_status`            | `notices(audience, status, published_at DESC)`                                                    | 대상별 공지                     |    Y |
| `idx_notices_pinned`                     | `notices(is_pinned DESC, published_at DESC) WHERE status = 'PUBLISHED'`                           | 고정 공지                       |    Y |
| `idx_incidents_status_severity`          | `operational_incidents(status, severity, detected_at DESC)`                                       | 장애 대응 목록                  |    Y |
| `idx_incidents_area_status`              | `operational_incidents(affected_area, status, detected_at DESC)`                                  | 영역별 장애 검색                |    Y |
| `idx_incidents_owner`                    | `operational_incidents(owner_user_id, status, detected_at DESC) WHERE owner_user_id IS NOT NULL`  | 담당자별 장애 목록              |    Y |

---

## 6. 핵심 쿼리 패턴별 인덱스 정책

### 6.1 급여 홈/월별 계획

| 화면/API        | where/order 기준                                    | 권장 인덱스                                                     |
| --------------- | --------------------------------------------------- | --------------------------------------------------------------- |
| 급여 홈 현재 월 | `user_id`, `year_month`, `status`                   | `idx_payroll_user_status_month`, `uq_payroll_user_month_active` |
| 월별 계획 목록  | `user_id ORDER BY year_month DESC`                  | `idx_payroll_user_month`                                        |
| 고정지출 목록   | `user_id`, `payroll_plan_id ORDER BY expense_day`   | `idx_fixed_user_plan`                                           |
| 고정저축 목록   | `user_id`, `payroll_plan_id ORDER BY saving_day`    | `idx_savings_user_plan`                                         |
| 계산 이력       | `user_id`, `year_month ORDER BY calculated_at DESC` | `idx_calc_snapshot_user_month`                                  |

### 6.2 일일예산/변동지출

| 화면/API       | where/order 기준                    | 권장 인덱스                                               |
| -------------- | ----------------------------------- | --------------------------------------------------------- |
| 오늘 예산      | `user_id`, `budget_date`            | `uq_daily_budget_user_date`                               |
| 예산 캘린더    | `user_id ORDER BY budget_date DESC` | `idx_daily_budget_user_date`                              |
| 초과 예산 목록 | `user_id`, `status`, `budget_date`  | `idx_daily_budget_user_status_date`                       |
| 최신 지출      | `user_id ORDER BY spent_at DESC`    | `idx_variable_user_spent`                                 |
| 예산 재계산    | `daily_budget_id`, `status`         | `idx_variable_budget`, `idx_variable_active_budget_spent` |
| 중복 지출 방지 | `user_id`, `idempotency_key`        | `uq_variable_idempotency`                                 |

### 6.3 알림

| 화면/API    | where/order 기준                                 | 권장 인덱스                           |
| ----------- | ------------------------------------------------ | ------------------------------------- |
| 알림함      | `user_id`, `status ORDER BY created_at DESC`     | `idx_notifications_user_status`       |
| 유형별 알림 | `user_id`, `type ORDER BY created_at DESC`       | `idx_notifications_user_type_created` |
| 예약 발송   | `status = 'SCHEDULED' ORDER BY scheduled_at ASC` | `idx_notifications_schedule`          |
| 실패 재시도 | `status ORDER BY attempted_at DESC`              | `idx_notification_deliveries_status`  |

### 6.4 LV UP

| 화면/API            | where/order 기준                               | 권장 인덱스                       |
| ------------------- | ---------------------------------------------- | --------------------------------- |
| 활성 미션           | `type`, `status`, `active_from`, `active_to`   | `idx_growth_tasks_active`         |
| 사용자 완료 이력    | `user_id ORDER BY completion_date DESC`        | `idx_growth_completion_user_date` |
| 일일 중복 완료 방지 | `user_id`, `growth_task_id`, `completion_date` | `uq_growth_completion_daily`      |
| 레벨/경험치 랭킹    | `ORDER BY level DESC, total_exp DESC`          | `idx_user_growth_stats_level_exp` |

### 6.5 커뮤니티

| 화면/API     | where/order 기준                                        | 권장 인덱스                      |
| ------------ | ------------------------------------------------------- | -------------------------------- |
| 게시판 목록  | `board_type`, `status ORDER BY created_at DESC`         | `idx_posts_board_status_created` |
| 인기글       | `status ORDER BY like_count, comment_count, view_count` | `idx_posts_popular`              |
| 게시글 댓글  | `post_id`, `status ORDER BY created_at ASC`             | `idx_comments_post_created`      |
| 반응 집계    | `target_type`, `target_id`, `reaction_type`             | `idx_reactions_target`           |
| 신고 처리 큐 | `status ORDER BY created_at ASC`                        | `idx_reports_status`             |
| 첨부 목록    | `owner_type`, `owner_id`, `status`                      | `idx_attachments_owner`          |

### 6.6 광고/제휴/관리자

| 화면/API              | where/order 기준                                        | 권장 인덱스                     |
| --------------------- | ------------------------------------------------------- | ------------------------------- |
| 광고 후보 조회        | `placement`, `status`, `start_at`, `end_at`, `priority` | `idx_ad_campaigns_active`       |
| 광고 이벤트 멱등      | `ad_campaign_id`, `event_type`, `request_id`            | `uq_ad_events_request_once`     |
| 광고 성과 집계        | `ad_campaign_id ORDER BY occurred_at DESC`              | `idx_ad_events_campaign`        |
| 관리자 감사 대상 검색 | `target_type`, `target_id ORDER BY created_at DESC`     | `idx_admin_audit_target`        |
| requestId 추적        | `request_id`                                            | `idx_admin_audit_request_id`    |
| 장애 대응 목록        | `status`, `severity`, `detected_at DESC`                | `idx_incidents_status_severity` |

---

## 7. 성능 목표

| 구분                      |                                    목표 |
| ------------------------- | --------------------------------------: |
| 사용자 홈 핵심 조회 p95   |                              300ms 이하 |
| 월별 급여/예산 상세 p95   |                              500ms 이하 |
| 최신 변동지출 목록 p95    |                              400ms 이하 |
| 알림 목록 p95             |                              300ms 이하 |
| 커뮤니티 게시글 목록 p95  |                              500ms 이하 |
| 커뮤니티 댓글 목록 p95    |                              500ms 이하 |
| 광고 후보 조회 p95        |                              150ms 이하 |
| 관리자 감사로그 검색 p95  |                              800ms 이하 |
| 장애/공지 관리자 목록 p95 |                              800ms 이하 |
| 배치/worker poll 쿼리     | 인덱스 scan 또는 bitmap index scan 사용 |

목표 초과가 발생하면 다음 순서로 점검한다.

1. 쿼리 where/order 조건이 정책 인덱스와 일치하는지 확인한다.
2. RLS 조건 때문에 인덱스 선두 컬럼이 무력화되지 않았는지 확인한다.
3. `EXPLAIN (ANALYZE, BUFFERS)`로 sequential scan 여부를 확인한다.
4. 통계가 오래되었으면 `ANALYZE`를 수행한다.
5. 데이터 규모가 파티셔닝 기준을 초과했는지 확인한다.
6. 새 인덱스가 필요한 경우 API 쿼리, 예상 cardinality, 쓰기 영향, rollback 계획을 문서화한다.

---

## 8. 마이그레이션 작성 정책

### 8.1 생성 규칙

모든 인덱스는 다음 형식을 사용한다.

```sql
CREATE INDEX IF NOT EXISTS idx_example
  ON public.example_table (user_id, created_at DESC);
```

unique 인덱스는 다음 형식을 사용한다.

```sql
CREATE UNIQUE INDEX IF NOT EXISTS uq_example_unique
  ON public.example_table (user_id, business_key)
  WHERE deleted_at IS NULL;
```

### 8.2 재실행 안정성

1. `CREATE INDEX IF NOT EXISTS`를 사용한다.
2. seed upsert가 필요한 경우 반드시 unique 또는 exclusion 기준을 먼저 만든다.
3. `ON CONFLICT DO NOTHING`은 실제 conflict target이 존재할 때만 사용한다.
4. partial unique index를 사용하는 경우 `ON CONFLICT (columns) WHERE predicate DO UPDATE` 형식을 맞춘다.
5. 마이그레이션 순서가 필요한 인덱스는 선행 테이블/함수 검증을 둔다.

### 8.3 운영 DB 대형 인덱스

운영 데이터가 이미 많은 테이블에 신규 인덱스를 추가할 때는 일반 `CREATE INDEX` 대신 별도 운영 마이그레이션에서 `CREATE INDEX CONCURRENTLY` 사용을 검토한다. 단, `CREATE INDEX CONCURRENTLY`는 transaction block 안에서 실행할 수 없으므로 일반 마이그레이션과 분리한다.

| 상황               | 정책                                                                  |
| ------------------ | --------------------------------------------------------------------- |
| 초기 구축/빈 DB    | 일반 `CREATE INDEX IF NOT EXISTS` 허용                                |
| 운영 대형 테이블   | 별도 non-transactional migration에서 `CREATE INDEX CONCURRENTLY` 검토 |
| unique 정책 추가   | 중복 데이터 사전 정리 후 적용                                         |
| partial index 추가 | predicate가 실제 쿼리와 일치하는지 검증                               |
| 인덱스 삭제        | rollback script와 성능 영향 검증 후 수행                              |

---

## 9. 금지되는 인덱스 패턴

| 금지 패턴                                                                                | 이유                                     |
| ---------------------------------------------------------------------------------------- | ---------------------------------------- |
| 급여액, 지출액, 저축액, 납치금액을 광고 인덱스에 포함                                    | 재무 원천 데이터와 광고 데이터 분리 위반 |
| 이메일/전화번호 원문 기반 광범위 검색 인덱스                                             | 개인정보 최소 접근 원칙 위반             |
| `memo`, `body`, `payload`, `calculation_input`, `calculation_output` 전체 JSONB GIN 남발 | 민감정보 노출/쓰기 비용 증가             |
| 사용되지 않는 단일 컬럼 인덱스 대량 생성                                                 | 쓰기 성능 저하                           |
| 같은 컬럼 조합 중복 인덱스                                                               | 저장공간/쓰기 비용 낭비                  |
| `ORDER BY`와 반대 방향의 불필요한 인덱스                                                 | 정렬 비용 절감 실패 가능                 |
| 운영 데이터에서 근거 없는 expression index                                               | 유지보수·보안 검토 부담 증가             |

---

## 10. 파티셔닝 연계 기준

인덱스만으로 성능을 보장하기 어려운 규모가 되면 파티셔닝을 검토한다.

| 테이블                          | 기준 컬럼       |           검토 기준 | 권장 인덱스 전략                            |
| ------------------------------- | --------------- | ------------------: | ------------------------------------------- |
| `variable_expenses`             | `spent_at`      |    월 1천만 건 이상 | 월별 partition + local index                |
| `notifications`                 | `created_at`    |    월 5천만 건 이상 | 월별 partition + user/status index          |
| `notification_deliveries`       | `attempted_at`  |    월 5천만 건 이상 | 월별 partition + status retry index         |
| `ad_events`                     | `occurred_at`   |      월 1억 건 이상 | 일/월 partition + campaign/type index       |
| `admin_audit_logs`              | `created_at`    | 장기 운영 누적 증가 | 월별 partition + target/actor/request index |
| `payroll_calculation_snapshots` | `calculated_at` | 장기 운영 누적 증가 | 월별 partition + user/month index           |

---

## 11. 검증 절차

### 11.1 정적 검증

릴리즈 전 다음 항목을 확인한다.

| 검증 항목         | 기준                                                           |
| ----------------- | -------------------------------------------------------------- |
| 필수 인덱스 존재  | 본 문서의 필수 인덱스 전부 존재                                |
| 중복 인덱스       | 동일 컬럼/동일 predicate 중복 없음                             |
| unique 기준       | 비즈니스 불변식과 일치                                         |
| partial predicate | 실제 쿼리 where 조건과 일치                                    |
| 인덱스 이름       | 명명 규칙 준수                                                 |
| 민감정보          | 광고/감사/검색 인덱스에 재무 원천 데이터·토큰·secret 원문 없음 |
| seed 안정성       | upsert conflict target 존재                                    |
| RLS 친화성        | 일반 사용자 조회 인덱스는 `user_id` 기준 포함                  |

### 11.2 실행 계획 검증

핵심 API는 다음 형태로 실행 계획을 확인한다.

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT *
FROM public.variable_expenses
WHERE user_id = $1
ORDER BY spent_at DESC
LIMIT 50;
```

통과 기준은 다음과 같다.

1. 대형 테이블의 주요 목록 조회에서 불필요한 sequential scan이 없어야 한다.
2. `Rows Removed by Filter`가 과도하게 크면 인덱스 컬럼 순서를 재검토한다.
3. `Sort Method: external merge`가 반복되면 order 인덱스를 재검토한다.
4. worker poll 쿼리는 status/time 인덱스를 사용해야 한다.
5. 관리자 검색은 target/request/severity/actor 동선별 인덱스를 사용해야 한다.

### 11.3 운영 검증 SQL

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

```sql
SELECT
  relname AS table_name,
  indexrelname AS index_name,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC, index_name ASC;
```

```sql
SELECT
  indexrelid::regclass AS index_name,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_index
WHERE indrelid IN (
  'public.variable_expenses'::regclass,
  'public.notification_deliveries'::regclass,
  'public.ad_events'::regclass,
  'public.admin_audit_logs'::regclass
)
ORDER BY pg_relation_size(indexrelid) DESC;
```

---

## 12. 인덱스 변경 승인 기준

| 변경 유형               | 승인 기준                                                       |
| ----------------------- | --------------------------------------------------------------- |
| 필수 인덱스 추가        | API 쿼리, ERD, 마이그레이션, 테스트와 함께 승인                 |
| unique 인덱스 추가      | 기존 데이터 중복 검증 후 승인                                   |
| partial 인덱스 추가     | predicate와 실제 query condition 일치 검증 후 승인              |
| 대형 테이블 인덱스 추가 | 운영 부하, lock, migration 방식 검토 후 승인                    |
| 인덱스 삭제             | `pg_stat_user_indexes`, 대체 인덱스, rollback 계획 확인 후 승인 |
| 광고 관련 인덱스 변경   | 재무 원천 데이터 분리, 동의 정책, 개인정보 검토 필수            |
| 감사로그 인덱스 변경    | 보존 정책, 조사 동선, request_id 추적성 검토 필수               |

---

## 13. QA 체크리스트

| 체크 항목 | 완료 기준                                                                                         |
| --------- | ------------------------------------------------------------------------------------------------- |
| 급여 홈   | 현재 월 급여계획 조회가 `idx_payroll_user_status_month` 또는 `idx_payroll_user_month`를 사용한다. |
| 일일예산  | 오늘 예산 조회가 `uq_daily_budget_user_date`를 사용한다.                                          |
| 변동지출  | 최신 지출 목록이 `idx_variable_user_spent`를 사용한다.                                            |
| 재계산    | `daily_budget_id`, `status` 기준 지출 합계가 인덱스를 사용한다.                                   |
| 알림      | 알림 목록과 발송 queue가 인덱스를 사용한다.                                                       |
| LV UP     | 미션 완료 중복 방지가 unique index로 보장된다.                                                    |
| 커뮤니티  | 게시글 목록, 댓글 목록, 인기글, 신고 큐가 인덱스를 사용한다.                                      |
| 광고      | 캠페인 후보 조회와 이벤트 멱등성이 인덱스로 보장된다.                                             |
| 관리자    | 감사로그 target/request/actor 검색이 인덱스를 사용한다.                                           |
| 보안      | 광고/감사/검색 인덱스에 재무 원천 데이터·secret 원문이 포함되지 않는다.                           |

---

## 14. 장애 대응 기준

| 증상                          | 우선 점검 인덱스                                                   | 조치                                |
| ----------------------------- | ------------------------------------------------------------------ | ----------------------------------- |
| 급여 홈 지연                  | `idx_payroll_user_status_month`, `idx_calc_snapshot_user_month`    | query condition과 index 순서 확인   |
| 지출 등록 후 예산 재계산 지연 | `idx_variable_budget`, `idx_variable_active_budget_spent`          | status 조건, row lock 범위 확인     |
| 알림 발송 지연                | `idx_notifications_schedule`, `idx_notification_deliveries_status` | worker batch size와 index scan 확인 |
| 커뮤니티 목록 지연            | `idx_posts_board_status_created`, `idx_posts_popular`              | board/status 조건 누락 확인         |
| 댓글 로딩 지연                | `idx_comments_post_created`                                        | `post_id`, `status` 조건 확인       |
| 광고 후보 조회 지연           | `idx_ad_campaigns_active`                                          | placement/status/period 조건 확인   |
| 광고 성과 집계 지연           | `idx_ad_events_campaign`, partition 검토                           | 집계 기간 제한 및 partition 검토    |
| 감사로그 검색 지연            | `idx_admin_audit_target`, `idx_admin_audit_request_id`             | 검색 조건과 기간 제한 확인          |

---

## 15. 파일 단위 완료 기준

`database/policies/index-policy.md`는 다음 조건을 모두 만족할 때 파일 단위 완료로 본다.

1. `0001_init_users.sql` ~ `0004_admin_audit_ads.sql`의 필수 인덱스가 전부 문서화되어 있다.
2. 급여/예산/지출/저축, 알림, LV UP, 커뮤니티, 광고/제휴, 관리자 운영의 핵심 쿼리 패턴이 인덱스와 연결되어 있다.
3. unique/partial/index naming 정책이 명확하다.
4. RLS와 사용자 소유권 기반 조회 원칙이 명확하다.
5. 광고/제휴와 재무 원천 데이터 분리 원칙이 포함되어 있다.
6. 재실행 가능한 마이그레이션 기준과 seed conflict 기준이 포함되어 있다.
7. 성능 목표, 검증 SQL, QA 체크리스트, 장애 대응 기준이 포함되어 있다.
8. 운영 대형 테이블에 대한 partition 및 concurrent index 기준이 포함되어 있다.
9. 미완료 표식과 임시 메모가 없다.

---

## 16. 최종 판정

이 파일은 급여납치 플랫폼의 `database/policies/index-policy.md` 최종본으로, 사용자별 월별 급여/지출 조회, 게시글 목록, 알림 목록, 관리자 검색 성능뿐 아니라 서버 권위 계산, 광고/제휴 이벤트, 관리자 감사로그, 운영 장애 대응까지 포함하는 인덱스 정책을 정의한다.

파일 단위 기준으로는 문서상·이론상 더 이상 보강할 항목이 없는 최종 정책 문서로 사용할 수 있다. 단, 프로젝트 전체 완성도는 실제 PostgreSQL/Neon 환경에서 마이그레이션 적용, API 쿼리 실행 계획, RLS/RBAC, QA/E2E, CI/CD를 모두 통과했을 때 별도로 판정한다.
