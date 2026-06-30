# services/api/src/repositories

> 문서 상태: 최종본  
> 서비스 최종 파일 위치: `services/api/src/repositories/README.md`  
> 프로젝트: 급여납치 Salary Hijacking Platform  
> 적용 범위: API Repository 계층 전체  
> 런타임: Cloudflare Workers  
> API Framework: Hono  
> DB: Neon PostgreSQL / PostgreSQL  
> ORM/Query 기준: Drizzle ORM 또는 PostgreSQL 타입 안전 쿼리 계층  
> 언어 기준: TypeScript strict mode  
> 기준 시간대: `Asia/Seoul`  
> 기준 통화: KRW, 1원 단위 정수

---

## 1. 목적

`services/api/src/repositories`는 급여납치 API 서버에서 데이터베이스 접근을 담당하는 영속성 계층이다. 이 계층은 라우트와 서비스가 직접 SQL, 테이블명, RLS 컨텍스트, soft delete 조건, 페이징 조건, 감사 추적에 필요한 저장 규칙을 반복 구현하지 않도록 단일 데이터 접근 계약을 제공한다.

급여납치 플랫폼은 급여관리, 가계부, 자기계발 LV UP, 커뮤니티, 알림, 광고/제휴, 관리자 운영 데이터를 다룬다. 특히 급여액, 대출, 저축, 지출, 일일예산, 납치금액, 계산 스냅샷은 고위험 재무성 개인정보로 분류되므로 Repository 계층은 다음 원칙을 반드시 지켜야 한다.

1. 모든 사용자 생성 데이터는 `user_id` 소유권을 기준으로 조회·변경한다.
2. 금액은 KRW 1원 단위 정수로만 저장하고 소수점, 음수 입력, 임의 반올림을 허용하지 않는다.
3. 급여·예산·지출·저축 계산 확정값은 서버 권위 계산 결과만 저장한다.
4. 광고/제휴 데이터는 급여·대출·저축·지출 원천 데이터와 직접 결합하지 않는다.
5. 관리자 변경 작업은 감사로그와 연결될 수 있도록 `requestId`, `actorUserId`, `reason` 전달 경로를 보존한다.
6. Repository는 HTTP 응답을 만들지 않고, 도메인 오류를 던지거나 `Result` 형태의 데이터만 반환한다.

---

## 2. 계층 내 위치

```text
Routes
  └─ Validators
      └─ Services
          ├─ Policies
          ├─ Calculators
          └─ Repositories
              └─ Neon PostgreSQL
```

Repository는 데이터 접근만 담당한다. 인증, 인가, 요청 검증, 비즈니스 계산, 알림 발송, 파일 서명 URL 생성, 외부 API 호출은 Repository 책임이 아니다.

| 계층            | 책임                                 | Repository와의 관계                          |
| --------------- | ------------------------------------ | -------------------------------------------- |
| `routes/`       | HTTP endpoint, request/response 연결 | Repository 직접 호출 금지                    |
| `validators/`   | Zod 기반 입력 검증                   | 검증 완료 DTO를 service로 전달               |
| `services/`     | 유스케이스, 트랜잭션, 정책 조합      | Repository 호출 주체                         |
| `policies/`     | 권한, 소유권, 계산 정책              | Repository 결과를 기준으로 판단 가능         |
| `repositories/` | DB query, transaction, persistence   | 비즈니스 의사결정 금지                       |
| `middlewares/`  | 인증, rate limit, error, audit       | Repository에 `requestId`, actor context 제공 |

---

## 3. 디렉터리 구성 기준

```text
services/api/src/repositories/
├─ README.md
├─ index.ts
├─ repository-context.ts
├─ base.repository.ts
├─ transaction.repository.ts
├─ users.repository.ts
├─ auth-identities.repository.ts
├─ user-settings.repository.ts
├─ payroll-plans.repository.ts
├─ fixed-expenses.repository.ts
├─ savings-plans.repository.ts
├─ daily-budgets.repository.ts
├─ variable-expenses.repository.ts
├─ payroll-calculation-snapshots.repository.ts
├─ notifications.repository.ts
├─ notification-deliveries.repository.ts
├─ growth-tasks.repository.ts
├─ growth-task-completions.repository.ts
├─ user-growth-stats.repository.ts
├─ community-posts.repository.ts
├─ community-comments.repository.ts
├─ community-reactions.repository.ts
├─ community-reports.repository.ts
├─ attachments.repository.ts
├─ ad-campaigns.repository.ts
├─ ad-events.repository.ts
├─ partner-accounts.repository.ts
├─ notices.repository.ts
├─ admin-roles.repository.ts
├─ admin-role-members.repository.ts
├─ admin-audit-logs.repository.ts
└─ operational-incidents.repository.ts
```

`index.ts`는 외부 공개 export를 관리한다. 서비스 계층은 개별 파일의 내부 구현이 아니라 `index.ts`에서 공개된 계약만 사용한다.

---

## 4. 공통 Repository Context

모든 Repository 메서드는 동일한 실행 컨텍스트를 사용한다.

```ts
export interface RepositoryContext {
  readonly db: DatabaseClient;
  readonly tx?: DatabaseTransaction;
  readonly requestId: string;
  readonly actorUserId: string | null;
  readonly actorRoles: readonly string[];
  readonly isAdmin: boolean;
  readonly now: Date;
  readonly timezone: "Asia/Seoul";
  readonly idempotencyKey?: string | null;
}
```

필수 규칙은 다음과 같다.

| 항목             | 기준                                                   |
| ---------------- | ------------------------------------------------------ |
| `db`             | 읽기/쓰기 기본 client                                  |
| `tx`             | 트랜잭션 내부 실행 시 우선 사용                        |
| `requestId`      | 로그·감사·오류 추적 필수                               |
| `actorUserId`    | 사용자 또는 관리자 주체                                |
| `actorRoles`     | 관리자/운영자 권한 판단 보조                           |
| `isAdmin`        | 관리자용 우회가 아니라 관리자 audit/RBAC 컨텍스트 표시 |
| `now`            | 테스트 가능한 서버 시각                                |
| `timezone`       | 화면·일자 계산은 `Asia/Seoul` 기준                     |
| `idempotencyKey` | 중복 위험 요청 식별                                    |

Repository 내부에서 `new Date()`를 직접 호출하지 않는다. 반드시 `context.now`를 사용한다.

---

## 5. 공통 메서드 규칙

### 5.1 명명 규칙

| 목적           | 메서드명                                     |
| -------------- | -------------------------------------------- |
| 단건 조회      | `findById`, `findByUserId`, `findActiveById` |
| 목록 조회      | `listByUser`, `listForAdmin`, `listByCursor` |
| 존재 확인      | `existsById`, `existsActiveByUser`           |
| 생성           | `create`                                     |
| 수정           | `update`, `patch`, `markAs...`               |
| soft delete    | `softDelete`                                 |
| hard delete    | `hardDeleteForPolicy`                        |
| 집계           | `sumBy...`, `countBy...`, `aggregateBy...`   |
| 잠금/경합 방지 | `lockByIdForUpdate`                          |

### 5.2 반환 규칙

1. 존재하지 않으면 `null`을 반환한다.
2. 권한이 없는 경우 Repository가 임의로 숨기지 않는다. 소유권 조회 메서드는 `userId` 조건으로 자연스럽게 `null`을 반환한다.
3. 생성·수정은 DB에서 확정된 row를 반환한다.
4. 목록은 `items`, `page` 또는 `cursor` 메타를 함께 반환한다.
5. 금액 집계는 `number` 한계를 초과할 수 있으므로 DB와 타입 정책에 따라 `bigint` 또는 decimal string 중 하나로 일관되게 반환한다. API 응답 직전에는 문서 기준에 맞춰 안전한 정수로 직렬화한다.

---

## 6. 도메인별 Repository 책임

### 6.1 사용자/인증

| 파일                            | 책임                                                                         |
| ------------------------------- | ---------------------------------------------------------------------------- |
| `users.repository.ts`           | 사용자 원장, 상태 변경, 마지막 로그인 시각, 탈퇴/삭제 처리                   |
| `auth-identities.repository.ts` | 이메일/소셜 로그인 identity, provider별 subject, refresh token rotation 연결 |
| `user-settings.repository.ts`   | 알림, 마케팅, 광고 개인화, 화면 설정                                         |

필수 규칙:

- 비밀번호 평문 저장 금지.
- refresh token 원문 저장 금지. 해시만 저장한다.
- `ACTIVE`, `SUSPENDED`, `WITHDRAWN`, `DELETED`, `LOCKED` 상태를 조회 조건에 반영한다.
- 소셜 로그인 provider는 `NAVER`, `KAKAO`, `GOOGLE`, `APPLE`, `FACEBOOK` 확장을 고려한다.

### 6.2 급여/계획

| 파일                                          | 책임                                                   |
| --------------------------------------------- | ------------------------------------------------------ |
| `payroll-plans.repository.ts`                 | 급여일, 수령 예정 급여, 목표 납치금액, 월별 계획       |
| `fixed-expenses.repository.ts`                | 구독료, 대출금, 보험료, 통신비 등 반복 지출            |
| `savings-plans.repository.ts`                 | 청약, 적금, 투자, 자동이체 등 고정저축                 |
| `payroll-calculation-snapshots.repository.ts` | 서버 권위 계산 결과, 공식 버전, 입력 합계, 재계산 추적 |

필수 규칙:

- 급여·대출·저축·지출 금액은 원 단위 정수만 허용한다.
- `expected_hijack_amount`는 음수 저장 금지다.
- 계산 결과 저장은 service/calculator에서 공식 산출 후 Repository에 전달한다.
- 같은 사용자·같은 기준월 계획은 중복 생성하지 않는다.
- 월별 확정 또는 재계산은 트랜잭션으로 처리한다.

### 6.3 일일예산/변동지출

| 파일                              | 책임                                      |
| --------------------------------- | ----------------------------------------- |
| `daily-budgets.repository.ts`     | 일자별 예산, 사용금액, 남은금액, 초과금액 |
| `variable-expenses.repository.ts` | 커피, 식사, 쇼핑, 교통 등 당일 소비 기록  |

필수 규칙:

- 사용자 입력 금액은 음수 금지.
- `remaining_amount`는 초과 판단을 위해 음수 가능하다.
- 삭제된 지출은 일일 사용금액 집계에서 제외한다.
- 같은 날짜·사용자 예산은 하나의 활성 row만 허용한다.
- 지출 생성/삭제 후 일일예산 집계 갱신은 하나의 트랜잭션으로 처리한다.

### 6.4 알림

| 파일                                    | 책임                                                            |
| --------------------------------------- | --------------------------------------------------------------- |
| `notifications.repository.ts`           | 인앱 알림, 예산 초과, 결제 예정, 목표 달성, 레벨업, 이벤트 알림 |
| `notification-deliveries.repository.ts` | 푸시 발송 시도, provider 응답, 재시도, 실패 사유                |

필수 규칙:

- 알림 본문에 급여액·대출액·저축액·구체적 지출 원문을 과도하게 포함하지 않는다.
- 읽음 처리와 발송 상태 변경은 멱등적으로 처리한다.
- 배치 발송은 scheduler/service 계층에서 수행하고 Repository는 저장만 담당한다.

### 6.5 LV UP 자기계발

| 파일                                    | 책임                                   |
| --------------------------------------- | -------------------------------------- |
| `growth-tasks.repository.ts`            | 독서, 뉴스, 영어, 건강 미션 원장       |
| `growth-task-completions.repository.ts` | 사용자별 완료 이력, 중복 완료 방지     |
| `user-growth-stats.repository.ts`       | 경험치, 레벨, 연속 수행, 자기관리 성과 |

필수 규칙:

- 하루 1회 제한 미션은 사용자·미션·날짜 unique 조건으로 보장한다.
- 경험치/레벨 갱신은 완료 이력 생성과 같은 트랜잭션으로 처리한다.
- 콘텐츠 추천과 광고 추천은 데이터 소스를 분리한다.

### 6.6 커뮤니티

| 파일                                | 책임                                              |
| ----------------------------------- | ------------------------------------------------- |
| `community-posts.repository.ts`     | 게시글, 게시판 유형, 익명 표시, 조회수, 숨김/삭제 |
| `community-comments.repository.ts`  | 댓글, 대댓글, soft delete                         |
| `community-reactions.repository.ts` | 좋아요, 반응, 중복 반응 방지                      |
| `community-reports.repository.ts`   | 신고, 운영 검수, 제재 연결                        |
| `attachments.repository.ts`         | 게시글/프로필/콘텐츠 첨부 메타데이터              |

필수 규칙:

- 익명 게시글이어도 내부 `user_id`는 운영·신고 처리를 위해 보존한다.
- 목록 응답에서는 익명 작성자의 식별자를 노출하지 않는다.
- 삭제는 기본 soft delete다.
- 신고 누적과 운영자 숨김 처리는 감사로그 대상이다.
- 첨부 파일은 R2 object key와 공개 URL을 분리한다.

### 6.7 광고/제휴

| 파일                             | 책임                                |
| -------------------------------- | ----------------------------------- |
| `ad-campaigns.repository.ts`     | 캠페인, 소재, placement, 기간, 상태 |
| `ad-events.repository.ts`        | 노출, 클릭, 전환 이벤트             |
| `partner-accounts.repository.ts` | 제휴사 계정, 정산, 운영 상태        |

필수 규칙:

- 광고 Repository는 `payroll_plans`, `fixed_expenses`, `savings_plans`, `variable_expenses`와 직접 JOIN하지 않는다.
- `user_id`를 광고 세그먼트에 직접 사용하지 않는다. 필요한 경우 one-way hash 기반 `user_ad_profile_id`를 사용한다.
- 기본 광고는 비개인화/문맥형 기준이다.
- 광고주 제공 데이터에는 개인 식별자, 급여액, 대출액, 소비 원문을 포함하지 않는다.

### 6.8 관리자/운영/감사

| 파일                                  | 책임                                     |
| ------------------------------------- | ---------------------------------------- |
| `admin-roles.repository.ts`           | 관리자 역할 원장                         |
| `admin-role-members.repository.ts`    | 관리자 역할 부여/회수                    |
| `admin-audit-logs.repository.ts`      | 관리자 조회/변경/삭제/권한 작업 감사로그 |
| `notices.repository.ts`               | 공지사항, 게시 상태, 노출 기간           |
| `operational-incidents.repository.ts` | 장애, 점검, 후속 조치 기록               |

필수 규칙:

- 관리자 변경은 `reason`이 있는 감사 가능 작업으로 처리한다.
- 감사로그에는 급여·대출·저축·지출 원문을 저장하지 않는다.
- IP/User-Agent는 원문이 아닌 hash만 저장한다.
- 권한 변경, 사용자 제재, 광고 캠페인 변경, 공지 발행, 신고 처리, 장애 상태 변경은 감사로그 대상이다.

---

## 7. 트랜잭션 기준

아래 작업은 반드시 하나의 트랜잭션으로 처리한다.

| 작업                   | 트랜잭션 범위                                        |
| ---------------------- | ---------------------------------------------------- |
| 급여 계획 생성/수정    | 계획 저장 + 계산 스냅샷 저장 + 목표 달성률 갱신      |
| 변동지출 생성/삭제     | 지출 저장/삭제 + 일일예산 사용금액/남은금액 갱신     |
| 고정지출/고정저축 변경 | 항목 변경 + 월별 예상 지출/납치금액 재계산           |
| 월별 확정              | 월 합계 산출 + 누적 납치금액 갱신 + 알림 이벤트 생성 |
| 미션 완료              | 완료 이력 생성 + 경험치/레벨 갱신 + 알림 후보 생성   |
| 커뮤니티 글쓰기        | 게시글 생성 + 첨부 연결 + 카운터 초기화              |
| 신고 처리              | 신고 상태 변경 + 게시글/댓글 숨김 + 관리자 감사로그  |
| 관리자 권한 변경       | role membership 변경 + 감사로그 저장                 |
| 광고 캠페인 상태 변경  | 캠페인 변경 + 운영 로그/감사로그 저장                |

Repository는 `withTransaction(context, callback)` 또는 동등한 트랜잭션 helper를 제공해야 한다.

---

## 8. 소유권과 접근통제

사용자 데이터 Repository는 항상 `userId`를 명시적으로 받는다.

```ts
await payrollPlansRepository.findActiveByUserAndMonth(ctx, {
  userId,
  salaryMonth,
});
```

금지 예시는 다음과 같다.

```ts
await payrollPlansRepository.findById(ctx, payrollPlanId);
```

사용자 소유 리소스는 `id`만으로 조회하지 않는다. 반드시 `user_id`를 함께 조건에 넣는다.

관리자 Repository는 일반 사용자 Repository를 우회하지 않는다. 관리자 전용 조회는 `listForAdmin`, `findForAdminReview`처럼 명확한 메서드명을 사용하고, 호출 서비스에서 RBAC/MFA/audit 조건을 충족해야 한다.

---

## 9. Soft Delete 기준

| 데이터                          | 삭제 방식                         | 기준                            |
| ------------------------------- | --------------------------------- | ------------------------------- |
| 사용자 생성 급여/지출/저축/예산 | soft delete                       | 재계산·복구·감사 가능성 보존    |
| 커뮤니티 게시글/댓글            | soft delete                       | 운영 정책, 신고/분쟁 대응       |
| 첨부 파일 메타                  | soft delete 후 R2 lifecycle       | 복구 가능 기간 이후 object 삭제 |
| 광고 캠페인                     | archive/soft delete               | 성과 로그 보존                  |
| 감사로그                        | hard delete 금지                  | 보존 정책에 따른 장기 보존      |
| 법정 삭제 요청 대상             | 정책 기반 hard delete 또는 익명화 | 개인정보 처리 정책 우선         |

조회 메서드는 기본적으로 `deleted_at IS NULL` 조건을 포함한다. 삭제된 row가 필요한 경우 메서드명에 `IncludingDeleted`를 포함한다.

---

## 10. 금액 데이터 처리 기준

1. DB 저장 타입은 `BIGINT`다.
2. API 입력은 정수만 허용한다.
3. 사용자 직접 입력 금액은 0 이상이어야 한다.
4. 오늘 남은금액은 `daily_limit - used_amount` 결과로 음수 가능하다.
5. 납치금액은 화면 표시와 확정 지표에서 0원 미만을 허용하지 않는다.
6. 금액 계산 공식 버전은 `payroll_calculation_snapshots.formula_version`에 남긴다.
7. Repository는 금액 표시 포맷팅을 하지 않는다. 포맷팅은 프론트엔드 또는 presenter 책임이다.

---

## 11. 페이징·정렬 기준

목록 Repository는 기본적으로 다음 형태를 따른다.

```ts
export interface PageRequest {
  readonly page?: number;
  readonly size?: number;
  readonly sort?: string;
}

export interface CursorRequest {
  readonly cursor?: string | null;
  readonly limit?: number;
}
```

| 목록 유형           | 기준                       |
| ------------------- | -------------------------- |
| 관리자 목록         | page 기반 + 필터           |
| 커뮤니티 피드       | cursor 기반 우선           |
| 알림 목록           | cursor 기반 우선           |
| 급여/지출 월별 목록 | 월 기준 필터 + page        |
| 광고 이벤트 로그    | cursor 또는 시간 범위 기반 |

기본 `size`는 20, 최대 `size`는 100이다. 관리자 export는 일반 목록 API와 분리한다.

---

## 12. 오류 처리 기준

Repository는 HTTP `Response`를 생성하지 않는다. 다음과 같은 오류만 발생시킨다.

| 오류                         | 사용 상황                                      |
| ---------------------------- | ---------------------------------------------- |
| `RepositoryConflictError`    | unique 제약, 중복 계획, 중복 반응              |
| `RepositoryNotFoundError`    | 명시적으로 존재해야 하는 row 부재              |
| `RepositoryValidationError`  | DB 저장 전 내부 불변식 위반                    |
| `RepositoryUnavailableError` | DB 연결, timeout, transaction 실패             |
| `RepositoryPolicyError`      | Repository 수준에서 탐지 가능한 owner mismatch |

최종 HTTP 변환은 `error.middleware.ts`가 담당한다.

---

## 13. 보안·개인정보 기준

### 13.1 로그 금지 데이터

Repository와 DB 오류 로그에는 다음 원문을 기록하지 않는다.

- 비밀번호, access token, refresh token, OAuth token
- 급여액, 대출액, 저축액, 지출액, 납치금액, 일일예산
- 계좌번호, 카드번호, 주민등록번호, 전화번호, 이메일 원문
- 광고 타겟팅 세그먼트와 재무 원천 데이터의 결합 결과

### 13.2 광고 데이터 분리

광고 Repository는 재무 Repository의 테이블과 직접 결합하지 않는다.

허용:

```text
ad_events.user_ad_profile_id
ad_campaigns.placement
ad_campaigns.context_category
```

금지:

```text
ad_events JOIN payroll_plans ON user_id
ad_campaigns targeting by salary amount
partner export with expense names
```

### 13.3 RLS 컨텍스트

PostgreSQL RLS를 사용하는 경우 트랜잭션 시작 시 다음 컨텍스트를 설정한다.

```sql
SELECT set_config('app.current_user_id', :actorUserId, true);
SELECT set_config('app.request_id', :requestId, true);
SELECT set_config('app.is_admin', :isAdmin, true);
```

서비스 계층이 관리자 작업을 수행하더라도 RLS 우회는 최소화하고, 필요한 경우 명시적 관리자 Repository 메서드와 감사로그를 동반한다.

---

## 14. 성능 기준

| 항목                       | 기준                                                               |
| -------------------------- | ------------------------------------------------------------------ |
| 단건 조회                  | PK 또는 unique index 사용                                          |
| 사용자 월별 급여/예산 조회 | `(user_id, salary_month)` 또는 `(user_id, budget_date)` index 사용 |
| 커뮤니티 피드              | `created_at`, `board_type`, `status` index 사용                    |
| 알림 목록                  | `(user_id, created_at desc)` index 사용                            |
| 광고 이벤트                | append-only, batch insert 가능 구조                                |
| 관리자 목록                | 필터 컬럼 index와 page 제한 필수                                   |
| N+1                        | 금지. 필요한 경우 batch query 또는 join projection 사용            |

Repository는 화면에 필요한 컬럼만 projection한다. 민감 필드는 필요하지 않으면 select하지 않는다.

---

## 15. 테스트 기준

각 Repository는 다음 테스트를 가져야 한다.

| 테스트                          |               필수 여부 |
| ------------------------------- | ----------------------: |
| 정상 생성/조회/수정/삭제        |                    필수 |
| 사용자 소유권 격리              |                    필수 |
| soft delete 제외 조회           |                    필수 |
| 금액 음수/소수점 차단           |                    필수 |
| unique 제약 충돌                |                    필수 |
| 트랜잭션 rollback               |                    필수 |
| cursor/page 페이징              |                    필수 |
| 광고-재무 데이터 직접 결합 금지 |                    필수 |
| 관리자 감사로그 대상 변경       |                    필수 |
| RLS context 설정                | 운영 DB 테스트에서 필수 |

---

## 16. 구현 완료 기준

Repository 계층은 아래 조건을 모두 만족해야 완료로 판정한다.

```text
[필수 완료 조건]
1. 모든 Repository가 RepositoryContext를 받는다.
2. 사용자 소유 데이터 조회에 userId 조건이 포함된다.
3. 모든 금액은 KRW 정수 기준으로 처리된다.
4. 급여·지출·저축 계산 확정값은 서버 권위 스냅샷으로 보존된다.
5. soft delete 기본 조회 조건이 적용된다.
6. 관리자 변경 대상 Repository는 audit 연결 정보를 보존한다.
7. 광고 Repository는 재무 원천 테이블과 직접 JOIN하지 않는다.
8. Repository에서 HTTP Response를 만들지 않는다.
9. Repository에서 token, password, salary 원문을 로그로 남기지 않는다.
10. 트랜잭션 대상 유스케이스가 원자적으로 처리된다.
11. page/cursor 목록 반환 계약이 통일된다.
12. TypeScript strict mode를 통과한다.
13. 단위 테스트와 통합 테스트가 통과한다.
14. DB migration, index, RLS 정책과 메서드 조건이 일치한다.
15. app/service 계층에서 중복 SQL이 발생하지 않는다.
```

---

## 17. 금지 패턴

```ts
// 금지: Repository에서 HTTP 응답 생성
return new Response(JSON.stringify(data));

// 금지: 사용자 소유 데이터 id 단독 조회
await db.select().from(payrollPlans).where(eq(payrollPlans.planId, planId));

// 금지: 급여 원문 로그
console.log({ expectedSalary, loanAmount, hijackAmount });

// 금지: 광고와 재무 원천 데이터 직접 결합
await db.select().from(adEvents).innerJoin(payrollPlans, eq(adEvents.userId, payrollPlans.userId));

// 금지: Repository 내부 현재 시각 직접 생성
const now = new Date();
```

대체 기준은 다음과 같다.

```ts
// 허용: userId 소유권 조건 포함
await db
  .select()
  .from(payrollPlans)
  .where(and(eq(payrollPlans.planId, planId), eq(payrollPlans.userId, userId), isNull(payrollPlans.deletedAt)));

// 허용: context.now 사용
const updatedAt = context.now;

// 허용: 광고용 비식별 프로필 ID
await adEventsRepository.recordImpression(ctx, {
  userAdProfileId,
  campaignId,
  placement,
});
```

---

## 18. 변경 관리

Repository 계약 변경은 다음 순서를 따른다.

1. 데이터/DB 문서와 API 계약 변경 여부 확인
2. migration 작성 또는 기존 migration 영향 검토
3. Repository interface 변경
4. Service 호출부 변경
5. 테스트 케이스 추가/수정
6. 관리자/감사/보안 영향 검토
7. 광고 데이터 분리 정책 위반 여부 확인
8. 릴리즈 노트와 rollback 기준 작성

DB schema 변경 없이 Repository만 변경하는 경우에도 소유권, soft delete, 금액, 광고 분리, 감사로그 기준은 재검토한다.

---

## 19. 최종 판정

이 문서는 `services/api/src/repositories` 디렉터리의 구현·검수·운영 기준이다. 본 README의 계약을 만족하는 Repository 계층은 급여납치 플랫폼의 서버 권위 데이터 접근, 사용자 소유권 격리, 재무성 개인정보 보호, 광고 데이터 분리, 관리자 감사 가능성, 상용 운영 안정성 기준을 충족한 것으로 판정한다.

파일 단위 상태: 문서상·이론상 최종본.  
프로젝트 종합 상태: 이 문서 기준에 맞춰 실제 Repository 구현, DB migration, service 연결, E2E/QA 검증이 모두 통과되어야 최종 확정된다.
