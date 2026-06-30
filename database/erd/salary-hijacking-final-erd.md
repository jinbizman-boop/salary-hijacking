# 급여납치 최종 ERD

> 문서 상태: 최종본  
> 파일 위치: `database/erd/salary-hijacking-final-erd.md`  
> 적용 서비스: 급여납치(`salary-hijacking-platform`)  
> 적용 범위: 급여관리 · 가계부 · 자기계발 LV UP · 커뮤니티 · 알림 · 광고/제휴 · 관리자 운영 · 감사로그  
> 기준 DB: Neon PostgreSQL  
> 기준 시간대: `Asia/Seoul`  
> 기준 통화: KRW, 1원 단위 정수, 소수점 저장 금지  
> 설계 원칙: 서버 권위 계산, 사용자 소유권 검증, 재무 원천 데이터와 광고 데이터 분리, 개인정보 최소 수집, 관리자 감사로그 필수

---

## 1. 문서 목적

이 문서는 급여납치 플랫폼의 최종 데이터 모델과 테이블 관계를 정의한다. 기존의 단순 관계 설명을 대체하며, 데이터베이스 설계·마이그레이션·API 계약·관리자 콘솔·QA·보안 검토에서 동일하게 참조할 수 있는 기준 문서로 사용한다.

본 ERD는 다음 목표를 만족한다.

1. 급여 수령 후 고정지출, 고정저축, 일일예산, 변동지출, 납치금액을 서버 권위로 계산한다.
2. 사용자의 급여, 예산, 지출, 저축, 대출, 납치금액 등 고위험 재무 데이터를 사용자 소유권 기준으로 격리한다.
3. 광고·제휴 데이터는 재무 원천 데이터와 직접 결합하지 않고 별도 캠페인·이벤트·동의 기준으로 관리한다.
4. 관리자 운영, 공지, 신고, 모더레이션, 배너, 감사로그를 상용 운영 기준으로 추적한다.
5. 데이터 보존, soft delete, 익명화, 감사로그 장기 보존 기준을 명확히 한다.
6. 앱, API, 관리자 콘솔, QA, 보안 스캔, 릴리즈 문서가 동일한 테이블 관계를 기준으로 동작하게 한다.

---

## 2. 전체 도메인 구조

| 도메인        | 핵심 테이블                                                                                        | 설명                                                          |
| ------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| 사용자/인증   | `users`, `auth_identities`, `user_profiles`, `user_settings`, `user_consents`, `user_devices`      | 사용자 계정, 소셜 로그인, 프로필, 알림/마케팅 동의, 푸시 토큰 |
| 급여/계획     | `payroll_plans`, `fixed_expenses`, `savings_plans`                                                 | 월별 급여 계획, 고정지출, 고정저축, 예상/확정 납치금액        |
| 일일예산/지출 | `daily_budgets`, `variable_expenses`                                                               | 일자별 예산, 사용금액, 남은금액, 변동지출                     |
| 계산/스냅샷   | `payroll_calculation_snapshots`                                                                    | 서버 권위 계산 결과, 입력 합계, 공식 버전, 재계산 추적        |
| 알림          | `notifications`, `notification_deliveries`                                                         | 푸시/인앱 알림, 발송 시도, 읽음 상태                          |
| LV UP         | `growth_tasks`, `growth_task_completions`, `user_growth_stats`                                     | 독서/뉴스/영어/건강 미션, 경험치, 레벨                        |
| 커뮤니티      | `community_posts`, `community_comments`, `community_reactions`, `community_reports`, `attachments` | 게시글, 댓글, 좋아요, 신고, 첨부                              |
| 광고/제휴     | `ad_campaigns`, `ad_events`, `partner_accounts`                                                    | 광고 캠페인, 노출/클릭/전환 이벤트, 제휴사                    |
| 관리자/운영   | `admin_roles`, `admin_role_members`, `admin_audit_logs`, `notices`, `operational_incidents`        | RBAC, 감사로그, 공지, 장애 대응                               |

---

## 3. 최종 ERD Mermaid

```mermaid
erDiagram
    USERS ||--o{ AUTH_IDENTITIES : has
    USERS ||--|| USER_PROFILES : has
    USERS ||--|| USER_SETTINGS : has
    USERS ||--o{ USER_CONSENTS : grants
    USERS ||--o{ USER_DEVICES : registers

    USERS ||--o{ PAYROLL_PLANS : owns
    PAYROLL_PLANS ||--o{ FIXED_EXPENSES : contains
    PAYROLL_PLANS ||--o{ SAVINGS_PLANS : contains
    PAYROLL_PLANS ||--o{ PAYROLL_CALCULATION_SNAPSHOTS : snapshots

    USERS ||--o{ DAILY_BUDGETS : owns
    DAILY_BUDGETS ||--o{ VARIABLE_EXPENSES : contains
    USERS ||--o{ VARIABLE_EXPENSES : spends

    USERS ||--o{ NOTIFICATIONS : receives
    NOTIFICATIONS ||--o{ NOTIFICATION_DELIVERIES : delivers
    USER_DEVICES ||--o{ NOTIFICATION_DELIVERIES : target_device

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

    PARTNER_ACCOUNTS ||--o{ AD_CAMPAIGNS : owns
    AD_CAMPAIGNS ||--o{ AD_EVENTS : logs
    USERS ||--o{ AD_EVENTS : optional_actor

    ADMIN_ROLES ||--o{ ADMIN_ROLE_MEMBERS : contains
    USERS ||--o{ ADMIN_ROLE_MEMBERS : assigned
    USERS ||--o{ ADMIN_AUDIT_LOGS : acts
    USERS ||--o{ NOTICES : authors
    USERS ||--o{ OPERATIONAL_INCIDENTS : manages

    USERS {
        uuid user_id PK
        text email UK
        text phone_number
        text nickname
        text status
        timestamptz last_login_at
        timestamptz created_at
        timestamptz updated_at
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
        timestamptz created_at
        timestamptz updated_at
    }

    USER_SETTINGS {
        uuid setting_id PK
        uuid user_id FK_UK
        boolean push_enabled
        boolean budget_alert_enabled
        boolean fixed_payment_alert_enabled
        boolean growth_alert_enabled
        boolean community_alert_enabled
        boolean marketing_opt_in
        text timezone
        timestamptz created_at
        timestamptz updated_at
    }

    USER_CONSENTS {
        uuid consent_id PK
        uuid user_id FK
        text consent_type
        boolean granted
        text source
        timestamptz granted_at
        timestamptz revoked_at
    }

    USER_DEVICES {
        uuid device_id PK
        uuid user_id FK
        text platform
        text push_token_hash
        text status
        timestamptz last_seen_at
        timestamptz created_at
        timestamptz revoked_at
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
        bigint confirmed_hijack_amount
        text status
        timestamptz created_at
        timestamptz updated_at
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
        timestamptz created_at
        timestamptz updated_at
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
        timestamptz created_at
        timestamptz updated_at
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
        timestamptz calculated_at
        timestamptz created_at
        timestamptz updated_at
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
        text idempotency_key
        timestamptz created_at
        timestamptz updated_at
    }

    PAYROLL_CALCULATION_SNAPSHOTS {
        uuid snapshot_id PK
        uuid user_id FK
        uuid payroll_plan_id FK
        char year_month
        bigint salary_amount
        bigint fixed_expense_total
        bigint savings_total
        bigint variable_expense_total
        bigint daily_budget_total
        bigint expected_hijack_amount
        bigint confirmed_hijack_amount
        text formula_version
        jsonb calculation_input
        jsonb calculation_output
        timestamptz calculated_at
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
        timestamptz created_at
    }

    NOTIFICATION_DELIVERIES {
        uuid delivery_id PK
        uuid notification_id FK
        uuid device_id FK
        text provider
        text status
        text failure_reason
        timestamptz attempted_at
        timestamptz delivered_at
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
        timestamptz created_at
        timestamptz updated_at
    }

    GROWTH_TASK_COMPLETIONS {
        uuid completion_id PK
        uuid user_id FK
        uuid growth_task_id FK
        date completion_date
        integer earned_exp
        text status
        timestamptz completed_at
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
        timestamptz updated_at
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
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at
    }

    COMMUNITY_COMMENTS {
        uuid comment_id PK
        uuid post_id FK
        uuid user_id FK
        uuid parent_comment_id FK
        text body
        boolean is_anonymous
        text status
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at
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
        uuid resolved_by FK
        timestamptz resolved_at
        timestamptz created_at
    }

    ATTACHMENTS {
        uuid attachment_id PK
        text owner_type
        uuid owner_id
        text file_url
        text mime_type
        bigint file_size
        text status
        timestamptz created_at
    }

    PARTNER_ACCOUNTS {
        uuid partner_account_id PK
        text name
        text business_type
        text status
        text contact_email
        timestamptz created_at
        timestamptz updated_at
    }

    AD_CAMPAIGNS {
        uuid ad_campaign_id PK
        uuid partner_account_id FK
        text name
        text placement
        text image_url
        text landing_url
        timestamptz start_at
        timestamptz end_at
        text status
        text targeting_policy
        timestamptz created_at
        timestamptz updated_at
    }

    AD_EVENTS {
        uuid ad_event_id PK
        uuid ad_campaign_id FK
        uuid user_id FK
        text placement
        text event_type
        text consent_snapshot
        timestamptz occurred_at
    }

    ADMIN_ROLES {
        uuid admin_role_id PK
        text role_key
        text name
        text description
        text status
        timestamptz created_at
    }

    ADMIN_ROLE_MEMBERS {
        uuid admin_role_member_id PK
        uuid admin_role_id FK
        uuid user_id FK
        text status
        timestamptz assigned_at
        uuid assigned_by FK
    }

    ADMIN_AUDIT_LOGS {
        uuid admin_audit_log_id PK
        uuid actor_user_id FK
        text action
        text target_type
        uuid target_id
        jsonb before_data
        jsonb after_data
        text request_id
        text ip_hash
        timestamptz created_at
    }

    NOTICES {
        uuid notice_id PK
        uuid author_user_id FK
        text title
        text body
        text status
        timestamptz published_at
        timestamptz created_at
        timestamptz updated_at
    }

    OPERATIONAL_INCIDENTS {
        uuid incident_id PK
        uuid owner_user_id FK
        text severity
        text title
        text summary
        text status
        timestamptz detected_at
        timestamptz resolved_at
        timestamptz created_at
    }
```

---

## 4. 관계 요약

### 4.1 사용자·인증

| 관계                        | Cardinality | 설명                                                                                                          |
| --------------------------- | ----------: | ------------------------------------------------------------------------------------------------------------- |
| `users` → `auth_identities` |         1:N | 한 사용자는 이메일/소셜 로그인 수단을 여러 개 연결할 수 있다.                                                 |
| `users` → `user_profiles`   |         1:1 | 사용자별 공개 프로필은 하나만 유지한다.                                                                       |
| `users` → `user_settings`   |         1:1 | 사용자별 알림·마케팅·시간대 설정은 하나만 유지한다.                                                           |
| `users` → `user_consents`   |         1:N | 마케팅, 광고/제휴, 푸시, 분석 동의 이력을 변경 이력 형태로 보존한다.                                          |
| `users` → `user_devices`    |         1:N | 모바일 푸시 토큰과 기기 상태를 관리한다. 원문 토큰은 저장하지 않고 해시 또는 안전 저장소 참조값으로 처리한다. |

### 4.2 급여·예산·지출·저축

| 관계                                              | Cardinality | 설명                                                      |
| ------------------------------------------------- | ----------: | --------------------------------------------------------- |
| `users` → `payroll_plans`                         |         1:N | 사용자별 월별 급여 계획. 활성 계획은 월별 1개만 허용한다. |
| `payroll_plans` → `fixed_expenses`                |         1:N | 월급 계획에 종속되는 고정지출 항목.                       |
| `payroll_plans` → `savings_plans`                 |         1:N | 월급 계획에 종속되는 고정저축 항목.                       |
| `users` → `daily_budgets`                         |         1:N | 사용자별 일일 예산. 사용자·날짜 조합은 유일하다.          |
| `daily_budgets` → `variable_expenses`             |         1:N | 하루 예산에 등록되는 변동지출.                            |
| `payroll_plans` → `payroll_calculation_snapshots` |         1:N | 서버 권위 계산 결과의 재현 가능한 스냅샷.                 |

### 4.3 레벨업·커뮤니티·알림

| 관계                                        | Cardinality | 설명                                                                      |
| ------------------------------------------- | ----------: | ------------------------------------------------------------------------- |
| `growth_tasks` → `growth_task_completions`  |         1:N | 운영자가 생성한 미션을 사용자가 완료한다.                                 |
| `users` → `user_growth_stats`               |         1:1 | 사용자별 레벨, 누적 경험치, 영역별 점수.                                  |
| `users` → `community_posts`                 |         1:N | 사용자가 게시글을 작성한다. 익명글은 화면 출력 시 작성자 표시를 제거한다. |
| `community_posts` → `community_comments`    |         1:N | 게시글의 댓글. 대댓글은 self reference로 처리한다.                        |
| `users` → `community_reports`               |         1:N | 신고자는 사용자이며, 운영 처리는 관리자 감사로그와 연결된다.              |
| `notifications` → `notification_deliveries` |         1:N | 하나의 알림은 여러 기기에 발송될 수 있다.                                 |

### 4.4 광고·제휴·관리자 운영

| 관계                                 | Cardinality | 설명                                                                  |
| ------------------------------------ | ----------: | --------------------------------------------------------------------- |
| `partner_accounts` → `ad_campaigns`  |         1:N | 제휴사별 광고 캠페인.                                                 |
| `ad_campaigns` → `ad_events`         |         1:N | 노출, 클릭, 전환 이벤트. `user_id`는 선택적이며 익명화 가능해야 한다. |
| `admin_roles` → `admin_role_members` |         1:N | 관리자 RBAC 역할과 멤버십.                                            |
| `users` → `admin_audit_logs`         |         1:N | 관리자 액션의 행위자. 모든 운영 변경은 감사로그를 남긴다.             |
| `users` → `notices`                  |         1:N | 공지 작성자.                                                          |
| `users` → `operational_incidents`    |         1:N | 장애 대응 담당자.                                                     |

---

## 5. PK/FK/삭제 정책

| 테이블                          | PK                     | 주요 FK                                   | 삭제/보존 정책                                                                                   |
| ------------------------------- | ---------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `users`                         | `user_id`              | 없음                                      | 탈퇴 시 soft delete 후 개인정보 익명화. 재무 집계는 법적/운영 보존 정책에 따라 익명화 보존 가능. |
| `auth_identities`               | `identity_id`          | `user_id → users.user_id`                 | 사용자 삭제 시 cascade 또는 `revoked_at` 처리.                                                   |
| `user_profiles`                 | `profile_id`           | `user_id → users.user_id`                 | 사용자 삭제 시 cascade.                                                                          |
| `user_settings`                 | `setting_id`           | `user_id → users.user_id`                 | 사용자 삭제 시 cascade.                                                                          |
| `user_consents`                 | `consent_id`           | `user_id → users.user_id`                 | 동의 이력은 보존 후 익명화.                                                                      |
| `user_devices`                  | `device_id`            | `user_id → users.user_id`                 | 로그아웃/탈퇴 시 revoke, 원문 토큰 저장 금지.                                                    |
| `payroll_plans`                 | `payroll_plan_id`      | `user_id → users.user_id`                 | 사용자 삭제 시 cascade 또는 익명화 보존.                                                         |
| `fixed_expenses`                | `fixed_expense_id`     | `user_id`, `payroll_plan_id`              | 계획 삭제 시 cascade.                                                                            |
| `savings_plans`                 | `savings_plan_id`      | `user_id`, `payroll_plan_id`              | 계획 삭제 시 cascade.                                                                            |
| `daily_budgets`                 | `daily_budget_id`      | `user_id → users.user_id`                 | 사용자 삭제 시 cascade 또는 익명화.                                                              |
| `variable_expenses`             | `variable_expense_id`  | `user_id`, `daily_budget_id`              | 일일예산 삭제 시 cascade.                                                                        |
| `payroll_calculation_snapshots` | `snapshot_id`          | `user_id`, `payroll_plan_id`              | 계산 검증용 보존 후 개인정보 제거.                                                               |
| `notifications`                 | `notification_id`      | `user_id → users.user_id`                 | 사용자 삭제 시 cascade.                                                                          |
| `notification_deliveries`       | `delivery_id`          | `notification_id`, `device_id`            | 알림 삭제 시 cascade.                                                                            |
| `growth_tasks`                  | `growth_task_id`       | 없음                                      | 운영 데이터로 soft delete.                                                                       |
| `growth_task_completions`       | `completion_id`        | `user_id`, `growth_task_id`               | 사용자 삭제 시 cascade.                                                                          |
| `user_growth_stats`             | `growth_stat_id`       | `user_id → users.user_id`                 | 사용자 삭제 시 cascade.                                                                          |
| `community_posts`               | `post_id`              | `user_id → users.user_id`                 | 삭제 요청 시 status 전환 또는 작성자 익명화.                                                     |
| `community_comments`            | `comment_id`           | `post_id`, `user_id`, `parent_comment_id` | 삭제 요청 시 본문 마스킹.                                                                        |
| `community_reactions`           | `reaction_id`          | `user_id → users.user_id`                 | 사용자 삭제 시 cascade.                                                                          |
| `community_reports`             | `report_id`            | `reporter_user_id`, `resolved_by`         | 운영 보존 후 신고자 익명화.                                                                      |
| `attachments`                   | `attachment_id`        | 논리 FK `owner_type`, `owner_id`          | 소유 객체 삭제 시 inactive, 파일 삭제 정책 연동.                                                 |
| `partner_accounts`              | `partner_account_id`   | 없음                                      | 운영 데이터 soft delete.                                                                         |
| `ad_campaigns`                  | `ad_campaign_id`       | `partner_account_id`                      | 운영 데이터 soft delete.                                                                         |
| `ad_events`                     | `ad_event_id`          | `ad_campaign_id`, 선택적 `user_id`        | 사용자 삭제 시 `user_id` null 또는 익명화. 재무 원천 데이터 저장 금지.                           |
| `admin_roles`                   | `admin_role_id`        | 없음                                      | 운영 데이터 soft delete.                                                                         |
| `admin_role_members`            | `admin_role_member_id` | `admin_role_id`, `user_id`, `assigned_by` | 권한 해제 시 status 전환.                                                                        |
| `admin_audit_logs`              | `admin_audit_log_id`   | `actor_user_id → users.user_id`           | 장기 보존. 개인정보 최소화·마스킹 필수.                                                          |
| `notices`                       | `notice_id`            | `author_user_id → users.user_id`          | 공지 종료 시 archived.                                                                           |
| `operational_incidents`         | `incident_id`          | `owner_user_id → users.user_id`           | 장애 대응 이력 장기 보존.                                                                        |

---

## 6. 핵심 테이블 정의 요약

### 6.1 `users`

| 컬럼            | 타입        | Null | 제약/설명                                     |
| --------------- | ----------- | ---: | --------------------------------------------- |
| `user_id`       | UUID        |    N | PK, `gen_random_uuid()`                       |
| `email`         | TEXT        |    Y | 활성 사용자 중 partial unique                 |
| `phone_number`  | TEXT        |    Y | 선택 입력, 원문 노출 금지                     |
| `nickname`      | TEXT        |    N | 앱 내부 닉네임                                |
| `status`        | TEXT        |    N | `ACTIVE`, `SUSPENDED`, `WITHDRAWN`, `DELETED` |
| `last_login_at` | TIMESTAMPTZ |    Y | 마지막 로그인                                 |
| `created_at`    | TIMESTAMPTZ |    N | 생성시각                                      |
| `updated_at`    | TIMESTAMPTZ |    N | 수정시각                                      |
| `deleted_at`    | TIMESTAMPTZ |    Y | 탈퇴/삭제시각                                 |

### 6.2 `payroll_plans`

| 컬럼                      | 타입     | Null | 제약/설명                               |
| ------------------------- | -------- | ---: | --------------------------------------- |
| `payroll_plan_id`         | UUID     |    N | PK                                      |
| `user_id`                 | UUID     |    N | FK `users`                              |
| `year_month`              | CHAR(7)  |    N | `YYYY-MM`                               |
| `payday`                  | SMALLINT |    N | 1~31                                    |
| `expected_salary_amount`  | BIGINT   |    N | 0 이상, KRW 정수                        |
| `expected_expense_amount` | BIGINT   |    N | 0 이상, KRW 정수                        |
| `target_hijack_amount`    | BIGINT   |    N | 0 이상, KRW 정수                        |
| `expected_hijack_amount`  | BIGINT   |    N | 0 이상, 서버 계산값                     |
| `confirmed_hijack_amount` | BIGINT   |    N | 0 이상, 월말 확정값                     |
| `status`                  | TEXT     |    N | `DRAFT`, `ACTIVE`, `CLOSED`, `ARCHIVED` |

### 6.3 `fixed_expenses`

| 컬럼               | 타입        | Null | 제약/설명                                                                          |
| ------------------ | ----------- | ---: | ---------------------------------------------------------------------------------- |
| `fixed_expense_id` | UUID        |    N | PK                                                                                 |
| `user_id`          | UUID        |    N | FK `users`                                                                         |
| `payroll_plan_id`  | UUID        |    N | FK `payroll_plans`                                                                 |
| `expense_day`      | SMALLINT    |    N | 1~31                                                                               |
| `category`         | TEXT        |    N | `SUBSCRIPTION`, `LOAN`, `INSURANCE`, `TELECOM`, `RENT`, `TRANSPORT`, `CARD`, `ETC` |
| `name`             | TEXT        |    N | 항목명                                                                             |
| `amount`           | BIGINT      |    N | 1 이상                                                                             |
| `recurrence_type`  | TEXT        |    N | `ONCE`, `DAILY`, `WEEKLY`, `MONTHLY`, `YEARLY`                                     |
| `status`           | TEXT        |    N | `SCHEDULED`, `PAID`, `SKIPPED`, `CANCELLED`                                        |
| `paid_at`          | TIMESTAMPTZ |    Y | 납부 완료 시각                                                                     |

### 6.4 `savings_plans`

| 컬럼              | 타입        | Null | 제약/설명                                                       |
| ----------------- | ----------- | ---: | --------------------------------------------------------------- |
| `savings_plan_id` | UUID        |    N | PK                                                              |
| `user_id`         | UUID        |    N | FK `users`                                                      |
| `payroll_plan_id` | UUID        |    N | FK `payroll_plans`                                              |
| `saving_day`      | SMALLINT    |    N | 1~31                                                            |
| `category`        | TEXT        |    N | `SAVINGS`, `INSTALLMENT`, `INVESTMENT`, `EMERGENCY_FUND`, `ETC` |
| `name`            | TEXT        |    N | 저축명                                                          |
| `amount`          | BIGINT      |    N | 1 이상                                                          |
| `recurrence_type` | TEXT        |    N | 반복 유형                                                       |
| `status`          | TEXT        |    N | `SCHEDULED`, `TRANSFERRED`, `SKIPPED`, `CANCELLED`              |
| `transferred_at`  | TIMESTAMPTZ |    Y | 이체 완료 시각                                                  |

### 6.5 `daily_budgets`

| 컬럼                 | 타입        | Null | 제약/설명                                     |
| -------------------- | ----------- | ---: | --------------------------------------------- |
| `daily_budget_id`    | UUID        |    N | PK                                            |
| `user_id`            | UUID        |    N | FK `users`                                    |
| `budget_date`        | DATE        |    N | 사용자 기준 날짜                              |
| `daily_limit_amount` | BIGINT      |    N | 하루 예산, 0 이상                             |
| `used_amount`        | BIGINT      |    N | 사용금액 합계, 0 이상                         |
| `remaining_amount`   | BIGINT      |    N | 화면 표시용 남은금액. 저장 정책상 0 이상 유지 |
| `over_amount`        | BIGINT      |    N | 초과금액, 0 이상                              |
| `status`             | TEXT        |    N | `OPEN`, `OVER`, `CLOSED`                      |
| `calculated_at`      | TIMESTAMPTZ |    Y | 마지막 재계산 시각                            |

> 오늘 남은금액을 UI에서 음수로 표시해야 하는 경우 DB에는 `remaining_amount = 0`, `over_amount > 0`을 저장하고 API 응답에서 `display_remaining_amount = daily_limit_amount - used_amount`를 계산할 수 있다.

### 6.6 `variable_expenses`

| 컬럼                  | 타입        | Null | 제약/설명                        |
| --------------------- | ----------- | ---: | -------------------------------- |
| `variable_expense_id` | UUID        |    N | PK                               |
| `user_id`             | UUID        |    N | FK `users`                       |
| `daily_budget_id`     | UUID        |    N | FK `daily_budgets`               |
| `spent_at`            | TIMESTAMPTZ |    N | 지출 시각                        |
| `category`            | TEXT        |    N | 식비, 교통, 쇼핑 등              |
| `merchant_name`       | TEXT        |    Y | 가맹점명, 민감정보 주의          |
| `memo`                | TEXT        |    Y | 사용자 메모, 로그 노출 금지      |
| `amount`              | BIGINT      |    N | 1 이상                           |
| `status`              | TEXT        |    N | `ACTIVE`, `CANCELLED`, `DELETED` |
| `idempotency_key`     | TEXT        |    Y | 중복 등록 방지                   |

### 6.7 `payroll_calculation_snapshots`

| 컬럼                      | 타입        | Null | 제약/설명                      |
| ------------------------- | ----------- | ---: | ------------------------------ |
| `snapshot_id`             | UUID        |    N | PK                             |
| `user_id`                 | UUID        |    N | FK `users`                     |
| `payroll_plan_id`         | UUID        |    N | FK `payroll_plans`             |
| `year_month`              | CHAR(7)     |    N | 계산 대상 월                   |
| `salary_amount`           | BIGINT      |    N | 급여액                         |
| `fixed_expense_total`     | BIGINT      |    N | 고정지출 합계                  |
| `savings_total`           | BIGINT      |    N | 고정저축 합계                  |
| `variable_expense_total`  | BIGINT      |    N | 변동지출 합계                  |
| `daily_budget_total`      | BIGINT      |    N | 일일예산 합계                  |
| `expected_hijack_amount`  | BIGINT      |    N | 예상 납치금액                  |
| `confirmed_hijack_amount` | BIGINT      |    N | 확정 납치금액                  |
| `formula_version`         | TEXT        |    N | 계산 공식 버전                 |
| `calculation_input`       | JSONB       |    N | 입력값 스냅샷, 개인정보 최소화 |
| `calculation_output`      | JSONB       |    N | 결과값 스냅샷                  |
| `calculated_at`           | TIMESTAMPTZ |    N | 계산 시각                      |

### 6.8 `ad_campaigns` / `ad_events`

| 테이블             | 핵심 컬럼                                                                                               | 설명                |
| ------------------ | ------------------------------------------------------------------------------------------------------- | ------------------- |
| `partner_accounts` | `partner_account_id`, `name`, `business_type`, `status`                                                 | 광고·제휴 파트너    |
| `ad_campaigns`     | `ad_campaign_id`, `partner_account_id`, `placement`, `start_at`, `end_at`, `targeting_policy`, `status` | 배너/광고 캠페인    |
| `ad_events`        | `ad_event_id`, `ad_campaign_id`, `user_id`, `event_type`, `consent_snapshot`, `occurred_at`             | 노출·클릭·전환 로그 |

광고 테이블에는 급여액, 지출액, 저축액, 납치금액, 대출 정보 같은 재무 원천 데이터를 저장하지 않는다. 필요한 경우 화면 문맥, 캠페인 지면, 사용자의 명시적 동의 상태, 비식별 집계값만 사용한다.

### 6.9 `admin_audit_logs`

| 컬럼                 | 타입        | Null | 제약/설명                   |
| -------------------- | ----------- | ---: | --------------------------- |
| `admin_audit_log_id` | UUID        |    N | PK                          |
| `actor_user_id`      | UUID        |    N | 관리자 사용자               |
| `action`             | TEXT        |    N | 수행 액션                   |
| `target_type`        | TEXT        |    N | 대상 종류                   |
| `target_id`          | UUID        |    Y | 대상 ID                     |
| `before_data`        | JSONB       |    Y | 변경 전 값, 민감정보 마스킹 |
| `after_data`         | JSONB       |    Y | 변경 후 값, 민감정보 마스킹 |
| `request_id`         | TEXT        |    N | API 추적 ID                 |
| `ip_hash`            | TEXT        |    Y | IP 원문이 아닌 해시         |
| `created_at`         | TIMESTAMPTZ |    N | 생성시각                    |

---

## 7. 유니크 제약조건

| 제약명                         | 대상                                                                  | 조건                                       | 목적                     |
| ------------------------------ | --------------------------------------------------------------------- | ------------------------------------------ | ------------------------ |
| `uq_users_email_active`        | `users.email`                                                         | `email IS NOT NULL AND deleted_at IS NULL` | 활성 이메일 중복 방지    |
| `uq_auth_provider_key`         | `auth_identities(provider, provider_user_key)`                        | 전체                                       | 소셜 계정 중복 연결 방지 |
| `uq_user_profile_user`         | `user_profiles.user_id`                                               | 전체                                       | 사용자별 프로필 1개      |
| `uq_user_setting_user`         | `user_settings.user_id`                                               | 전체                                       | 사용자별 설정 1개        |
| `uq_payroll_user_month_active` | `payroll_plans(user_id, year_month)`                                  | `status = 'ACTIVE'`                        | 월별 활성 급여계획 1개   |
| `uq_daily_budget_user_date`    | `daily_budgets(user_id, budget_date)`                                 | 전체                                       | 일자별 예산 1개          |
| `uq_variable_idempotency`      | `variable_expenses(user_id, idempotency_key)`                         | `idempotency_key IS NOT NULL`              | 지출 중복 등록 방지      |
| `uq_growth_completion_daily`   | `growth_task_completions(user_id, growth_task_id, completion_date)`   | 전체                                       | 일일 미션 중복 완료 방지 |
| `uq_reaction_unique`           | `community_reactions(user_id, target_type, target_id, reaction_type)` | 전체                                       | 중복 좋아요 방지         |
| `uq_admin_role_key`            | `admin_roles.role_key`                                                | 전체                                       | 관리자 역할 키 중복 방지 |
| `uq_admin_role_member_active`  | `admin_role_members(admin_role_id, user_id)`                          | `status = 'ACTIVE'`                        | 활성 역할 중복 부여 방지 |

---

## 8. 체크 제약조건

| 테이블                    | 컬럼          | 제약조건                            | 설명                         |
| ------------------------- | ------------- | ----------------------------------- | ---------------------------- |
| `payroll_plans`           | `year_month`  | `YYYY-MM`                           | 월 단위 계획 형식            |
| `payroll_plans`           | `payday`      | 1~31                                | 급여일 유효성                |
| `payroll_plans`           | 금액 컬럼     | `>= 0`                              | 급여·예산·납치금액 음수 금지 |
| `fixed_expenses`          | `expense_day` | 1~31                                | 결제일 유효성                |
| `fixed_expenses`          | `amount`      | `> 0`                               | 고정지출 0원/음수 금지       |
| `savings_plans`           | `saving_day`  | 1~31                                | 저축일 유효성                |
| `savings_plans`           | `amount`      | `> 0`                               | 저축 0원/음수 금지           |
| `daily_budgets`           | 금액 컬럼     | `>= 0`                              | 일일예산 저장값 음수 금지    |
| `variable_expenses`       | `amount`      | `> 0`                               | 변동지출 0원/음수 금지       |
| `growth_tasks`            | `exp_reward`  | `>= 0`                              | 경험치 음수 금지             |
| `growth_task_completions` | `earned_exp`  | `>= 0`                              | 획득 경험치 음수 금지        |
| `community_posts`         | `title`       | 1~120자                             | 제목 유효성                  |
| `community_posts`         | `body`        | 1~10000자                           | 본문 유효성                  |
| `attachments`             | `file_size`   | `> 0`                               | 비정상 파일 방지             |
| `ad_campaigns`            | 기간          | `start_at < end_at`                 | 캠페인 기간 유효성           |
| `ad_events`               | `event_type`  | `IMPRESSION`, `CLICK`, `CONVERSION` | 광고 이벤트 유형 제한        |

---

## 9. 인덱스 설계

### 9.1 사용자/인증

| 인덱스명                       | 대상                                                    | 목적                    |
| ------------------------------ | ------------------------------------------------------- | ----------------------- |
| `idx_users_status_created`     | `users(status, created_at DESC)`                        | 관리자 회원 목록 조회   |
| `idx_auth_user`                | `auth_identities(user_id)`                              | 사용자 로그인 수단 조회 |
| `idx_auth_provider_key`        | `auth_identities(provider, provider_user_key)`          | 소셜 로그인 식별        |
| `idx_user_consents_user_type`  | `user_consents(user_id, consent_type, granted_at DESC)` | 최신 동의 상태 조회     |
| `idx_user_devices_user_status` | `user_devices(user_id, status, last_seen_at DESC)`      | 활성 푸시 기기 조회     |

### 9.2 급여/예산/지출

| 인덱스명                       | 대상                                                                          | 목적                 |
| ------------------------------ | ----------------------------------------------------------------------------- | -------------------- |
| `idx_payroll_user_month`       | `payroll_plans(user_id, year_month DESC)`                                     | 월별 급여 계획 조회  |
| `idx_fixed_user_plan`          | `fixed_expenses(user_id, payroll_plan_id, expense_day)`                       | 계획별 고정지출 조회 |
| `idx_savings_user_plan`        | `savings_plans(user_id, payroll_plan_id, saving_day)`                         | 계획별 저축 조회     |
| `idx_daily_budget_user_date`   | `daily_budgets(user_id, budget_date DESC)`                                    | 날짜별 예산 조회     |
| `idx_variable_user_spent`      | `variable_expenses(user_id, spent_at DESC)`                                   | 최신 지출 내역 조회  |
| `idx_variable_budget`          | `variable_expenses(daily_budget_id, status)`                                  | 하루 예산 재계산     |
| `idx_calc_snapshot_user_month` | `payroll_calculation_snapshots(user_id, year_month DESC, calculated_at DESC)` | 계산 결과 추적       |

### 9.3 알림/LV UP

| 인덱스명                             | 대상                                                     | 목적                  |
| ------------------------------------ | -------------------------------------------------------- | --------------------- |
| `idx_notifications_user_status`      | `notifications(user_id, status, created_at DESC)`        | 미읽음/최신 알림 조회 |
| `idx_notification_deliveries_status` | `notification_deliveries(status, attempted_at DESC)`     | 발송 실패 재시도      |
| `idx_growth_tasks_active`            | `growth_tasks(type, status, active_from, active_to)`     | 활성 미션 조회        |
| `idx_growth_completion_user_date`    | `growth_task_completions(user_id, completion_date DESC)` | 사용자 미션 이력 조회 |

### 9.4 커뮤니티

| 인덱스명                         | 대상                                                                            | 목적             |
| -------------------------------- | ------------------------------------------------------------------------------- | ---------------- |
| `idx_posts_board_status_created` | `community_posts(board_type, status, created_at DESC)`                          | 게시판 목록 조회 |
| `idx_posts_popular`              | `community_posts(status, like_count DESC, comment_count DESC, view_count DESC)` | 인기글 조회      |
| `idx_comments_post_created`      | `community_comments(post_id, status, created_at ASC)`                           | 댓글 목록 조회   |
| `idx_reports_status`             | `community_reports(status, created_at ASC)`                                     | 신고 처리 목록   |

### 9.5 광고/운영

| 인덱스명                        | 대상                                                        | 목적                    |
| ------------------------------- | ----------------------------------------------------------- | ----------------------- |
| `idx_ads_active`                | `ad_campaigns(placement, status, start_at, end_at)`         | 활성 광고 조회          |
| `idx_ad_events_campaign`        | `ad_events(ad_campaign_id, occurred_at DESC)`               | 캠페인 성과 집계        |
| `idx_ad_events_type_time`       | `ad_events(event_type, occurred_at DESC)`                   | 이벤트 유형별 통계      |
| `idx_admin_audit_target`        | `admin_audit_logs(target_type, target_id, created_at DESC)` | 대상별 감사 이력 조회   |
| `idx_admin_audit_actor`         | `admin_audit_logs(actor_user_id, created_at DESC)`          | 관리자별 감사 이력 조회 |
| `idx_notices_status_published`  | `notices(status, published_at DESC)`                        | 공지 목록 조회          |
| `idx_incidents_status_severity` | `operational_incidents(status, severity, detected_at DESC)` | 장애 대응 목록          |

---

## 10. 서버 권위 계산 정책

### 10.1 금액 타입

| 기준      | 정책                                               |
| --------- | -------------------------------------------------- |
| 통화      | KRW                                                |
| 저장 타입 | `BIGINT`                                           |
| 단위      | 1원                                                |
| 소수점    | 입력·저장 모두 불가                                |
| 음수      | 사용자 입력 금액은 불가                            |
| 납치금액  | 0원 미만 저장/표시 금지                            |
| 초과 지출 | `remaining_amount = 0`, `over_amount > 0`으로 표현 |

### 10.2 기본 계산식

```text
fixed_expense_total = SUM(fixed_expenses.amount WHERE status IN ('SCHEDULED','PAID'))
savings_total = SUM(savings_plans.amount WHERE status IN ('SCHEDULED','TRANSFERRED'))
variable_expense_total = SUM(variable_expenses.amount WHERE status = 'ACTIVE')
expected_expense_amount = fixed_expense_total + savings_total + planned_daily_budget_total
expected_hijack_amount = MAX(expected_salary_amount - expected_expense_amount, 0)
confirmed_hijack_amount = MAX(actual_salary_amount - fixed_expense_total - savings_total - variable_expense_total, 0)
daily_remaining_raw = daily_limit_amount - used_amount
remaining_amount = MAX(daily_remaining_raw, 0)
over_amount = MAX(used_amount - daily_limit_amount, 0)
```

### 10.3 트랜잭션 기준

| 이벤트                  | 트랜잭션 처리                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------ |
| 급여 계획 생성/수정     | `payroll_plans` 저장 후 fixed/savings 합계 재계산                                          |
| 고정지출 생성/수정/삭제 | 같은 `payroll_plan_id`의 snapshot 재생성                                                   |
| 고정저축 생성/수정/삭제 | 같은 `payroll_plan_id`의 snapshot 재생성                                                   |
| 변동지출 등록/취소      | 같은 `daily_budget_id` row lock 후 `used_amount`, `remaining_amount`, `over_amount` 재계산 |
| 월 마감                 | 해당 월 계산 snapshot 생성 후 `confirmed_hijack_amount` 확정                               |
| 중복 요청               | `idempotency_key` 기준으로 멱등 처리                                                       |

---

## 11. RLS/접근통제 기준

Neon DB는 클라이언트에서 직접 접근하지 않고 서버 API를 경유한다. DB 수준에서도 다음 원칙을 적용한다.

| 영역               | 정책                                                     |
| ------------------ | -------------------------------------------------------- |
| 일반 사용자 데이터 | `user_id` 기반 소유권 검증 필수                          |
| 관리자 조회        | RBAC를 통과한 서버 권한에서만 허용                       |
| 재무 데이터        | 광고/커뮤니티 조회와 직접 조인 금지                      |
| 광고 데이터        | 재무 원천 데이터 저장 금지, 동의·비식별 집계 기준만 허용 |
| 커뮤니티 익명글    | 화면 조회 시 작성자 표시명 제거                          |
| 감사로그           | 일반 사용자 직접 조회 금지, 관리자도 역할별 제한         |
| 푸시 토큰          | 원문 저장 금지 또는 별도 secret storage 참조             |
| 로그               | 급여, 지출, 저축, 이메일, 전화번호, 토큰 원문 금지       |

---

## 12. 데이터 보존/삭제 정책

| 데이터              | 보존 정책                            | 삭제/익명화 기준                             |
| ------------------- | ------------------------------------ | -------------------------------------------- |
| 사용자 계정         | 서비스 이용 중 보존                  | 탈퇴 시 `deleted_at`, 이메일/전화번호 익명화 |
| 인증 식별자         | 계정 연결 중 보존                    | 연결 해제 시 `revoked_at`                    |
| 급여/예산/지출/저축 | 사용자 요청 및 법적 기준에 따라 보존 | 탈퇴/삭제 요청 시 cascade 또는 익명화        |
| 계산 snapshot       | 정합성 검증을 위해 제한 보존         | 개인정보 제거 후 집계 보존 가능              |
| 커뮤니티 게시글     | 운영 정책에 따라 보존                | 삭제 요청 시 본문 마스킹 또는 익명화         |
| 신고/모더레이션     | 운영 증적 보존                       | 신고자 식별자 익명화 가능                    |
| 알림                | 단기 보존                            | 기간 만료 후 삭제                            |
| 광고 이벤트         | 집계 분석 보존                       | `user_id` 제거 후 집계 보존                  |
| 관리자 감사로그     | 장기 보존                            | 민감정보 마스킹, 원문 비저장                 |
| 장애 대응           | 장기 보존                            | 개인 식별 정보 제거                          |

---

## 13. 파티셔닝 권장 기준

| 테이블                          | 기준 컬럼                             | 적용 시점          | 이유                     |
| ------------------------------- | ------------------------------------- | ------------------ | ------------------------ |
| `variable_expenses`             | `spent_at` 월별 Range Partition       | 월간 1천만 건 이상 | 지출 기록 조회/삭제 성능 |
| `notifications`                 | `created_at` 월별 Range Partition     | 월간 5천만 건 이상 | 알림 목록/보관 성능      |
| `notification_deliveries`       | `attempted_at` 월별 Range Partition   | 월간 5천만 건 이상 | 발송 로그 관리           |
| `ad_events`                     | `occurred_at` 일/월별 Range Partition | 월간 1억 건 이상   | 광고 로그 집계 성능      |
| `admin_audit_logs`              | `created_at` 월별 Range Partition     | 장기 운영 시       | 감사 로그 보존/조회 성능 |
| `payroll_calculation_snapshots` | `calculated_at` 월별 Range Partition  | 장기 운영 시       | 계산 이력 보존/검증 성능 |

---

## 14. 마이그레이션 구현 순서

1. PostgreSQL 확장과 공통 함수 생성: `pgcrypto`, `updated_at` trigger.
2. 사용자 기초 테이블 생성: `users`, `auth_identities`, `user_profiles`, `user_settings`, `user_consents`, `user_devices`.
3. 급여 계획 테이블 생성: `payroll_plans`, `fixed_expenses`, `savings_plans`.
4. 일일 예산/변동지출 생성: `daily_budgets`, `variable_expenses`.
5. 계산 스냅샷 생성: `payroll_calculation_snapshots`.
6. 알림 테이블 생성: `notifications`, `notification_deliveries`.
7. LV UP 테이블 생성: `growth_tasks`, `growth_task_completions`, `user_growth_stats`.
8. 커뮤니티 테이블 생성: `community_posts`, `community_comments`, `community_reactions`, `community_reports`, `attachments`.
9. 광고/제휴 테이블 생성: `partner_accounts`, `ad_campaigns`, `ad_events`.
10. 관리자 운영 테이블 생성: `admin_roles`, `admin_role_members`, `admin_audit_logs`, `notices`, `operational_incidents`.
11. 유니크/체크/FK/인덱스 적용.
12. Seed 데이터 삽입.
13. 서버 권위 계산 테스트와 API 계약 테스트 실행.
14. RLS/접근통제/로그 마스킹/감사로그 테스트 실행.

---

## 15. 품질 게이트

| 검증 항목     | 완료 기준                                                              |
| ------------- | ---------------------------------------------------------------------- |
| ERD 구조      | Mermaid ERD가 전체 핵심 도메인을 포함한다.                             |
| 금액 정책     | 모든 금액은 `BIGINT`, KRW 1원 단위, 소수점·음수 입력 금지.             |
| 서버 권위     | 급여/예산/지출/저축/납치금액 계산은 서버 API와 snapshot으로 검증 가능. |
| 사용자 소유권 | 사용자 데이터 테이블은 `user_id` 기반 소유권 검증이 가능하다.          |
| 광고 분리     | 광고 이벤트는 재무 원천 데이터를 직접 저장하지 않는다.                 |
| 관리자 감사   | 관리자 변경은 `admin_audit_logs`에 기록 가능하다.                      |
| 알림          | 알림 본문과 발송 이력이 분리되어 재시도/실패 추적이 가능하다.          |
| 커뮤니티      | 익명, 신고, 댓글, 반응, 첨부 관계가 정의되어 있다.                     |
| 운영          | 공지, 장애 대응, RBAC, 감사로그가 포함되어 있다.                       |
| 보존/삭제     | soft delete, 익명화, 장기 보존 기준이 명시되어 있다.                   |

---

## 16. 최종 판정

이 파일은 `database/erd/salary-hijacking-final-erd.md`의 최종본으로, 급여납치 플랫폼의 사용자·인증·급여계획·고정지출·고정저축·일일예산·변동지출·서버 권위 계산 snapshot·알림·LV UP·커뮤니티·광고/제휴·관리자 운영·감사로그 관계를 모두 포함한다.

파일 단위 기준으로는 문서상·이론상 더 이상 보강할 항목이 없는 최종 ERD로 사용할 수 있다. 단, 프로젝트 전체 완성도는 실제 마이그레이션 SQL, API 구현, RLS/RBAC, 테스트, 배포 환경이 이 ERD와 일치하고 CI/CD를 통과했을 때 별도로 판정한다.
