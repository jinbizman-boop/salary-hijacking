---
프로젝트: 급여납치(Salary Hijacking) 모바일 플랫폼
문서등급: 최종본
적용범위: API·백엔드 문서
기준일: 2026-06-15
상태: 문서상·이론상 최종 완료본
작성기준: 기존 최상위 기획문서, 사용자·시장·전략문서, UX/UI 기획문서, 기능 기획문서, 데이터·DB 문서, 급여납치 화면 및 기능 설계 기획안.html
배포환경: 모바일 애플리케이션 / GitHub / Cloudflare / Neon DB(PostgreSQL)
공통원칙: 본 문서는 추가 기획 없이 백엔드 구현·검수·운영 기준으로 사용할 수 있도록 API 계약, 보안, 예외, 권한, 데이터 연결 기준을 완결한다.
---

# 01. API 명세서 최종본

## 1. 문서 목적

본 문서는 급여납치 모바일 앱 프론트엔드, 백엔드, 관리자, 배치 작업자가 동일한 계약으로 통신하기 위한 API 최종 명세서다. 본 문서의 endpoint, method, request, response, error code는 구현·테스트·운영 기준으로 확정한다.

## 공통 API 원칙

| 항목         | 최종 기준                                                                                                                       |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| API 스타일   | RESTful JSON API를 기본으로 한다. 파일 업로드는 사전 서명 URL 방식, 푸시 발송은 서버 내부 작업자와 FCM HTTP v1 연동을 사용한다. |
| 기본 URL     | `https://api.salary-hijacking.app/api/v1`                                                                                       |
| 관리자 URL   | `https://api.salary-hijacking.app/admin/api/v1`                                                                                 |
| 문자 인코딩  | UTF-8                                                                                                                           |
| 날짜/시간    | 서버 저장은 UTC `TIMESTAMPTZ`, 클라이언트 표시는 사용자 타임존 `Asia/Seoul` 기준                                                |
| 금액         | 모든 금액은 원 단위 정수 `BIGINT`로 송수신한다. 소수점, 음수, 임의 반올림을 허용하지 않는다.                                    |
| 인증         | `Authorization: Bearer {accessToken}`                                                                                           |
| 요청 추적    | 모든 요청은 `X-Request-Id`를 허용하며 서버가 없을 경우 생성한다.                                                                |
| 멱등성       | 생성/결제성/중복 위험 요청은 `Idempotency-Key`를 지원한다. 동일 키·동일 사용자·동일 endpoint 요청은 최초 결과를 반환한다.       |
| 페이지네이션 | 목록 API는 `page`, `size`, `sort`를 기본 지원하고, 대용량 목록은 cursor 기반 `cursor`, `limit`를 병행 지원한다.                 |
| soft delete  | 사용자 생성 데이터는 원칙적으로 `deleted_at`을 사용하는 soft delete를 적용한다. 법적/정책상 즉시 삭제 대상은 hard delete한다.   |
| 보안 헤더    | HTTPS 강제, HSTS, CORS allowlist, rate limit, body size limit, request validation을 적용한다.                                   |

## 공통 응답 포맷

### 성공 응답

```json
{
  "success": true,
  "data": {},
  "meta": {
    "requestId": "req_20260615_000001",
    "serverTime": "2026-06-15T03:00:00Z"
  }
}
```

### 목록 응답

```json
{
  "success": true,
  "data": [],
  "page": {
    "page": 1,
    "size": 20,
    "totalElements": 120,
    "totalPages": 6,
    "hasNext": true
  },
  "meta": {
    "requestId": "req_20260615_000002",
    "serverTime": "2026-06-15T03:00:00Z"
  }
}
```

### 오류 응답

```json
{
  "success": false,
  "error": {
    "code": "PAYROLL_PLAN_DUPLICATED",
    "message": "이미 해당 월의 활성 급여 계획이 존재합니다.",
    "fieldErrors": [{ "field": "yearMonth", "message": "중복된 적용 월입니다." }]
  },
  "meta": {
    "requestId": "req_20260615_000003",
    "serverTime": "2026-06-15T03:00:00Z"
  }
}
```

## 공통 HTTP 상태 코드

| HTTP | 의미                   | 적용 기준                         |
| ---: | ---------------------- | --------------------------------- |
|  200 | OK                     | 조회, 수정, 삭제 성공             |
|  201 | Created                | 리소스 생성 성공                  |
|  202 | Accepted               | 배치/비동기 작업 접수             |
|  204 | No Content             | 응답 body 없는 삭제/처리 성공     |
|  400 | Bad Request            | 잘못된 요청 형식, 검증 실패       |
|  401 | Unauthorized           | 인증 없음, access token 만료/위조 |
|  403 | Forbidden              | 권한 부족, 정지 계정 접근         |
|  404 | Not Found              | 리소스 없음 또는 접근 불가        |
|  409 | Conflict               | 중복 생성, 상태 충돌, 멱등성 충돌 |
|  413 | Payload Too Large      | 파일/본문 크기 초과               |
|  415 | Unsupported Media Type | 허용하지 않는 파일/콘텐츠 타입    |
|  422 | Unprocessable Entity   | 형식은 맞지만 비즈니스 규칙 위반  |
|  429 | Too Many Requests      | rate limit 초과                   |
|  500 | Internal Server Error  | 서버 내부 오류                    |
|  503 | Service Unavailable    | 점검, 외부 연동 장애              |

## 공통 오류 코드 체계

| Prefix       | 영역      | 예시                                         |
| ------------ | --------- | -------------------------------------------- |
| AUTH         | 인증/인가 | AUTH_TOKEN_EXPIRED, AUTH_INVALID_CREDENTIALS |
| USER         | 회원      | USER_NOT_FOUND, USER_SUSPENDED               |
| PAYROLL      | 급여 계획 | PAYROLL_PLAN_DUPLICATED                      |
| MONEY        | 금액 검증 | MONEY_NEGATIVE_NOT_ALLOWED                   |
| BUDGET       | 일일 예산 | BUDGET_OVER_LIMIT                            |
| EXPENSE      | 지출      | EXPENSE_NOT_FOUND                            |
| SAVINGS      | 저축      | SAVINGS_PLAN_NOT_FOUND                       |
| NOTIFICATION | 알림      | NOTIFICATION_PUSH_DISABLED                   |
| GROWTH       | 레벨업    | GROWTH_TASK_ALREADY_COMPLETED                |
| COMMUNITY    | 커뮤니티  | COMMUNITY_POST_HIDDEN                        |
| FILE         | 파일      | FILE_SIZE_EXCEEDED                           |
| AD           | 광고      | AD_CAMPAIGN_INACTIVE                         |
| ADMIN        | 관리자    | ADMIN_PERMISSION_DENIED                      |
| SYSTEM       | 시스템    | SYSTEM_TEMPORARY_UNAVAILABLE                 |

## 2. 인증 요구사항

| API 유형      | 인증             | 권한                         |
| ------------- | ---------------- | ---------------------------- |
| 공개 API      | 선택 또는 없음   | 로그인, 소셜 콜백, 헬스체크  |
| 사용자 API    | 필수             | 본인 리소스만 접근 가능      |
| 관리자 API    | 필수             | OPERATOR, ADMIN, SUPER_ADMIN |
| 배치 내부 API | 서비스 토큰 필수 | SCHEDULER, SYSTEM            |

## 3. API 그룹 전체 목록

| 그룹     | Prefix               | 설명                                    |
| -------- | -------------------- | --------------------------------------- |
| 인증     | `/auth`              | 로그인, 회원가입, 토큰 재발급, 로그아웃 |
| 사용자   | `/users/me`          | 내 프로필, 설정, 탈퇴                   |
| 급여     | `/payroll-plans`     | 급여 계획 CRUD, 납치금액 계산           |
| 고정지출 | `/fixed-expenses`    | 반복 지출 CRUD, 납부 상태               |
| 고정저축 | `/savings-plans`     | 반복 저축 CRUD, 이체 상태               |
| 일일예산 | `/daily-budgets`     | 하루 예산, 사용액, 남은금액             |
| 변동지출 | `/variable-expenses` | 소비 기록 CRUD                          |
| 알림     | `/notifications`     | 알림 목록, 읽음, 수신 설정              |
| 레벨업   | `/growth`            | 미션, 완료, 경험치, 레벨                |
| 커뮤니티 | `/community`         | 게시글, 댓글, 좋아요, 신고              |
| 파일     | `/files`             | 첨부 업로드, 삭제, 썸네일               |
| 광고     | `/ads`               | 배너 조회, 노출/클릭 로그               |
| 검색     | `/search`            | 통합 검색과 필터                        |
| 관리자   | `/admin`             | 운영자 기능                             |

## 4. 인증 API

### 4.1 이메일 회원가입

| 항목     | 명세                              |
| -------- | --------------------------------- |
| Endpoint | `POST /auth/register`             |
| 인증     | 불필요                            |
| 설명     | 이메일 기반 회원 계정을 생성한다. |

Request

```json
{
  "email": "user@example.com",
  "password": "Password!2026",
  "nickname": "홍길동 기획자",
  "marketingOptIn": false,
  "termsAgreed": true,
  "privacyAgreed": true
}
```

Response `201`

```json
{
  "success": true,
  "data": {
    "userId": "0c2f2f1a-0e6e-4cd7-a2dc-03ef3e0c1111",
    "nickname": "홍길동 기획자",
    "onboardingCompleted": false,
    "accessToken": "jwt.access.token",
    "refreshToken": "jwt.refresh.token",
    "expiresIn": 900
  }
}
```

주요 오류: `AUTH_EMAIL_DUPLICATED`, `AUTH_PASSWORD_POLICY_FAILED`, `AUTH_REQUIRED_AGREEMENT_MISSING`.

### 4.2 이메일 로그인

| 항목     | 명세                          |
| -------- | ----------------------------- |
| Endpoint | `POST /auth/login`            |
| 인증     | 불필요                        |
| 설명     | 이메일/비밀번호로 로그인한다. |

```json
{
  "email": "user@example.com",
  "password": "Password!2026",
  "autoLogin": true,
  "deviceId": "device_ios_001"
}
```

### 4.3 소셜 로그인

| 항목     | 명세                                                                       |
| -------- | -------------------------------------------------------------------------- |
| Endpoint | `POST /auth/social-login`                                                  |
| 인증     | 불필요                                                                     |
| 설명     | 네이버, 카카오, 구글, 애플, 페이스북 OAuth 인증 결과로 앱 세션을 발급한다. |

```json
{
  "provider": "KAKAO",
  "authorizationCode": "oauth_code_from_provider",
  "redirectUri": "salaryhijacking://oauth/kakao",
  "codeVerifier": "pkce-code-verifier",
  "deviceId": "device_android_001"
}
```

### 4.4 토큰 재발급

| 항목     | 명세                                                                               |
| -------- | ---------------------------------------------------------------------------------- |
| Endpoint | `POST /auth/refresh`                                                               |
| 인증     | refresh token 필요                                                                 |
| 정책     | refresh token rotation을 적용한다. 기존 refresh token은 재발급 성공 즉시 폐기한다. |

```json
{
  "refreshToken": "jwt.refresh.token",
  "deviceId": "device_android_001"
}
```

### 4.5 로그아웃

| 항목     | 명세                                                          |
| -------- | ------------------------------------------------------------- |
| Endpoint | `POST /auth/logout`                                           |
| 인증     | 필수                                                          |
| 정책     | 현재 기기의 refresh token과 device push token을 비활성화한다. |

## 5. 사용자/프로필 API

| Method | Endpoint             | 설명                               | 권한 |
| ------ | -------------------- | ---------------------------------- | ---- |
| GET    | `/users/me`          | 내 회원/프로필/설정 조회           | USER |
| PATCH  | `/users/me/profile`  | 표시 이름, 직무, 이미지, 소개 수정 | USER |
| PATCH  | `/users/me/settings` | 알림/마케팅 설정 수정              | USER |
| POST   | `/users/me/withdraw` | 회원 탈퇴 요청                     | USER |

### 내 정보 조회 응답

```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "email": "user@example.com",
    "nickname": "홍길동 기획자",
    "profile": {
      "displayName": "홍길동 기획자",
      "jobTitle": "기획자",
      "profileImageUrl": "https://cdn.salary-hijacking.app/profiles/u1.png"
    },
    "settings": {
      "pushEnabled": true,
      "budgetAlertEnabled": true,
      "fixedPaymentAlertEnabled": true,
      "growthAlertEnabled": true,
      "communityAlertEnabled": true,
      "marketingOptIn": false
    }
  }
}
```

## 6. 급여 계획 API

| Method | Endpoint                               | 설명                   |
| ------ | -------------------------------------- | ---------------------- |
| GET    | `/payroll-plans?yearMonth=2026-06`     | 월별 급여 계획 조회    |
| POST   | `/payroll-plans`                       | 급여 계획 생성         |
| GET    | `/payroll-plans/{payrollPlanId}`       | 급여 계획 상세 조회    |
| PATCH  | `/payroll-plans/{payrollPlanId}`       | 급여 계획 수정         |
| POST   | `/payroll-plans/{payrollPlanId}/close` | 월말 납치금액 확정     |
| GET    | `/payroll-plans/current/summary`       | 홈 화면 급여 요약 조회 |

### 급여 계획 생성 Request

```json
{
  "yearMonth": "2026-06",
  "payday": 25,
  "expectedSalaryAmount": 2700000,
  "expectedExpenseAmount": 600000,
  "targetHijackAmount": 500000
}
```

### 급여 홈 요약 Response

```json
{
  "success": true,
  "data": {
    "yearMonth": "2026-06",
    "payday": 25,
    "expectedSalaryAmount": 2700000,
    "actualExpenseAmount": 73000,
    "expectedHijackAmount": 2627000,
    "totalHijackAmount": 5780000,
    "achievementRate": 87,
    "todayBudget": {
      "dailyLimitAmount": 20000,
      "usedAmount": 13000,
      "remainingAmount": 7000,
      "overBudget": false
    }
  }
}
```

## 7. 고정지출 API

| Method | Endpoint                                     | 설명               |
| ------ | -------------------------------------------- | ------------------ |
| GET    | `/fixed-expenses?payrollPlanId={id}`         | 고정지출 목록      |
| POST   | `/fixed-expenses`                            | 고정지출 생성      |
| PATCH  | `/fixed-expenses/{fixedExpenseId}`           | 고정지출 수정      |
| DELETE | `/fixed-expenses/{fixedExpenseId}`           | 고정지출 삭제      |
| POST   | `/fixed-expenses/{fixedExpenseId}/mark-paid` | 납부 완료 처리     |
| POST   | `/fixed-expenses/{fixedExpenseId}/skip`      | 이번 회차 건너뛰기 |

Request

```json
{
  "payrollPlanId": "uuid",
  "expenseDay": 10,
  "category": "SUBSCRIPTION",
  "name": "ChatGPT 자동결제",
  "amount": 30000,
  "recurrenceType": "MONTHLY"
}
```

## 8. 고정저축 API

| Method | Endpoint                                          | 설명           |
| ------ | ------------------------------------------------- | -------------- |
| GET    | `/savings-plans?payrollPlanId={id}`               | 고정저축 목록  |
| POST   | `/savings-plans`                                  | 고정저축 생성  |
| PATCH  | `/savings-plans/{savingsPlanId}`                  | 고정저축 수정  |
| DELETE | `/savings-plans/{savingsPlanId}`                  | 고정저축 삭제  |
| POST   | `/savings-plans/{savingsPlanId}/mark-transferred` | 이체 완료 처리 |

## 9. 일일 예산 API

| Method | Endpoint                                       | 설명                               |
| ------ | ---------------------------------------------- | ---------------------------------- |
| GET    | `/daily-budgets/today`                         | 오늘 예산 조회                     |
| GET    | `/daily-budgets?from=2026-06-01&to=2026-06-30` | 기간별 예산 조회                   |
| PUT    | `/daily-budgets/{date}`                        | 특정 날짜 예산 생성/수정           |
| POST   | `/daily-budgets/apply-monthly-template`        | 월 생활비 기준 일일 예산 일괄 생성 |

Request

```json
{
  "date": "2026-06-15",
  "dailyLimitAmount": 20000
}
```

## 10. 변동지출 API

| Method | Endpoint                                 | 설명                 |
| ------ | ---------------------------------------- | -------------------- |
| GET    | `/variable-expenses?date=2026-06-15`     | 날짜별 변동지출 목록 |
| POST   | `/variable-expenses`                     | 변동지출 생성        |
| PATCH  | `/variable-expenses/{variableExpenseId}` | 변동지출 수정        |
| DELETE | `/variable-expenses/{variableExpenseId}` | 변동지출 삭제        |

Request

```json
{
  "spentAt": "2026-06-15T12:30:00+09:00",
  "category": "FOOD",
  "name": "구내식당 점심",
  "amount": 6500,
  "memo": "KT전주지사 구내식당",
  "paymentMethod": "CARD"
}
```

생성 성공 시 서버는 해당 날짜 `daily_budgets.used_amount`, `remaining_amount`, 월별 지출 합계를 재계산한다.

## 11. 알림 API

| Method | Endpoint                               | 설명                    |
| ------ | -------------------------------------- | ----------------------- |
| GET    | `/notifications?status=UNREAD`         | 알림 목록               |
| POST   | `/notifications/{notificationId}/read` | 단건 읽음 처리          |
| POST   | `/notifications/read-all`              | 전체 읽음 처리          |
| PATCH  | `/users/me/settings/notifications`     | 알림 수신 설정          |
| POST   | `/devices/push-tokens`                 | 기기 푸시 토큰 등록     |
| DELETE | `/devices/push-tokens/{deviceTokenId}` | 기기 푸시 토큰 비활성화 |

## 12. 레벨업 API

| Method | Endpoint                                | 설명                       |
| ------ | --------------------------------------- | -------------------------- |
| GET    | `/growth/summary`                       | 현재 레벨/경험치/완료 현황 |
| GET    | `/growth/tasks?type=BOOK`               | 미션 목록                  |
| GET    | `/growth/tasks/{growthTaskId}`          | 미션 상세                  |
| POST   | `/growth/tasks/{growthTaskId}/complete` | 미션 완료                  |
| GET    | `/growth/history`                       | 경험치/레벨 이력           |

## 13. 커뮤니티 API

| Method | Endpoint                                         | 설명        |
| ------ | ------------------------------------------------ | ----------- |
| GET    | `/community/posts?boardType=FREE&page=1&size=20` | 게시글 목록 |
| POST   | `/community/posts`                               | 게시글 작성 |
| GET    | `/community/posts/{postId}`                      | 게시글 상세 |
| PATCH  | `/community/posts/{postId}`                      | 게시글 수정 |
| DELETE | `/community/posts/{postId}`                      | 게시글 삭제 |
| POST   | `/community/posts/{postId}/like`                 | 좋아요      |
| DELETE | `/community/posts/{postId}/like`                 | 좋아요 취소 |
| POST   | `/community/posts/{postId}/share`                | 공유 로그   |
| POST   | `/community/posts/{postId}/reports`              | 신고        |
| GET    | `/community/posts/{postId}/comments`             | 댓글 목록   |
| POST   | `/community/posts/{postId}/comments`             | 댓글 작성   |

게시글 작성 Request

```json
{
  "boardType": "LEVEL_CERT",
  "title": "주 6일 운동 1년 차 인증",
  "body": "퇴근 후 운동 루틴을 공유합니다.",
  "isAnonymous": true,
  "isQuestion": false,
  "attachmentIds": ["uuid-file-1"]
}
```

## 14. 파일 API

| Method | Endpoint            | 설명                      |
| ------ | ------------------- | ------------------------- |
| POST   | `/files/upload-url` | 사전 서명 업로드 URL 발급 |
| POST   | `/files/complete`   | 업로드 완료 등록          |
| GET    | `/files/{fileId}`   | 파일 메타데이터 조회      |
| DELETE | `/files/{fileId}`   | 파일 삭제/비활성화        |

## 15. 광고/제휴 API

| Method | Endpoint                          | 설명                        |
| ------ | --------------------------------- | --------------------------- |
| GET    | `/ads/banners?placement=HOME_TOP` | 배너 조회                   |
| POST   | `/ads/impressions`                | 노출 로그                   |
| POST   | `/ads/clicks`                     | 클릭 로그 및 랜딩 토큰 생성 |

## 16. 검색 API

| Method | Endpoint                 | 설명               |
| ------ | ------------------------ | ------------------ |
| GET    | `/search/community`      | 게시글 검색        |
| GET    | `/search/growth-content` | 레벨업 콘텐츠 검색 |
| GET    | `/search/expenses`       | 지출 내역 검색     |

## 17. Health Check API

| Method | Endpoint               | 설명                         |
| ------ | ---------------------- | ---------------------------- |
| GET    | `/health`              | API 프로세스 상태            |
| GET    | `/health/db`           | DB 연결 상태                 |
| GET    | `/health/dependencies` | FCM, R2, OAuth provider 상태 |

## 18. 전역 Rate Limit

| 대상                 | 기준                                                  |
| -------------------- | ----------------------------------------------------- |
| 로그인 시도          | IP+이메일 기준 5회/10분, 초과 시 15분 차단            |
| 토큰 재발급          | 사용자+기기 기준 30회/시간                            |
| 글쓰기               | 사용자 기준 10건/시간, 신규 가입 24시간 이내 3건/시간 |
| 댓글                 | 사용자 기준 60건/시간                                 |
| 신고                 | 사용자 기준 30건/일                                   |
| 파일 업로드 URL 발급 | 사용자 기준 100회/일                                  |
| 관리자 API           | 관리자 계정 기준 1200회/시간                          |

## 19. API 완료 판정

본 API 명세서는 다음 조건을 모두 충족하면 완료로 판정한다.

1. 모든 endpoint가 인증/권한/요청/응답/오류 기준을 갖는다.
2. 프론트엔드는 본 문서만으로 화면 데이터를 조회·저장·삭제할 수 있다.
3. DB 문서의 테이블 및 상태값과 충돌하지 않는다.
4. QA는 본 문서의 HTTP 상태 코드와 오류 코드로 테스트 케이스를 만들 수 있다.
5. 운영자는 관리자 API와 로그를 통해 신고, 공지, 배너, 사용자 제재를 수행할 수 있다.
