# Expense Feature Module README

> 경로: `apps/mobile/src/features/expense`  
> 대상: 급여납치 모바일 앱의 **고정지출·변동지출·지출 기록·초과 감지·지출 분석 모듈**  
> 기준 버전: `v3.1.0`  
> 상태: 문서상·이론상 파일 단위 최종본

## 1. 모듈 목적

`expense` 기능 모듈은 급여납치 모바일 앱에서 사용자가 급여 이후 발생하는 모든 지출을 서버 권위 기준으로 안전하게 기록·조회·분석하도록 돕는 핵심 모듈이다. 이 모듈은 고정지출과 변동지출을 분리하고, 일일 예산과 급여 계획에 반영되는 지출 이벤트를 표준화하며, 예산 초과·납치 가능액 감소·저축 계획 영향까지 연결한다.

이 모듈은 단순 지출 입력 UI가 아니라 급여, 예산, 고정지출, 고정저축, 일일 예산, 알림, LV UP, 커뮤니티, 광고·제휴 정책과 연결되는 모바일 도메인 모듈이다. 클라이언트는 사용자의 편의를 위한 임시 입력과 표시 보조만 수행하며, 지출 확정과 월별 정산은 서버가 최종 권위를 가진다.

## 2. 적용 범위

이 README는 다음 파일군의 구현·운영 기준을 정의한다.

```text
apps/mobile/src/features/expense/
├─ README.md
├─ api.ts
├─ constants.ts
├─ hooks.ts
├─ selectors.ts
├─ types.ts
├─ utils.ts
├─ validation.ts
├─ redaction.ts
├─ analytics.ts
├─ components/
│  ├─ ExpenseInputForm.tsx
│  ├─ ExpenseList.tsx
│  ├─ ExpenseItem.tsx
│  ├─ ExpenseCategoryPicker.tsx
│  ├─ ExpenseRiskBadge.tsx
│  ├─ FixedExpenseSummary.tsx
│  ├─ VariableExpenseSummary.tsx
│  └─ ExpenseSkeleton.tsx
└─ __tests__/
   ├─ expense.selectors.test.ts
   ├─ expense.utils.test.ts
   ├─ expense.validation.test.ts
   └─ expense.redaction.test.ts
```

실제 프로젝트에서 일부 파일명이 다르더라도 이 README의 계약을 만족해야 `expense` 기능 모듈이 완성된 것으로 본다.

## 3. 핵심 기능

### 3.1 변동지출 기록

- 사용자는 식비, 교통, 생활, 취미, 의료, 쇼핑, 기타 등 일상 지출을 변동지출로 기록한다.
- 금액은 KRW 정수만 허용한다.
- 0원 이하, 소수, `NaN`, `Infinity`, 비정상 문자열은 저장 요청 전에 거부하거나 안전한 fallback으로 정규화한다.
- 최종 저장, 수정, 삭제, 월별 집계 반영은 서버가 수행한다.
- 클라이언트는 성공 응답 전 원장 상태를 확정하지 않는다.

### 3.2 고정지출 참조

- 월세, 통신비, 보험료, 구독료, 교통 정기권 등 반복 지출은 고정지출 도메인의 서버 데이터를 참조한다.
- 이 모듈은 고정지출의 요약·다가오는 결제·결제 완료 표시를 노출할 수 있지만, 고정지출 계획의 최종 계산은 서버 또는 `fixed-expenses` API가 담당한다.
- 고정지출 결제 알림에는 계좌·카드·정확한 급여 원시 데이터가 포함되지 않는다.

### 3.3 일일 예산 반영

- 변동지출이 등록되면 일일 예산의 `spentToday`, `remainingToday`, `overspentAmount`, `usageRate`, `riskLevel`이 서버에서 재계산된다.
- 클라이언트는 `todayRemainingBudget = max(0, dailyLimit - spentToday)`를 표시 보조로만 사용할 수 있다.
- 지출 삭제 또는 수정 후에도 서버 재계산 결과를 다시 가져와야 한다.

### 3.4 지출 초과 감지

- 사용률에 따라 `SAFE`, `WATCH`, `WARNING`, `OVER` 상태를 표시한다.
- 초과 상태에서도 사용자를 비난하지 않고 다음 행동을 안내한다.
- 예산 초과와 납치 가능액 감소는 서버가 계산한 안전한 요약값만 표시한다.

### 3.5 알림 연동

- 고정지출 예정일, 변동지출 과다, 일일 예산 초과, 월말 정산 위험은 알림 모듈에 안전한 이벤트로 전달된다.
- 푸시 알림에는 원시 급여·계좌·카드·상세 결제 내역·푸시 토큰을 포함하지 않는다.
- 사용자의 quiet hours, 동의 상태, 필수 공지 정책을 따른다.

### 3.6 LV UP 연동

- 지출 기록 완료, 예산 확인, 초과 후 회복 액션, 고정지출 점검은 LV UP 성장 이벤트로 연결될 수 있다.
- LV UP 인증글에는 실제 금액을 포함하지 않고 “오늘 지출 기록 완료”, “예산 점검 완료”, “고정지출 정리 완료” 같은 비금융 표현을 사용한다.

### 3.7 커뮤니티 연동

- 사용자는 지출 습관을 커뮤니티에 공유할 수 있지만 원시 금액, 상호명, 카드번호, 계좌, 개인 식별 정보는 공유하지 않는다.
- 커뮤니티 인증에는 `maskedAmountLabel`, `rangeLabel`, `serverComputedBadge` 같은 비식별 표현만 허용한다.

### 3.8 광고·제휴 경계

- 지출 금액, 급여액, 저축액, 납치 가능액, 초과 금액을 광고 타겟팅에 사용하지 않는다.
- 광고·제휴는 화면 맥락 기반 contextual 방식만 허용한다.
- 광고주에게 사용자 식별자, raw 지출 데이터, 금융 행동 데이터, 푸시 토큰을 전달하지 않는다.

## 4. 서버 권위 원칙

1. 지출 원장의 최종 생성·수정·삭제·집계는 서버가 결정한다.
2. 모바일 클라이언트는 지출 계산 결과를 영구 원장으로 확정하지 않는다.
3. KRW 금액은 정수만 허용한다.
4. 모든 날짜 저장은 UTC 타임스탬프를 기준으로 하며, 화면 표시는 `Asia/Seoul`을 사용한다.
5. 클라이언트는 급여·예산·저축·지출 요약을 표시할 수 있지만 원시 급여·계좌·카드·대출·부채 정보는 저장·로그·알림·광고 이벤트에 노출하지 않는다.
6. `x-correlation-id`를 포함해 API 요청 추적성을 유지한다.
7. 오류 메시지는 민감정보를 redaction한 뒤 표시한다.
8. 모든 쓰기 요청은 인증, rate limit, 서버 validation, audit log, idempotency 정책을 통과해야 한다.

## 5. 핵심 계산식

### 5.1 오늘 변동지출 합계

```ts
const spentToday = variableExpenses.filter((expense) => expense.spentDate === today).reduce((sum, expense) => sum + expense.amount, 0);
```

### 5.2 남은 일일 예산

```ts
const todayRemainingBudget = Math.max(0, dailyLimit - spentToday);
```

### 5.3 예산 초과 금액

```ts
const overspentAmount = Math.max(0, spentToday - dailyLimit);
```

### 5.4 지출 사용률

```ts
const usageRate = dailyLimit > 0 ? Math.min(999, (spentToday / dailyLimit) * 100) : 0;
```

### 5.5 월간 실제 납치 금액 영향

```ts
const monthlyActualHijack = Math.max(0, actualIncome + carryOver - actualExpense - actualSavings);
```

클라이언트는 위 계산을 UX 보조로만 사용한다. 최종 월간 정산과 납치금 확정은 서버 응답을 따른다.

## 6. 데이터 타입 계약

### 6.1 ExpenseCategory

```ts
export type ExpenseCategory = "FOOD" | "CAFE" | "TRANSPORT" | "SHOPPING" | "LIVING" | "HEALTH" | "HOBBY" | "SUBSCRIPTION" | "FAMILY" | "ETC";
```

### 6.2 ExpenseKind

```ts
export type ExpenseKind = "FIXED" | "VARIABLE";
```

### 6.3 ExpenseStatus

```ts
export type ExpenseStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "DELETED";
```

### 6.4 ExpenseSnapshot

```ts
export type ExpenseSnapshot = Readonly<{
  id: string;
  kind: ExpenseKind;
  category: ExpenseCategory;
  title: string;
  amount: number;
  currency: "KRW";
  spentDate: string;
  timezone: "Asia/Seoul";
  status: ExpenseStatus;
  memoPreview: string | null;
  paymentMethodLabel: string | null;
  receiptAttachmentId: string | null;
  serverCalculatedAt: string;
  rawFinancialDataExposed: false;
  rawPersonalDataExposed: false;
  rawCardDataExposed: false;
  adsFinancialTargetingUsed: false;
}>;
```

### 6.5 ExpenseSummary

```ts
export type ExpenseSummary = Readonly<{
  date: string;
  month: string;
  currency: "KRW";
  fixedExpenseTotal: number;
  variableExpenseTotal: number;
  spentToday: number;
  dailyLimit: number;
  remainingToday: number;
  overspentAmount: number;
  usageRate: number;
  riskLevel: "SAFE" | "WATCH" | "WARNING" | "OVER";
  serverCalculatedAt: string;
  rawFinancialDataExposed: false;
  rawPersonalDataExposed: false;
  adsFinancialTargetingUsed: false;
}>;
```

### 6.6 ExpenseActionHint

```ts
export type ExpenseActionHint = Readonly<{
  id: string;
  title: string;
  description: string;
  severity: "INFO" | "SUCCESS" | "WARNING" | "CRITICAL";
  route: string | null;
  eventName: string;
  rawFinancialDataExposed: false;
}>;
```

## 7. API 계약

모든 API는 `/api/v1` prefix와 인증 세션을 사용한다. 공통 요청 헤더는 다음을 포함한다.

```http
x-client-platform: ios|android|web
x-correlation-id: <uuid>
x-raw-financial-data-exposed: false
x-raw-personal-data-exposed: false
x-raw-card-data-exposed: false
x-ad-financial-targeting-used: false
```

### 7.1 변동지출 목록 조회

```http
GET /api/v1/variable-expenses?date=YYYY-MM-DD&cursor=<cursor>&limit=30
```

요구사항:

- 인증 필요.
- 서버 권위 지출 목록과 일일 예산 반영 결과를 반환한다.
- 응답에는 원시 카드번호, 계좌번호, 급여 원시 데이터, 푸시 토큰을 포함하지 않는다.

### 7.2 변동지출 생성

```http
POST /api/v1/variable-expenses
```

권장 payload:

```json
{
  "category": "FOOD",
  "title": "점심",
  "amount": 12000,
  "spentDate": "2026-06-24",
  "memo": "간단 메모",
  "receiptAttachmentId": null,
  "rawFinancialDataExposed": false,
  "rawPersonalDataExposed": false,
  "rawCardDataExposed": false,
  "adsFinancialTargetingUsed": false
}
```

### 7.3 변동지출 수정

```http
PATCH /api/v1/variable-expenses/:expenseId
```

요구사항:

- 금액, 카테고리, 제목, 메모, 지출일 변경 후 서버가 일일 예산과 월간 정산을 재계산한다.
- 동시 수정 충돌은 서버가 `409`로 응답할 수 있다.
- 클라이언트는 충돌 시 최신 데이터를 재조회한다.

### 7.4 변동지출 삭제

```http
DELETE /api/v1/variable-expenses/:expenseId
```

요구사항:

- 실제 삭제 또는 soft delete 여부는 서버 정책을 따른다.
- 삭제 후 서버 재계산 결과를 다시 반영한다.
- 감사 로그에는 사용자, correlation id, 변경 사유, 변경 전후 요약이 남아야 한다.

### 7.5 지출 요약 조회

```http
GET /api/v1/variable-expenses/summary?date=YYYY-MM-DD
GET /api/v1/variable-expenses/monthly-summary?month=YYYY-MM
```

요구사항:

- 일일 예산, 월간 변동지출, 고정지출 반영 상태를 안전한 요약값으로 제공한다.
- 원시 급여 데이터는 포함하지 않는다.

### 7.6 고정지출 참조

```http
GET /api/v1/fixed-expenses
POST /api/v1/fixed-expenses/:fixedExpenseId/pay
```

요구사항:

- 고정지출 결제 완료 처리는 서버가 확정한다.
- 결제 계좌·카드 원문은 응답에 포함하지 않는다.

### 7.7 LV UP 이벤트

```http
POST /api/v1/growth/events
```

권장 payload:

```json
{
  "type": "EXPENSE_RECORDED",
  "source": "mobile_expense_feature",
  "rawFinancialDataExposed": false,
  "adsFinancialTargetingUsed": false
}
```

## 8. 화면 상태

### 8.1 Loading

- 목록, 요약, 입력 버튼은 skeleton 또는 loading 상태를 표시한다.
- 중복 제출을 막기 위해 저장 버튼은 비활성화한다.

### 8.2 Empty

- 오늘 지출이 없으면 긍정적 메시지를 표시한다.
- “아직 지출 기록이 없습니다. 오늘 예산을 지키고 있어요.”처럼 비난 없는 문구를 사용한다.

### 8.3 Error

- 서버 오류, 인증 오류, validation 오류를 구분한다.
- 오류 메시지에는 토큰, 계좌, 카드, 급여, 상세 금액이 노출되지 않아야 한다.

### 8.4 Offline

- 오프라인 상태에서는 마지막 안전 snapshot만 표시한다.
- 새 지출 생성은 임시 저장 또는 비활성화한다.
- 오프라인 큐를 사용할 경우 서버 동기화 전까지 원장 확정으로 표시하지 않는다.

### 8.5 Optimistic UX

- 입력 직후 화면 반응은 제공할 수 있으나 `PENDING` 상태로 표시한다.
- 서버 확정 전까지 일일 예산과 월간 납치금은 확정값으로 표시하지 않는다.

## 9. 입력 검증

### 9.1 금액 검증

- 금액은 `1` 이상의 KRW 정수여야 한다.
- 소수, 음수, 0, 공백, 통화기호만 있는 값은 거부한다.
- 큰 금액은 서버 한도 정책을 따른다.

### 9.2 제목·메모 검증

- 제목은 1자 이상 60자 이하를 권장한다.
- 메모는 500자 이하를 권장한다.
- 계좌번호, 카드번호, 전화번호, 이메일, 주민등록번호, 인증 토큰, 급여명세서 원문은 입력하지 않도록 안내한다.

### 9.3 카테고리 검증

- 허용된 카테고리만 저장한다.
- 알 수 없는 카테고리는 `ETC`로 fallback하거나 서버 validation 오류를 표시한다.

### 9.4 첨부 검증

- 영수증 첨부는 업로드 모듈의 스캔 결과가 `CLEAN`일 때만 표시한다.
- OCR 또는 이미지 분석 결과에 카드번호·계좌번호·개인정보가 포함되면 마스킹한다.

## 10. 개인정보·금융정보 보호

이 모듈에서 금지되는 정보는 다음과 같다.

- 급여 원문, 급여명세서 전문, 계좌번호, 카드번호, CVC, 주민등록번호
- 전화번호, 이메일, 주소, 실명 등 개인 식별 정보
- 푸시 토큰, 세션 토큰, 인증 토큰, 광고 식별자
- 대출, 부채, 신용정보의 원문
- 광고주 또는 제휴사에 전달 가능한 사용자별 지출 원장

허용되는 표현은 다음과 같다.

- `오늘 지출 기록 완료`
- `예산 사용률 주의`
- `고정지출 점검 필요`
- `금액 비공개 인증`
- `마스킹된 예산 범위`

## 11. Redaction 정책

다음 키워드가 포함된 키 또는 값은 로그·오류·분석 이벤트에서 redaction한다.

```text
password, token, secret, authorization, cookie, session, email, phone,
account, card, salary, payroll, income, expense, savings, amount, hijack,
loan, debt, push, fcm, deviceToken, 비밀번호, 토큰, 이메일, 전화,
계좌, 카드, 급여, 월급, 지출, 저축, 금액, 납치, 대출, 부채, 푸시
```

## 12. 분석 이벤트 계약

분석 이벤트는 행동 수준의 비식별 이벤트만 허용한다.

허용 이벤트:

```text
expense_list_viewed
expense_create_started
expense_create_succeeded
expense_create_failed
expense_update_succeeded
expense_delete_succeeded
expense_budget_warning_seen
expense_level_up_event_sent
```

금지 이벤트:

```text
expense_amount_logged
salary_amount_targeted
card_number_collected
raw_budget_sent_to_ad_partner
push_token_logged
```

모든 이벤트에는 다음 플래그를 포함한다.

```json
{
  "rawFinancialDataExposed": false,
  "rawPersonalDataExposed": false,
  "rawCardDataExposed": false,
  "adsFinancialTargetingUsed": false
}
```

## 13. 알림 이벤트 계약

알림 모듈로 전달 가능한 이벤트는 다음과 같다.

```ts
export type ExpenseNotificationEvent = Readonly<{
  type: "FIXED_EXPENSE_DUE" | "VARIABLE_EXPENSE_RECORDED" | "DAILY_BUDGET_WARNING" | "DAILY_BUDGET_OVER" | "MONTHLY_EXPENSE_REVIEW";
  severity: "INFO" | "SUCCESS" | "WARNING" | "CRITICAL";
  title: string;
  body: string;
  route: string;
  rawFinancialDataExposed: false;
  rawPersonalDataExposed: false;
  rawPushTokenExposed: false;
  adsFinancialTargetingUsed: false;
}>;
```

## 14. 테스트 기준

### 14.1 Unit Test

- 금액 정규화
- 카테고리 fallback
- 예산 초과 계산
- 위험 단계 계산
- redaction
- 날짜/타임존 처리
- selector 안정성

### 14.2 Integration Test

- 변동지출 생성 후 summary 재조회
- 변동지출 수정 후 일일 예산 반영
- 변동지출 삭제 후 월간 요약 반영
- 고정지출 참조 표시
- 알림 이벤트 생성
- LV UP 이벤트 생성

### 14.3 E2E Test

- 사용자가 지출을 기록하고 급여 홈에서 남은 예산이 갱신되는 흐름
- 예산 초과 시 알림함에 경고가 표시되는 흐름
- 오프라인 상태에서 안전 fallback이 표시되는 흐름
- 커뮤니티 인증글로 금액 없이 이동하는 흐름

## 15. 접근성 기준

- 모든 버튼은 명확한 `accessibilityRole`과 label을 가진다.
- 금액 변화는 색상만으로 표현하지 않고 텍스트로도 상태를 제공한다.
- 스크린리더에서 `남은 예산`, `예산 초과`, `지출 저장`, `지출 삭제`가 명확히 읽혀야 한다.
- 에러 메시지는 짧고 실행 가능한 문장으로 제공한다.

## 16. 성능 기준

- 목록은 페이지네이션 또는 cursor 기반 로딩을 사용한다.
- 대량 지출 목록은 memoized selector 또는 virtualized list를 사용한다.
- 저장 버튼 중복 클릭을 방지한다.
- API 실패 시 불필요한 무한 재시도를 하지 않는다.
- 이미지 영수증은 업로드 모듈에서 압축·검증 후 참조 ID만 사용한다.

## 17. 보안 기준

- 인증이 없는 상태에서 지출 API를 호출하지 않는다.
- 사용자 ID를 클라이언트에서 임의 지정하지 않는다.
- IDOR 방지를 위해 서버가 소유권을 검증한다.
- mutation 요청에는 correlation id와 idempotency key 사용을 권장한다.
- 관리자 또는 운영자 권한이 필요한 기능은 모바일 일반 사용자 모듈에 노출하지 않는다.

## 18. 완료 기준 체크리스트

- [x] 서버 권위 지출 원칙 정의
- [x] 변동지출 기록·수정·삭제 계약 정의
- [x] 고정지출 참조 계약 정의
- [x] 일일 예산 반영 계약 정의
- [x] 월간 납치금 영향 계산 경계 정의
- [x] KRW 정수·음수 방지 원칙 정의
- [x] API v1 경로 정의
- [x] 알림 연동 정의
- [x] LV UP 연동 정의
- [x] 커뮤니티 인증글 연동 정의
- [x] 광고·제휴 타겟팅 금지 정의
- [x] 개인정보·금융정보 redaction 정의
- [x] 오프라인·에러·로딩 상태 정의
- [x] 접근성 기준 정의
- [x] 테스트·E2E 기준 정의
- [x] 성능·보안 기준 정의

## 19. 운영 판정

이 문서는 `apps/mobile/src/features/expense` 모듈이 문서상·이론상 더 이상 보완 없이 구현될 수 있도록 기능, 데이터, API, 보안, 개인정보 보호, 광고·제휴 경계, 테스트, 접근성, 성능 기준을 정의한다.

파일 단위 README 기준으로는 최종본이다. 실제 프로젝트 종합 운영 완성도는 이 README를 기준으로 `api.ts`, `types.ts`, `hooks.ts`, 화면 파일, 백엔드 `/api/v1/variable-expenses`, `/api/v1/fixed-expenses`, `/api/v1/daily-budgets`, 알림·LV UP·커뮤니티 연동, Expo 빌드, E2E/QA가 함께 통과할 때 확정된다.
