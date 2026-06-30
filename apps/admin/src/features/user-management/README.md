# 급여납치 관리자 콘솔 사용자 관리(User Management) 기능 최종 문서

관리자 콘솔 최종 파일 위치: `apps/admin/src/features/user-management/README.md`

문서 버전: `v3.1.3`
문서 상태: 문서상·이론상 최종본
대상 서비스: 급여납치 Paycheck Accounting 관리자 콘솔
대상 도메인: 사용자·계정·권한·세션·토큰·동의·탈퇴·개인정보 요청·감사 로그·운영 보안

---

## 1. 목적

`user-management` 기능은 급여납치 플랫폼의 관리자 콘솔에서 사용자와 관리자 계정을 안전하게 조회, 검토, 조치, 복구, 익명화, 삭제, 감사하는 운영 기능이다. 이 기능은 급여·예산·지출·저축·알림·레벨업·커뮤니티·광고·제휴·운영 데이터가 연결된 사용자를 다루기 때문에 단순한 회원 목록이 아니라 서버 권위, 개인정보 보호, 보안 감사, 광고 정책 분리, 운영 리스크 대응까지 포함하는 고권한 관리 영역이다.

이 문서는 `apps/admin/src/features/user-management` 디렉터리의 구현·운영·검증 기준을 정의한다. 관리자 페이지 `apps/admin/src/app/users/page.tsx`, 사용자 API `/admin/api/v1/users`, 인증 API `/admin/auth`, 감사 로그 미들웨어, 권한 미들웨어, 개인정보 export/탈퇴 처리, 푸시 토큰 hash 정책, 광고 타겟팅 차단 정책과 함께 동작하는 것을 전제로 한다.

---

## 2. 핵심 원칙

1. 사용자의 실제 급여, 지출, 저축, 납치 금액, 계좌, 카드, 급여명세서, 통장, push token 원문은 관리자 화면에 표시하지 않는다.
2. 관리자 콘솔에는 masked email, masked phone, user id, hash, 집계 수치, 상태 값, 위험도 등 운영에 필요한 최소 정보만 표시한다.
3. 모든 변경성 관리자 조치는 `X-Admin-Reason` 사유와 감사 로그를 필수로 가진다.
4. 관리자 역할은 `OPERATOR`, `ADMIN`, `SUPER_ADMIN` 경계로 분리하고 기능별 권한을 제한한다.
5. 사용자의 급여·예산·지출·저축 계산은 관리자 화면에서 직접 재계산하지 않고 서버 권위 API 결과만 사용한다.
6. 광고/제휴 타겟팅은 사용자의 금융 정보, 급여 정보, 지출 정보, 저축 정보, 납치 금액 기반으로 수행하지 않는다.
7. 개인정보 export, 탈퇴, 복구, 익명화, 영구 삭제는 정책 상태와 법적 보존 조건을 확인한 후 서버에서 처리한다.
8. 모든 export는 비식별·마스킹 기준을 기본으로 하며 raw financial data export는 금지한다.
9. 세션·refresh token·push token은 원문을 다루지 않고 hash 또는 집계로만 취급한다.
10. CS·신고·커뮤니티 제재와 사용자 계정 조치는 감사 가능해야 한다.

---

## 3. 기능 범위

### 3.1 사용자 목록

사용자 목록은 다음 조건으로 조회한다.

- 검색어: 사용자 표시명, masked email, user id, admin memo, hash 기반 검색
- 역할 필터: `USER`, `OPERATOR`, `ADMIN`, `SUPER_ADMIN`
- 상태 필터: `ACTIVE`, `PENDING`, `LOCKED`, `SUSPENDED`, `WITHDRAWN`, `DELETED`
- 위험도 필터: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`
- 동의/개인정보 요청 필터: `MARKETING_OPT_IN`, `MARKETING_OPT_OUT`, `PRIVACY_EXPORT_REQUESTED`, `WITHDRAWAL_REQUESTED`
- 정렬: 가입일, 수정일, 최근 접속, 위험 점수, 신고 수, 급여계획 수
- 페이지 크기: 기본 40개
- fetch 정책: `cache: "no-store"`, `credentials: "include"`

목록 응답은 반드시 마스킹·비식별 필드만 포함한다.

### 3.2 사용자 상세

상세 패널은 다음 정보를 표시한다.

- 사용자 ID
- 표시명
- masked email
- masked phone
- 역할
- 계정 상태
- MFA 활성 여부
- 이메일 인증 여부
- 마케팅 동의 상태
- 개인정보 export 요청일
- 탈퇴 요청일
- 최근 접속일
- 신고 수
- 위험 점수
- 급여계획 수, 예산계획 수, 저축목표 수
- 알림 토큰 hash 개수
- 최근 관리자 조치 사유
- 내부 운영 메모
- 개인정보·금융정보 노출 guard 상태

다음 정보는 표시하지 않는다.

- 실제 이메일 전체값
- 실제 전화번호 전체값
- 비밀번호 또는 password hash
- refresh token, access token, FCM token 원문
- 실제 급여액, 지출액, 저축액, 납치 금액
- 계좌번호, 카드번호, 급여명세서 파일 원문
- 광고 타겟팅 세그먼트 중 금융 정보 기반 값

### 3.3 관리자 조치

지원 조치는 다음과 같다.

| 조치                     | 설명                                     |   최소 권한 | 사유 필요 | 감사 로그 |
| ------------------------ | ---------------------------------------- | ----------: | --------: | --------: |
| `VERIFY_EMAIL`           | 이메일 인증 상태를 서버 정책에 따라 보정 |       ADMIN |      필수 |      필수 |
| `LOCK`                   | 계정 잠금                                |    OPERATOR |      필수 |      필수 |
| `UNLOCK`                 | 계정 잠금 해제                           |       ADMIN |      필수 |      필수 |
| `SUSPEND`                | 계정 정지                                |       ADMIN |      필수 |      필수 |
| `RESTORE`                | 계정 복구                                |       ADMIN |      필수 |      필수 |
| `FORCE_LOGOUT`           | 활성 세션 무효화                         |    OPERATOR |      필수 |      필수 |
| `REVOKE_TOKENS`          | refresh/session token 폐기               |       ADMIN |      필수 |      필수 |
| `REQUEST_PASSWORD_RESET` | 비밀번호 재설정 플로우 발송              |       ADMIN |      필수 |      필수 |
| `EXPORT_REDACTED`        | 비식별 사용자 데이터 export              |       ADMIN |      필수 |      필수 |
| `ANONYMIZE`              | 탈퇴/삭제 사용자 익명화                  | SUPER_ADMIN |      필수 |      필수 |
| `HARD_DELETE`            | 정책 허용 시 영구 삭제                   | SUPER_ADMIN |      필수 |      필수 |

`ANONYMIZE`와 `HARD_DELETE`는 `WITHDRAWN` 또는 `DELETED` 상태에서만 허용한다. 법적 보존, 결제 분쟁, 보안 사고, 신고 조사, CS 티켓 보존 조건이 존재하면 서버가 거부해야 한다.

---

## 4. API 계약

### 4.1 목록 조회

`GET /admin/api/v1/users`

쿼리 파라미터:

- `q`: 검색어
- `role`: 역할
- `status`: 계정 상태
- `risk`: 위험도
- `consent`: 동의/개인정보 요청 상태
- `sort`: 정렬 키
- `limit`: 페이지 크기
- `cursor`: 다음 페이지 커서

응답 예시:

```json
{
  "data": {
    "items": [
      {
        "id": "usr_01HX...",
        "displayName": "사용자A",
        "maskedEmail": "us***@example.com",
        "maskedPhone": "010-****-1234",
        "role": "USER",
        "status": "ACTIVE",
        "riskLevel": "LOW",
        "consentState": "MARKETING_OPT_OUT",
        "mfaEnabled": true,
        "emailVerified": true,
        "payrollPlanCount": 2,
        "budgetPlanCount": 4,
        "savingsGoalCount": 3,
        "notificationTokenHashCount": 1,
        "reportCount": 0,
        "riskScore": 0,
        "lastSeenAt": "2026-06-23T02:15:00.000Z",
        "createdAt": "2026-01-01T00:00:00.000Z",
        "updatedAt": "2026-06-23T02:15:00.000Z",
        "withdrawalRequestedAt": null,
        "privacyExportRequestedAt": null,
        "adminMemo": null,
        "lastAdminActionReason": null,
        "rawFinancialDataExposed": false,
        "rawPersonalDataExposed": false,
        "rawPushTokenLogged": false,
        "adsFinancialTargetingUsed": false,
        "auditReasonRequired": true
      }
    ],
    "total": 1,
    "stats": {
      "total": 1,
      "active": 1,
      "locked": 0,
      "suspended": 0,
      "withdrawn": 0,
      "highRisk": 0,
      "privacyExportRequested": 0,
      "privacyPassRate": "100.00%"
    }
  }
}
```

### 4.2 사용자 조치

`POST /admin/api/v1/users/{userId}/{action}`

필수 헤더:

- `X-Admin-Reason`: 관리자 조치 사유
- `X-Raw-Financial-Data-Exposed: false`
- `X-Raw-Personal-Data-Exposed: false`
- `X-Raw-Push-Token-Logged: false`
- `X-Ad-Financial-Targeting-Used: false`

요청 본문:

```json
{
  "action": "LOCK",
  "reason": "비정상 로그인 시도 다수 감지",
  "memo": "CS 티켓 cs_123과 연결",
  "rawFinancialDataExposed": false,
  "rawPersonalDataExposed": false,
  "rawPushTokenLogged": false,
  "adsFinancialTargetingUsed": false
}
```

응답은 변경 후 사용자 상태를 마스킹 기준으로 반환한다.

### 4.3 비식별 export

`POST /admin/api/v1/users/exports/redacted`

비식별 export는 다음 조건을 지킨다.

- raw email/phone 미포함
- raw token 미포함
- 급여·지출·저축·납치 금액 미포함
- 통계/집계/마스킹 값만 포함
- export 요청자, 사유, 필터, 시각, 결과 파일 ID를 감사 로그에 저장
- R2 또는 내부 object storage에 저장 시 만료 정책 적용

---

## 5. 데이터 모델

`UserRow`의 UI 모델은 다음 필드만 사용한다.

```ts
export type UserRow = {
  id: string;
  displayName: string;
  maskedEmail: string;
  maskedPhone: string | null;
  role: "USER" | "OPERATOR" | "ADMIN" | "SUPER_ADMIN";
  status: "ACTIVE" | "PENDING" | "LOCKED" | "SUSPENDED" | "WITHDRAWN" | "DELETED";
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  consentState: "MARKETING_OPT_IN" | "MARKETING_OPT_OUT" | "PRIVACY_EXPORT_REQUESTED" | "WITHDRAWAL_REQUESTED";
  mfaEnabled: boolean;
  emailVerified: boolean;
  payrollPlanCount: number;
  budgetPlanCount: number;
  savingsGoalCount: number;
  notificationTokenHashCount: number;
  reportCount: number;
  riskScore: number;
  lastSeenAt: string | null;
  createdAt: string;
  updatedAt: string;
  withdrawalRequestedAt: string | null;
  privacyExportRequestedAt: string | null;
  adminMemo: string | null;
  lastAdminActionReason: string | null;
  rawFinancialDataExposed: false;
  rawPersonalDataExposed: false;
  rawPushTokenLogged: false;
  adsFinancialTargetingUsed: false;
  auditReasonRequired: true;
};
```

관리자 화면에서 이 모델 외의 raw 사용자 데이터가 필요하면 API 설계 오류로 본다.

---

## 6. 서버 권위와 금융 데이터 경계

사용자 관리 기능은 금융 계산을 직접 수행하지 않는다. 다음 계산식은 서버 도메인에서만 확정한다.

```txt
planned_total_expense = fixed_expense + daily_living_budget + planned_other_expense
expected_hijack = max(0, expected_salary - planned_total_expense)
today_remaining_budget = max(0, daily_limit - today_variable_expense)
monthly_actual_hijack = max(0, actual_income + carry_over - actual_expense - actual_savings)
```

관리자 사용자 화면에는 위 계산식의 raw input/output 값을 직접 표시하지 않는다. 필요한 경우 사용자별 존재 여부, 계정 수, 동기화 상태, 오류 상태, 집계 카운트만 표시한다.

---

## 7. 권한 정책

### 7.1 역할

- `OPERATOR`: 목록 조회, 세션 강제 로그아웃, 계정 잠금 등 1차 운영 조치
- `ADMIN`: 계정 복구, 정지, 토큰 폐기, 비식별 export, 비밀번호 재설정 요청
- `SUPER_ADMIN`: 관리자 권한 조정, 익명화, 영구 삭제, 고위험 복구 승인

### 7.2 관리자 보호 규칙

1. 자기 자신의 `SUPER_ADMIN` 권한을 낮추거나 삭제할 수 없다.
2. 마지막 `SUPER_ADMIN` 계정은 삭제·정지·권한 강등할 수 없다.
3. 관리자 계정 조치는 일반 사용자보다 더 높은 감사 로그 상세도를 가진다.
4. MFA 미검증 세션은 조회성 화면 이외의 조치를 실행할 수 없다.
5. 변경성 조치는 항상 CSRF, SameSite cookie, session binding, IP/UA hash 검사를 통과해야 한다.

---

## 8. 개인정보·보안 보호 기준

### 8.1 마스킹

- 이메일: `us***@example.com`
- 전화번호: `010-****-1234`
- IP: hash only
- User-Agent: hash only
- 계좌/카드: 표시 금지
- push token: hash count만 표시

### 8.2 로그 금지

다음 값은 console, audit detail, error stack, export, analytics에 남기지 않는다.

- password, passwordHash
- access token, refresh token, FCM token
- service secret, JWT secret
- 실제 급여액, 지출액, 저축액, 납치액
- 계좌번호, 카드번호, 급여명세서 원문
- 주민번호 등 고유식별정보

### 8.3 오류 응답

오류 응답은 표준 error envelope을 사용하고 내부 stack, SQL, secret, raw request body를 노출하지 않는다.

---

## 9. 동의·광고·제휴 정책

사용자 관리 기능은 광고/제휴와 연결된 상태를 확인할 수 있지만 금융 정보 기반 타겟팅을 만들거나 수정하지 않는다.

허용:

- 마케팅 수신 동의 여부 확인
- contextual segment 운영 상태 확인
- 비식별 집계 수치 확인
- 광고/제휴 노출 이력의 비식별 집계 확인

금지:

- 급여액 기반 광고 타겟팅
- 지출 카테고리 기반 민감 광고 타겟팅
- 저축 가능액 기반 금융상품 타겟팅
- 납치 금액 기반 대출/투자 광고 타겟팅
- 사용자 식별자 또는 raw 금융 이벤트를 광고주에게 전달

모든 광고/제휴 화면에는 `광고` 또는 `제휴` 라벨을 명확히 표시해야 한다.

---

## 10. 탈퇴·복구·익명화·영구 삭제

사용자 삭제 정책은 단계적으로 처리한다.

1. `WITHDRAWAL_REQUESTED`: 사용자가 탈퇴를 요청한 상태
2. `WITHDRAWN`: 서비스 이용이 중단되고 로그인 불가 상태
3. `ANONYMIZED`: 개인 식별 필드 제거, 운영 통계는 비식별 유지
4. `DELETED`: 법적 보존 만료 후 삭제 가능 상태
5. `HARD_DELETED`: 영구 삭제 완료

삭제/익명화 전 서버는 다음을 확인한다.

- 법적 보존 기간
- 결제/환불/분쟁 여부
- 보안 사고 조사 여부
- 신고/제재/CS 티켓 미종결 여부
- 개인정보 export 요청 처리 여부
- R2 업로드 파일 정리 여부
- 알림 토큰 정리 여부
- 커뮤니티 작성물 정책 처리 여부

---

## 11. 감사 로그

모든 관리자 조치는 다음 감사 필드를 가진다.

- auditId
- actorAdminId
- actorRole
- action
- targetUserId
- targetType: `USER`
- reason
- memo
- beforeState hash
- afterState hash
- requestId
- ipHash
- userAgentHash
- createdAt
- privacyGuard result
- rawFinancialDataExposed: false
- rawPushTokenLogged: false
- adsFinancialTargetingUsed: false

감사 로그는 관리자가 수정하거나 삭제할 수 없다. 보존 기간은 운영·법무 정책에 따른다.

---

## 12. UI/UX 기준

사용자 관리 화면은 다음 경험을 제공한다.

- 모바일·태블릿·데스크톱 반응형
- 목록/상세 2패널 구조
- 필터/검색/정렬 일관성
- 관리자 조치 전 사유 입력 안내
- 위험도/상태/권한 badge 표시
- 개인정보 guard 상태 표시
- 비식별 export 버튼 분리
- 고위험 조치에 대한 시각적 경고
- 빈 목록/오류/로딩 상태 명확화
- 키보드 접근 가능성
- no-store fetch로 관리자 데이터 캐시 방지

현재 프로젝트에서 React/JSX 타입 의존 오류가 반복 확인되었기 때문에 `page.tsx` 구현은 React import와 JSX 문법 없이 DOM API 기반으로 작성하는 패턴을 사용한다. 추후 저장소의 React/Next 타입 구성이 정상화되면 공통 컴포넌트 기반 JSX 구현으로 전환할 수 있으나, 기능 정책과 보안 경계는 동일하게 유지해야 한다.

---

## 13. 테스트 기준

### 13.1 정적 검증

- TypeScript strict 통과
- `noImplicitAny` 통과
- `exactOptionalPropertyTypes` 통과
- `noUncheckedIndexedAccess` 통과
- `noUnusedLocals` 통과
- `noUnusedParameters` 통과
- React import 없이 컴파일 가능
- JSX compiler option 없이 컴파일 가능

### 13.2 API 테스트

- 목록 조회 성공
- 필터별 조회 성공
- 권한 없는 사용자 403
- MFA 미검증 변경 조치 403
- `X-Admin-Reason` 누락 시 400 또는 403
- raw 금융 데이터 포함 응답 차단
- raw push token 포함 응답 차단
- 광고 금융 타겟팅 플래그 true 요청 차단
- 비식별 export 생성 성공
- 익명화/영구삭제 정책 조건 검증

### 13.3 E2E 테스트

- 관리자가 로그인 후 사용자 목록 진입
- 검색/필터/정렬 동작
- 사용자 선택 후 상세 확인
- 사유 없는 조치 실패
- 사유 입력 후 잠금 조치 성공
- 감사 로그 생성 확인
- 비식별 export 요청 성공
- 고위험 사용자 정지/복구 시 권한 검증
- 탈퇴 사용자 익명화 정책 검증

---

## 14. 운영 모니터링

관찰해야 할 지표:

- 사용자 총 수
- 활성/잠금/정지/탈퇴/삭제 수
- 고위험 사용자 수
- 개인정보 export 요청 수
- 탈퇴 요청 수
- 관리자 조치 수
- 사유 누락으로 거부된 조치 수
- 권한 부족으로 거부된 조치 수
- 토큰 폐기 요청 수
- 강제 로그아웃 요청 수
- 익명화/영구삭제 성공·실패 수
- privacy guard pass rate
- audit log write failure 수

경보 조건:

- `CRITICAL` 사용자 급증
- 관리자 조치 실패율 증가
- 감사 로그 저장 실패
- raw data guard 실패
- 비정상적인 export 요청 증가
- 관리자 계정 권한 변경 급증

---

## 15. 완료 기준

이 기능은 다음 조건을 만족할 때 문서상·이론상 완료로 본다.

- 사용자 목록/상세/조치/비식별 export/탈퇴·익명화 정책이 문서화됨
- 관리자 권한/RBAC/MFA 경계가 문서화됨
- `X-Admin-Reason`과 감사 로그가 필수로 정의됨
- raw 금융 데이터, raw 개인정보, raw push token 노출 금지가 명시됨
- 광고 금융 타겟팅 금지가 명시됨
- 서버 권위 계산식과 UI 표시 경계가 명확함
- API 계약과 응답 guard 필드가 정의됨
- 테스트 기준과 운영 모니터링 기준이 정의됨
- 사용자 관리 페이지와 API가 이 문서를 기준으로 구현 가능함

운영 환경에서의 최종 완료는 실제 저장소의 관리자 인증/RBAC/MFA, `/admin/api/v1/users`, 개인정보 export/익명화/삭제 워커, 감사 로그 저장소, R2 정리, 토큰 폐기, staging/production E2E/QA가 함께 통과해야 확정된다.

---

## 16. 자체 검증 체크리스트

- [x] 급여납치 관리자 사용자 관리 목적 반영
- [x] 사용자 목록/상세 기능 반영
- [x] 권한·상태·위험도·동의 필터 반영
- [x] 관리자 조치 목록 반영
- [x] `X-Admin-Reason` 필수 반영
- [x] 감사 로그 필수 반영
- [x] 개인정보 마스킹 반영
- [x] raw 금융 데이터 금지 반영
- [x] raw push token 금지 반영
- [x] 광고 금융 타겟팅 금지 반영
- [x] 개인정보 export 반영
- [x] 탈퇴·익명화·영구 삭제 정책 반영
- [x] 서버 권위 계산 경계 반영
- [x] API 계약 반영
- [x] 테스트 기준 반영
- [x] 운영 모니터링 기준 반영
- [x] 관리자 콘솔 UI/UX 기준 반영
- [x] 문서상·이론상 파일 단위 최종본 기준 반영
