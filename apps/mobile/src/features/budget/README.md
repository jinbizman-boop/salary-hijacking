# Budget Feature Module README

> 경로: `apps/mobile/src/features/budget`  
> 대상: 급여납치 모바일 앱의 **일일 예산, 남은 금액, 예산 초과 감지/안내 모듈**  
> 기준 버전: `v3.1.0`  
> 상태: 문서상·이론상 파일 단위 최종본

## 1. 모듈 목적

`budget` 기능 모듈은 급여납치 모바일 앱에서 사용자가 급여 이후 남은 생활비를 하루 단위로 안전하게 관리하도록 돕는 핵심 모듈이다. 이 모듈은 사용자가 직접 계산하지 않아도 서버가 확정한 일일 예산과 지출 합계를 기반으로 남은 금액, 예산 초과 여부, 위험 단계, 안내 메시지, 다음 행동을 제공한다.

이 모듈은 단순 가계부 UI가 아니라 급여납치 플랫폼의 서버 권위 계산 원칙에 따라 급여, 고정지출, 고정저축, 변동지출, 알림, LV UP, 광고·제휴 정책과 연결되는 모바일 도메인 모듈이다.

## 2. 적용 범위

이 README는 다음 파일군의 구현·운영 기준을 정의한다.

```text
apps/mobile/src/features/budget/
├─ README.md
├─ api.ts
├─ constants.ts
├─ hooks.ts
├─ selectors.ts
├─ types.ts
├─ utils.ts
├─ validation.ts
├─ components/
│  ├─ DailyBudgetCard.tsx
│  ├─ RemainingAmountCard.tsx
│  ├─ BudgetRiskBadge.tsx
│  ├─ BudgetProgressBar.tsx
│  ├─ OverspendNotice.tsx
│  └─ BudgetSkeleton.tsx
└─ __tests__/
   ├─ budget.selectors.test.ts
   ├─ budget.utils.test.ts
   └─ budget.validation.test.ts
```

실제 프로젝트에서 일부 파일명이 다르더라도 이 README의 계약을 만족해야 `budget` 기능 모듈이 완성된 것으로 본다.

## 3. 핵심 기능

### 3.1 일일 예산 조회

- 서버가 계산한 오늘의 일일 예산을 조회한다.
- 사용자의 로컬 단말에서 급여, 지출, 저축 금액을 임의 재계산하지 않는다.
- 오늘 날짜 기준은 표시상 `Asia/Seoul`을 사용하되 서버 저장 기준은 UTC 타임스탬프를 따른다.
- 서버 응답에는 원시 급여 정보가 포함되지 않아야 한다.

### 3.2 남은 금액 표시

- 남은 금액은 서버가 확정한 `dailyLimit`과 오늘의 변동지출 합계 `spentToday`를 기반으로 표시한다.
- 화면 표시는 항상 0원 미만으로 내려가지 않도록 `max(0, dailyLimit - spentToday)`를 적용한다.
- 실제 초과 금액은 `overspentAmount = max(0, spentToday - dailyLimit)`로 분리한다.

### 3.3 예산 초과 감지

- 예산 사용률을 계산해 정상, 주의, 위험, 초과 상태를 표시한다.
- 초과 상태에서는 사용자를 비난하지 않고 다음 행동을 안내한다.
- 금액 기반 광고 타겟팅은 절대 수행하지 않는다.

### 3.4 알림 연동

- 일일 예산 위험 단계가 `WARNING` 이상이면 알림 모듈이 사용할 수 있는 이벤트를 생성한다.
- 푸시 알림에는 원시 급여·계좌·카드·상세 지출 내역을 포함하지 않는다.
- 푸시 토큰은 이 모듈에서 직접 저장하거나 로깅하지 않는다.

### 3.5 급여 홈 연동

- 급여 홈 화면은 이 모듈의 selector를 통해 오늘 남은 금액, 예산 사용률, 위험 단계를 표시할 수 있다.
- 급여 홈에서 상세 예산 화면으로 이동할 때는 서버 권위 응답을 다시 확인해야 한다.

### 3.6 LV UP 연동

- 예산을 지킨 날, 예산 확인 루틴을 완료한 날, 변동지출을 직접 기록한 날은 LV UP 모듈에 안전한 이벤트로 전달할 수 있다.
- LV UP 인증글에는 원시 금액을 포함하지 않고 “오늘 예산 확인 완료”, “지출 기록 완료” 같은 비금융 표현을 사용한다.

## 4. 서버 권위 원칙

이 모듈은 아래 원칙을 반드시 따른다.

1. 클라이언트는 급여·예산·지출의 최종 원장을 소유하지 않는다.
2. 클라이언트 계산은 표시 보조용이며 최종 판단은 서버 응답을 따른다.
3. KRW 금액은 정수만 허용한다.
4. 음수 금액, 소수 금액, `NaN`, `Infinity`는 모두 0 또는 안전한 fallback으로 정규화한다.
5. 원시 급여, 계좌, 카드, 신용, 대출, 부채 데이터는 화면·로그·알림·광고 이벤트에 노출하지 않는다.
6. 광고·제휴는 금액 기반 타겟팅을 사용하지 않고 화면 맥락 기반 contextual 방식만 허용한다.
7. 오류 메시지는 민감정보를 redaction한 후 표시한다.

## 5. 핵심 계산식

### 5.1 남은 일일 예산

```ts
const todayRemainingBudget = Math.max(0, dailyLimit - spentToday);
```

### 5.2 예산 초과 금액

```ts
const overspentAmount = Math.max(0, spentToday - dailyLimit);
```

### 5.3 예산 사용률

```ts
const usageRate = dailyLimit > 0 ? Math.min(999, (spentToday / dailyLimit) * 100) : 0;
```

### 5.4 위험 단계

```ts
type BudgetRiskLevel = "SAFE" | "WATCH" | "WARNING" | "OVER";

function resolveBudgetRiskLevel(usageRate: number): BudgetRiskLevel {
  if (usageRate >= 100) return "OVER";
  if (usageRate >= 85) return "WARNING";
  if (usageRate >= 65) return "WATCH";
  return "SAFE";
}
```

## 6. 데이터 타입 계약

### 6.1 DailyBudgetSnapshot

```ts
export type DailyBudgetSnapshot = Readonly<{
  date: string;
  timezone: "Asia/Seoul";
  currency: "KRW";
  dailyLimit: number;
  spentToday: number;
  remainingToday: number;
  overspentAmount: number;
  usageRate: number;
  riskLevel: "SAFE" | "WATCH" | "WARNING" | "OVER";
  fixedExpenseReflected: boolean;
  savingsReflected: boolean;
  variableExpenseReflected: boolean;
  serverCalculatedAt: string;
  rawFinancialDataExposed: false;
  rawPersonalDataExposed: false;
  adsFinancialTargetingUsed: false;
}>;
```

### 6.2 BudgetActionHint

```ts
export type BudgetActionHint = Readonly<{
  id: string;
  title: string;
  description: string;
  severity: "INFO" | "SUCCESS" | "WARNING" | "CRITICAL";
  route: string | null;
  eventName: string;
  rawFinancialDataExposed: false;
}>;
```

### 6.3 BudgetApiResponse

```ts
export type BudgetApiResponse = Readonly<{
  data: {
    snapshot: DailyBudgetSnapshot;
    hints: readonly BudgetActionHint[];
  };
  error?: never;
}>;
```

## 7. API 계약

### 7.1 오늘 예산 조회

```http
GET /api/v1/daily-budgets/today
```

요구사항:

- 인증 필요.
- 응답은 서버 권위 계산 결과여야 한다.
- 급여 원시 금액, 계좌, 카드, 대출, 부채, 푸시 토큰을 포함하지 않는다.
- 응답 헤더 또는 본문에 `rawFinancialDataExposed=false` 의미를 유지한다.

### 7.2 예산 재계산 요청

```http
POST /api/v1/daily-budgets/recalculate
```

요구사항:

- 급여 계획, 고정지출, 고정저축, 변동지출 변경 이후 서버 재계산을 요청한다.
- 클라이언트는 재계산 결과를 낙관적으로 확정하지 않는다.
- 서버 응답 도착 전에는 loading 또는 stale 상태를 표시한다.

### 7.3 예산 확인 완료 이벤트

```http
POST /api/v1/growth/events
```

권장 payload:

```json
{
  "type": "DAILY_BUDGET_CHECKED",
  "source": "mobile_budget_feature",
  "rawFinancialDataExposed": false,
  "adsFinancialTargetingUsed": false
}
```

## 8. 화면 상태

### 8.1 Loading

- 스켈레톤 카드 표시.
- 금액 placeholder에는 실제 숫자를 임의 생성하지 않는다.

### 8.2 Ready

- 일일 예산, 사용 금액, 남은 금액, 위험 단계, 안내 문구 표시.
- 남은 금액은 강조하되 과소비를 조롱하거나 압박하는 표현을 사용하지 않는다.

### 8.3 Empty

- 급여 계획 또는 일일 예산이 아직 설정되지 않은 상태.
- 계획 설정 화면으로 이동하는 CTA를 제공한다.

### 8.4 Stale

- 네트워크 실패 또는 서버 응답 지연으로 이전 snapshot을 표시하는 상태.
- “마지막 동기화 기준” 문구를 함께 표시한다.

### 8.5 Error

- 민감정보가 제거된 오류 메시지만 표시한다.
- 재시도 CTA를 제공한다.

## 9. UI/UX 원칙

- 한국어 우선 UX를 사용한다.
- 금액은 `Intl.NumberFormat('ko-KR')` 기반 KRW 표시를 사용한다.
- 접근성 role과 label을 제공한다.
- 위험 상태는 색상에만 의존하지 않고 텍스트 라벨을 함께 표시한다.
- 카드형 UI는 급여 홈, 계획 화면, 알림 화면과 일관된 톤을 유지한다.
- 모바일 작은 화면에서도 스크롤과 줄바꿈이 안정적으로 동작해야 한다.

## 10. 개인정보·광고 정책

이 모듈은 다음을 금지한다.

- 급여 원시 금액을 광고 이벤트에 전달.
- 지출 상세 내역을 제휴사 또는 광고 네트워크에 전달.
- 사용자 식별자, 이메일, 전화번호, 푸시 토큰을 로그에 기록.
- 예산 초과 여부를 금융상품 타겟팅에 사용.
- 대출, 카드론, 고위험 금융상품을 예산 초과 상태에 맞춰 추천.

허용되는 광고·제휴 방식은 다음뿐이다.

- 화면 맥락 기반 contextual placement.
- 비개인화 또는 익명 집계 기반 노출.
- `광고`, `제휴` 라벨 명시.
- 원시 금융 데이터가 아닌 안전한 카테고리 수준의 화면 맥락만 사용.

## 11. 오류 처리 기준

오류 메시지는 다음 키워드를 redaction한다.

```text
password, token, secret, authorization, cookie, email, phone,
account, card, salary, payroll, income, expense, savings,
amount, hijack, loan, debt, push, fcm,
비밀번호, 토큰, 이메일, 전화, 계좌, 카드, 급여, 월급,
지출, 저축, 금액, 납치, 대출, 부채, 푸시
```

사용자에게 표시 가능한 오류 예시는 다음과 같다.

```text
예산 정보를 불러오지 못했습니다. 잠시 후 다시 시도하세요.
예산 상태가 변경되었습니다. 새로고침하세요.
로그인이 필요합니다.
```

## 12. 테스트 기준

### 12.1 단위 테스트

필수 테스트:

- `dailyLimit=10000`, `spentToday=3000`이면 `remainingToday=7000`.
- `dailyLimit=10000`, `spentToday=12000`이면 `remainingToday=0`, `overspentAmount=2000`.
- 소수·음수·NaN 금액은 정수 0 또는 안전한 정수로 정규화.
- `usageRate` 100 이상은 `OVER`.
- 민감 오류 메시지는 redaction.
- 광고 이벤트 payload에 raw 금액이 없어야 함.

### 12.2 통합 테스트

필수 테스트:

- `/api/v1/daily-budgets/today` 성공 응답 렌더링.
- 401이면 로그인 흐름으로 연결.
- 409이면 재조회 안내.
- 네트워크 실패 시 stale snapshot 표시.
- 예산 초과 상태에서 알림 이벤트 생성 가능.

### 12.3 E2E 테스트

필수 시나리오:

1. 사용자가 급여 계획을 생성한다.
2. 고정지출과 고정저축을 등록한다.
3. 일일 예산이 서버에서 계산된다.
4. 변동지출을 기록한다.
5. 남은 금액과 초과 여부가 갱신된다.
6. 위험 단계에 맞는 알림이 표시된다.
7. LV UP 예산 확인 루틴이 완료된다.
8. 광고·제휴 이벤트에 원시 금융 데이터가 포함되지 않는다.

## 13. 성능 기준

- 예산 카드 최초 렌더링은 모바일 일반 환경에서 체감 지연이 없어야 한다.
- selector는 불필요한 재계산을 피해야 한다.
- 네트워크 요청은 중복 호출을 방지한다.
- 큰 지출 목록은 화면 레벨에서 pagination 또는 virtualization을 사용한다.
- 로그에는 correlation id만 남기고 원시 금융 데이터는 남기지 않는다.

## 14. 보안 체크리스트

- [x] 서버 권위 계산 원칙 반영.
- [x] KRW 정수 금액 원칙 반영.
- [x] 음수·소수·NaN 방어 기준 반영.
- [x] raw 금융 데이터 노출 금지.
- [x] raw 개인정보 노출 금지.
- [x] 광고 금융 타겟팅 금지.
- [x] 푸시 토큰 노출 금지.
- [x] 민감 오류 redaction 기준 반영.
- [x] stale/offline 상태 기준 반영.
- [x] E2E/QA 시나리오 반영.

## 15. 개발 규칙

- `types.ts`에는 도메인 타입만 둔다.
- `api.ts`에는 `/api/v1` 호출 함수만 둔다.
- `selectors.ts`에는 순수 계산 selector만 둔다.
- `utils.ts`에는 포맷팅·정규화 유틸만 둔다.
- `validation.ts`에는 입력·응답 검증만 둔다.
- 컴포넌트는 비즈니스 계산을 직접 수행하지 않고 selector 결과를 표시한다.
- 화면 라우팅은 Expo Router 레이어에서 수행하고 feature 모듈은 라우트 문자열만 노출한다.

## 16. 운영 기준

상용 운영에서는 다음 항목이 함께 충족되어야 한다.

- API 인증·인가 통과.
- 서버 권위 예산 계산 통과.
- 알림 정책 통과.
- 광고·제휴 개인정보 정책 통과.
- Expo 빌드 통과.
- 모바일 E2E 통과.
- 장애 상황에서 stale/offline 표시 통과.
- 운영 로그에서 민감정보 비노출 검증 통과.

## 17. 완료 판정

이 README 기준으로 `budget` 기능 모듈은 문서상·이론상 다음 요구사항을 모두 만족해야 한다.

- 일일 예산 조회.
- 남은 금액 계산 및 표시.
- 예산 초과 감지.
- 급여 홈 연동.
- 변동지출 연동.
- 알림 연동.
- LV UP 연동.
- 서버 권위 계산 원칙.
- KRW 정수 금액 원칙.
- 개인정보·광고 안전 경계.
- 한국어 모바일 UX.
- 테스트·E2E·운영 기준.

파일 단위로는 이 문서가 `apps/mobile/src/features/budget` 모듈의 구현 기준, 테스트 기준, 보안 기준, 운영 기준을 빠짐없이 정의한다. 실제 운영 기준의 프로젝트 종합 100% 확정은 구현 파일, API, DB, 알림, Expo 빌드, E2E/QA까지 함께 통과해야 한다.
