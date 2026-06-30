# 02. ERD 최종본

> 문서 상태: 최종본  
> 적용 서비스: 급여납치(Salary Hijacking) 모바일 플랫폼  
> 적용 범위: 급여관리 · 가계부 · 자기계발 레벨업 · 커뮤니티 · 알림 · 광고/제휴 · 운영 데이터  
> 기준 DB: Neon DB / PostgreSQL  
> 기준일: 2026-06-15  
> 원칙: 본 문서는 문서상·이론상 추가 작업 없이 구현 기준으로 사용할 수 있도록 완결된 기준값, 필드, 관계, 정책, 예외를 포함한다.

## 1. 문서 목적

본 문서는 급여납치 플랫폼의 Neon DB/PostgreSQL 구현을 위한 ERD, 테이블 관계, PK/FK, 인덱스, 제약조건, 삭제 정책을 정의한다.

## 2. ERD 전체 구조

```mermaid
erDiagram
    USERS ||--o{ AUTH_IDENTITIES : has
    USERS ||--|| USER_PROFILES : has
    USERS ||--|| USER_SETTINGS : has
    USERS ||--o{ PAYROLL_PLANS : owns
    PAYROLL_PLANS ||--o{ FIXED_EXPENSES : contains
    PAYROLL_PLANS ||--o{ SAVINGS_PLANS : contains
    USERS ||--o{ DAILY_BUDGETS : owns
    DAILY_BUDGETS ||--o{ VARIABLE_EXPENSES : contains
    USERS ||--o{ NOTIFICATIONS : receives
    USERS ||--|| USER_GROWTH_STATS : has
    GROWTH_TASKS ||--o{ GROWTH_TASK_COMPLETIONS : completed_by
    USERS ||--o{ GROWTH_TASK_COMPLETIONS : completes
    USERS ||--o{ COMMUNITY_POSTS : writes
    COMMUNITY_POSTS ||--o{ COMMUNITY_COMMENTS : has
    COMMUNITY_COMMENTS ||--o{ COMMUNITY_COMMENTS : replies
    USERS ||--o{ COMMUNITY_COMMENTS : writes
    USERS ||--o{ COMMUNITY_REACTIONS : reacts
    USERS ||--o{ COMMUNITY_REPORTS : reports
    COMMUNITY_POSTS ||--o{ ATTACHMENTS : owns
    COMMUNITY_COMMENTS ||--o{ ATTACHMENTS : owns
    AD_CAMPAIGNS ||--o{ AD_IMPRESSIONS : logs
    USERS ||--o{ AD_IMPRESSIONS : sees
    USERS ||--o{ AUDIT_LOGS : acts

    USERS {
        uuid user_id PK
        text email UK
        text phone_number
        text nickname
        text status
        timestamptz created_at
        timestamptz last_login_at
        timestamptz deleted_at
    }
    AUTH_IDENTITIES {
        uuid identity_id PK
        uuid user_id FK
        text provider
        text provider_user_key
        text email
        timestamptz linked_at
        timestamptz revoked_at
    }
    USER_PROFILES {
        uuid profile_id PK
        uuid user_id FK_UK
        text display_name
        text job_title
        text profile_image_url
        text bio
    }
    USER_SETTINGS {
        uuid setting_id PK
        uuid user_id FK_UK
        boolean push_enabled
        boolean budget_alert_enabled
        boolean growth_alert_enabled
        boolean marketing_opt_in
    }
    PAYROLL_PLANS {
        uuid payroll_plan_id PK
        uuid user_id FK
        char year_month
        smallint payday
        bigint expected_salary_amount
        bigint expected_expense_amount
        bigint target_hijack_amount
        bigint expected_hijack_amount
        text status
    }
    FIXED_EXPENSES {
        uuid fixed_expense_id PK
        uuid user_id FK
        uuid payroll_plan_id FK
        smallint expense_day
        text category
        text name
        bigint amount
        text recurrence_type
        text status
        timestamptz paid_at
    }
    SAVINGS_PLANS {
        uuid savings_plan_id PK
        uuid user_id FK
        uuid payroll_plan_id FK
        smallint saving_day
        text category
        text name
        bigint amount
        text recurrence_type
        text status
        timestamptz transferred_at
    }
    DAILY_BUDGETS {
        uuid daily_budget_id PK
        uuid user_id FK
        date budget_date
        bigint daily_limit_amount
        bigint used_amount
        bigint remaining_amount
        bigint over_amount
        text status
    }
    VARIABLE_EXPENSES {
        uuid variable_expense_id PK
        uuid user_id FK
        uuid daily_budget_id FK
        timestamptz spent_at
        text category
        text merchant_name
        text memo
        bigint amount
        text status
    }
    NOTIFICATIONS {
        uuid notification_id PK
        uuid user_id FK
        text type
        text title
        text body
        text target_screen
        text status
        timestamptz scheduled_at
        timestamptz sent_at
        timestamptz read_at
    }
    GROWTH_TASKS {
        uuid growth_task_id PK
        text type
        text title
        text description
        integer exp_reward
        timestamptz active_from
        timestamptz active_to
        text status
    }
    GROWTH_TASK_COMPLETIONS {
        uuid completion_id PK
        uuid user_id FK
        uuid growth_task_id FK
        date completion_date
        integer earned_exp
        text status
    }
    USER_GROWTH_STATS {
        uuid growth_stat_id PK
        uuid user_id FK_UK
        integer level
        integer current_exp
        integer total_exp
        integer reading_score
        integer news_score
        integer english_score
        integer health_score
    }
    COMMUNITY_POSTS {
        uuid post_id PK
        uuid user_id FK
        text board_type
        text title
        text body
        boolean is_anonymous
        boolean is_question
        integer view_count
        integer like_count
        integer comment_count
        integer share_count
        text status
    }
    COMMUNITY_COMMENTS {
        uuid comment_id PK
        uuid post_id FK
        uuid user_id FK
        uuid parent_comment_id FK
        text body
        boolean is_anonymous
        text status
    }
    COMMUNITY_REACTIONS {
        uuid reaction_id PK
        uuid user_id FK
        text target_type
        uuid target_id
        text reaction_type
        timestamptz created_at
    }
    COMMUNITY_REPORTS {
        uuid report_id PK
        uuid reporter_user_id FK
        text target_type
        uuid target_id
        text reason_code
        text detail
        text status
        timestamptz resolved_at
    }
    ATTACHMENTS {
        uuid attachment_id PK
        text owner_type
        uuid owner_id
        text file_url
        text mime_type
        bigint file_size
        text status
    }
    AD_CAMPAIGNS {
        uuid ad_campaign_id PK
        text name
        text placement
        text image_url
        text landing_url
        timestamptz start_at
        timestamptz end_at
        text status
    }
    AD_IMPRESSIONS {
        uuid ad_impression_id PK
        uuid ad_campaign_id FK
        uuid user_id FK
        text placement
        text event_type
        timestamptz occurred_at
    }
    AUDIT_LOGS {
        uuid audit_log_id PK
        uuid actor_user_id FK
        text action
        text target_type
        uuid target_id
        jsonb before_data
        jsonb after_data
        timestamptz created_at
    }
```

## 3. PK/FK 기준

| 테이블                  | PK                  | FK                                  | 삭제 정책                                         |
| ----------------------- | ------------------- | ----------------------------------- | ------------------------------------------------- |
| users                   | user_id             | 없음                                | 탈퇴 시 soft delete 후 개인정보 익명화            |
| auth_identities         | identity_id         | user_id → users.user_id             | User 삭제 시 cascade 또는 revoked 처리            |
| user_profiles           | profile_id          | user_id → users.user_id             | User 삭제 시 cascade                              |
| user_settings           | setting_id          | user_id → users.user_id             | User 삭제 시 cascade                              |
| payroll_plans           | payroll_plan_id     | user_id → users.user_id             | User 삭제 시 cascade 또는 보존 정책에 따른 익명화 |
| fixed_expenses          | fixed_expense_id    | user_id, payroll_plan_id            | PayrollPlan 삭제 시 cascade                       |
| savings_plans           | savings_plan_id     | user_id, payroll_plan_id            | PayrollPlan 삭제 시 cascade                       |
| daily_budgets           | daily_budget_id     | user_id → users.user_id             | User 삭제 시 cascade                              |
| variable_expenses       | variable_expense_id | user_id, daily_budget_id            | DailyBudget 삭제 시 cascade                       |
| notifications           | notification_id     | user_id → users.user_id             | User 삭제 시 cascade                              |
| growth_tasks            | growth_task_id      | 없음                                | 운영 데이터, soft delete                          |
| growth_task_completions | completion_id       | user_id, growth_task_id             | User 삭제 시 cascade                              |
| user_growth_stats       | growth_stat_id      | user_id → users.user_id             | User 삭제 시 cascade                              |
| community_posts         | post_id             | user_id → users.user_id             | 삭제 요청 시 status 전환 또는 익명화              |
| community_comments      | comment_id          | post_id, user_id, parent_comment_id | 삭제 요청 시 본문 마스킹                          |
| community_reactions     | reaction_id         | user_id → users.user_id             | User 삭제 시 cascade                              |
| community_reports       | report_id           | reporter_user_id → users.user_id    | 운영 보존 후 익명화                               |
| attachments             | attachment_id       | owner_id 논리 FK                    | 소유 객체 삭제 시 inactive                        |
| ad_campaigns            | ad_campaign_id      | 없음                                | 운영 데이터, soft delete                          |
| ad_impressions          | ad_impression_id    | ad_campaign_id, user_id             | 사용자 삭제 시 user_id null 또는 익명화           |
| audit_logs              | audit_log_id        | actor_user_id → users.user_id       | 장기 보존, 개인정보 최소화                        |

## 4. 필수 유니크 제약조건

| 제약명                       | 대상                                                                  | 조건                                       | 목적                         |
| ---------------------------- | --------------------------------------------------------------------- | ------------------------------------------ | ---------------------------- |
| uq_users_email_active        | users.email                                                           | `email IS NOT NULL AND deleted_at IS NULL` | 활성 이메일 중복 방지        |
| uq_auth_provider_key         | auth_identities.provider + provider_user_key                          | 전체                                       | 소셜 계정 중복 연결 방지     |
| uq_user_profile_user         | user_profiles.user_id                                                 | 전체                                       | 사용자별 프로필 1개 유지     |
| uq_user_setting_user         | user_settings.user_id                                                 | 전체                                       | 사용자별 설정 1개 유지       |
| uq_payroll_user_month_active | payroll_plans.user_id + year_month                                    | `status='ACTIVE'`                          | 월별 활성 급여 계획 1개 유지 |
| uq_daily_budget_user_date    | daily_budgets.user_id + budget_date                                   | 전체                                       | 일자별 예산 1개 유지         |
| uq_growth_completion_daily   | growth_task_completions.user_id + growth_task_id + completion_date    | 전체                                       | 일일 미션 중복 완료 방지     |
| uq_reaction_unique           | community_reactions.user_id + target_type + target_id + reaction_type | 전체                                       | 중복 좋아요 방지             |

## 5. 필수 체크 제약조건

| 테이블            | 컬럼                    | 제약조건       | 설명                     |
| ----------------- | ----------------------- | -------------- | ------------------------ |
| payroll_plans     | payday                  | 1~31           | 급여일 유효성            |
| payroll_plans     | expected_salary_amount  | >= 0           | 급여 음수 금지           |
| payroll_plans     | expected_expense_amount | >= 0           | 지출 예정 금액 음수 금지 |
| payroll_plans     | target_hijack_amount    | >= 0           | 목표 납치금액 음수 금지  |
| fixed_expenses    | expense_day             | 1~31           | 결제일 유효성            |
| fixed_expenses    | amount                  | > 0            | 고정지출 0원/음수 금지   |
| savings_plans     | saving_day              | 1~31           | 저축일 유효성            |
| savings_plans     | amount                  | > 0            | 저축금액 0원/음수 금지   |
| daily_budgets     | daily_limit_amount      | >= 0           | 하루 예산 음수 금지      |
| daily_budgets     | used_amount             | >= 0           | 사용금액 음수 금지       |
| daily_budgets     | remaining_amount        | >= 0           | 남은금액 음수 저장 금지  |
| daily_budgets     | over_amount             | >= 0           | 초과금액 음수 저장 금지  |
| variable_expenses | amount                  | > 0            | 변동지출 0원/음수 금지   |
| growth_tasks      | exp_reward              | >= 0           | 경험치 음수 금지         |
| community_posts   | title                   | length 1~120   | 제목 유효성              |
| community_posts   | body                    | length 1~10000 | 본문 유효성              |
| attachments       | file_size               | > 0            | 비정상 파일 방지         |

## 6. 인덱스 설계

### 6.1 회원/인증

| 인덱스명                 | 대상                                         | 목적                    |
| ------------------------ | -------------------------------------------- | ----------------------- |
| idx_users_status_created | users(status, created_at DESC)               | 운영자 회원 목록 조회   |
| idx_auth_user            | auth_identities(user_id)                     | 사용자 로그인 수단 조회 |
| idx_auth_provider_key    | auth_identities(provider, provider_user_key) | 소셜 로그인 식별        |

### 6.2 급여/지출/예산

| 인덱스명                   | 대상                                                  | 목적                 |
| -------------------------- | ----------------------------------------------------- | -------------------- |
| idx_payroll_user_month     | payroll_plans(user_id, year_month DESC)               | 월별 급여 계획 조회  |
| idx_fixed_user_plan        | fixed_expenses(user_id, payroll_plan_id, expense_day) | 계획별 고정지출 조회 |
| idx_savings_user_plan      | savings_plans(user_id, payroll_plan_id, saving_day)   | 계획별 저축 조회     |
| idx_daily_budget_user_date | daily_budgets(user_id, budget_date DESC)              | 날짜별 예산 조회     |
| idx_variable_user_spent    | variable_expenses(user_id, spent_at DESC)             | 최신 지출 내역 조회  |
| idx_variable_budget        | variable_expenses(daily_budget_id, status)            | 하루 예산 재계산     |

### 6.3 알림/레벨업

| 인덱스명                        | 대상                                                   | 목적                  |
| ------------------------------- | ------------------------------------------------------ | --------------------- |
| idx_notifications_user_status   | notifications(user_id, status, created_at DESC)        | 미읽음/최신 알림 조회 |
| idx_growth_tasks_active         | growth_tasks(type, status, active_from, active_to)     | 활성 미션 조회        |
| idx_growth_completion_user_date | growth_task_completions(user_id, completion_date DESC) | 사용자 미션 이력 조회 |

### 6.4 커뮤니티

| 인덱스명                       | 대상                                                                          | 목적             |
| ------------------------------ | ----------------------------------------------------------------------------- | ---------------- |
| idx_posts_board_status_created | community_posts(board_type, status, created_at DESC)                          | 게시판 목록 조회 |
| idx_posts_popular              | community_posts(status, like_count DESC, comment_count DESC, view_count DESC) | 인기글 조회      |
| idx_comments_post_created      | community_comments(post_id, status, created_at ASC)                           | 댓글 목록 조회   |
| idx_reports_status             | community_reports(status, created_at ASC)                                     | 신고 처리 목록   |

### 6.5 광고/운영

| 인덱스명                    | 대상                                                | 목적                  |
| --------------------------- | --------------------------------------------------- | --------------------- |
| idx_ads_active              | ad_campaigns(placement, status, start_at, end_at)   | 활성 광고 조회        |
| idx_ad_impressions_campaign | ad_impressions(ad_campaign_id, occurred_at DESC)    | 캠페인 성과 집계      |
| idx_audit_target            | audit_logs(target_type, target_id, created_at DESC) | 대상별 감사 이력 조회 |

## 7. 권장 파티셔닝 기준

| 테이블            | 파티셔닝 기준                         | 적용 시점          | 이유                     |
| ----------------- | ------------------------------------- | ------------------ | ------------------------ |
| variable_expenses | `spent_at` 월별 Range Partition       | 월간 1천만 건 이상 | 지출 기록 조회/삭제 성능 |
| notifications     | `created_at` 월별 Range Partition     | 월간 5천만 건 이상 | 알림 목록/보관 성능      |
| ad_impressions    | `occurred_at` 일/월별 Range Partition | 월간 1억 건 이상   | 광고 로그 집계 성능      |
| audit_logs        | `created_at` 월별 Range Partition     | 장기 운영 시       | 감사 로그 보존/조회 성능 |

## 8. RLS/접근통제 기준

Neon DB를 직접 클라이언트에서 접근하지 않고 서버 API를 경유하는 구조를 기본으로 한다. 다만 DB 수준 보호를 위해 다음 원칙을 적용한다.

| 기준               | 정책                                         |
| ------------------ | -------------------------------------------- |
| 일반 사용자 데이터 | `user_id` 기반 소유권 검증 필수              |
| 운영자 조회        | 관리자 권한 테이블 또는 서버 권한에서만 허용 |
| 재무 데이터        | 일반 광고/커뮤니티 쿼리에서 조인 금지        |
| 커뮤니티 익명글    | 화면 조회 시 작성자 표시명 제거              |
| 감사 로그          | 일반 사용자 직접 조회 금지                   |

## 9. 최종 구현 순서

1. UUID 확장 및 공통 enum/check 정책 생성
2. users, auth_identities, user_profiles, user_settings 생성
3. payroll_plans, fixed_expenses, savings_plans 생성
4. daily_budgets, variable_expenses 생성
5. notifications 생성
6. growth_tasks, completions, stats 생성
7. community_posts, comments, reactions, reports, attachments 생성
8. ad_campaigns, ad_impressions, audit_logs 생성
9. 인덱스/유니크/체크 제약조건 적용
10. 샘플 데이터 삽입 및 쿼리 검증
