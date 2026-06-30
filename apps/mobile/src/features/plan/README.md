# 급여납치 모바일 Plan Feature

`apps/mobile/src/features/plan`은 급여 계획, 고정지출, 고정저축, 생활비 계획을 하나의 서버 권위 계획 흐름으로 묶는 모바일 기능 모듈이다. 이 문서는 기능 요구사항, 데이터 경계, API 계약, UI/UX 정책, 검증 기준을 파일 단위에서 더 이상 보완이 필요 없도록 정리한 최종본이다.

## 1. 모듈 목적

Plan Feature의 목적은 사용자가 급여일 전후에 월급을 임의 소비하기 전에 고정지출, 고정저축, 생활비, 변동지출 예상치를 먼저 확정하고 남는 금액을 급여납치 금액으로 확인하도록 돕는 것이다. 모든 금액 계산은 모바일 클라이언트가 최종 판단하지 않고 서버 응답을 기준으로 표시한다.

핵심 목표는 다음과 같다.

- 급여 계획 등록, 조회, 수정, 재계산 흐름 제공
- 고정지출과 고정저축을 급여 계획에 연결
- 일일 생활비 계획과 남은 예산을 서버 계산값으로 표시
- 변동지출 예상 및 실제 지출과의 연결 준비
- 급여 홈, 일일 예산, 지출, 저축, 알림, LV UP, 커뮤니티와 연결 가능한 구조 제공
- raw 금융 데이터, 개인정보, push token, 광고 금융 타겟팅 정보가 클라이언트 문서와 로그에 노출되지 않는 구조 보장

## 2. 서비스 범위

이 모듈은 모바일 앱의 계획 도메인을 담당한다. 화면 파일은 `apps/mobile/app/(tabs)/plan/index.tsx`와 연결되고, 하위 기능은 `src/features/plan`의 타입, API 클라이언트, 상태 모델, UI 컴포넌트, 테스트 유틸로 확장된다.

포함 범위는 다음과 같다.

- 급여 계획 요약
- 월 예상 급여 입력 및 서버 저장
- 고정지출 합계 표시
- 고정저축 합계 표시
- 생활비 계획 및 일일 예산 표시
- 기타 예정 지출 표시
- 예상 급여납치 금액 표시
- 서버 재계산 요청
- 계획 확정, 보류, 마감 상태 표시
- 알림 설정 연결
- 급여 홈과 지출/저축 상세 화면으로의 딥링크

제외 범위는 다음과 같다.

- 세금, 투자, 대출, 보험, 법률 자문
- 금융상품 추천 또는 개인화 광고 타겟팅
- 클라이언트 단독 확정 계산
- 원시 계좌번호, 카드번호, 상세 급여명세 저장

## 3. 서버 권위 계산 원칙

모든 금액은 정수 KRW 단위로 처리한다. 소수점, 음수, NaN, Infinity, 문자열 금액의 직접 계산은 허용하지 않는다. 모바일은 입력 보조와 표시만 담당하며, 최종 계산 결과는 `/api/v1` 서버가 반환한 값을 사용한다.

공식 계산식은 다음을 따른다.

```text
planned_total_expense = fixed_expense + daily_living_budget + planned_other_expense
expected_hijack = max(0, expected_salary - planned_total_expense)
today_remaining_budget = max(0, daily_limit - today_variable_expense)
monthly_actual_hijack = max(0, actual_income + carry_over - actual_expense - actual_savings)
```

클라이언트는 위 식을 UI 설명과 fallback 표시 검증에 사용할 수 있으나 서버 응답과 충돌할 경우 서버 응답이 항상 우선한다.

## 4. 데이터 모델 기준

### PayrollPlanSummary

```ts
type PayrollPlanSummary = {
  id: string;
  month: string;
  expectedSalary: number;
  fixedExpenseTotal: number;
  fixedSavingTotal: number;
  dailyLivingBudget: number;
  plannedOtherExpense: number;
  plannedTotalExpense: number;
  expectedHijack: number;
  status: "DRAFT" | "CONFIRMED" | "CLOSED";
  serverCalculatedAt: string;
};
```

### PlanGuard

```ts
type PlanGuard = {
  serverAuthority: true;
  currency: "KRW";
  timezone: "Asia/Seoul";
  rawFinancialDataExposed: false;
  rawPersonalDataExposed: false;
  rawPushTokenExposed: false;
  adsFinancialTargetingUsed: false;
};
```

### PlanAction

```ts
type PlanAction = { type: "OPEN_SALARY_HOME"; route: "/(tabs)/salary" } | { type: "OPEN_DAILY_BUDGET"; route: "/daily-budgets" } | { type: "OPEN_FIXED_EXPENSES"; route: "/fixed-expenses" } | { type: "OPEN_SAVINGS"; route: "/savings" } | { type: "RECALCULATE"; endpoint: "/api/v1/payroll/plans/:id/recalculate" };
```

## 5. API 계약

모든 요청은 인증 세션 또는 bearer token 기반으로 처리되며, 모바일은 다음 헤더를 포함한다.

```text
accept: application/json
content-type: application/json
x-client-platform: ios | android | web
x-correlation-id: <uuid-like value>
x-raw-financial-data-exposed: false
x-raw-personal-data-exposed: false
x-raw-push-token-exposed: false
x-ad-financial-targeting-used: false
```

주요 API는 다음과 같다.

| 목적           |    Method | Endpoint                                    |
| -------------- | --------: | ------------------------------------------- |
| 현재 계획 조회 |       GET | `/api/v1/payroll/plans/current`             |
| 계획 상세 조회 |       GET | `/api/v1/payroll/plans/:planId`             |
| 계획 생성      |      POST | `/api/v1/payroll/plans`                     |
| 계획 수정      |     PATCH | `/api/v1/payroll/plans/:planId`             |
| 서버 재계산    |      POST | `/api/v1/payroll/plans/:planId/recalculate` |
| 계획 확정      |      POST | `/api/v1/payroll/plans/:planId/confirm`     |
| 급여 홈 요약   |       GET | `/api/v1/payroll/home`                      |
| 고정지출 목록  |       GET | `/api/v1/fixed-expenses`                    |
| 고정저축 목록  |       GET | `/api/v1/savings/plans`                     |
| 일일 예산 조회 |       GET | `/api/v1/daily-budgets/current`             |
| 알림 설정 연결 | GET/PATCH | `/api/v1/notifications/preferences`         |

## 6. UI/UX 원칙

Plan 화면은 사용자가 한눈에 급여 계획의 구조를 이해하도록 다음 순서로 배치한다.

1. 이번 달 급여 계획 요약 카드
2. 서버 계산 기준과 마지막 계산 시각
3. 예상 급여, 고정지출, 고정저축, 생활비, 기타 예정 지출 카드
4. 예상 급여납치 금액과 계획 상태
5. 일일 생활비와 남은 예산 진입 카드
6. 고정지출/고정저축 상세 진입
7. 재계산, 확정, 알림 설정 액션
8. Privacy Guard 및 광고/제휴 비타겟팅 표시

UI 문구는 한국어를 기본으로 한다. 금액 표시는 `Intl.NumberFormat('ko-KR')` 기준의 KRW 포맷을 사용하되, 원시 민감 금액이 로그, 오류, 광고 payload, 커뮤니티 공유 payload로 전달되지 않도록 한다.

## 7. 보안 및 개인정보 보호

- 급여, 지출, 저축, 급여납치 금액은 민감 금융 데이터로 분류한다.
- 외부 광고/제휴 시스템에는 급여액, 지출액, 저축액, 급여납치액, 계좌, 카드, 사용자 식별자를 전달하지 않는다.
- 커뮤니티 인증글로 이동할 때는 금액 없는 성장/루틴 인증만 허용한다.
- 오류 메시지는 password, token, email, phone, account, card, salary, payroll, expense, savings, amount, hijack 및 한국어 동의어를 redaction한다.
- 푸시 토큰은 알림 서비스에서만 처리하고 Plan 모듈에서는 원문을 취급하지 않는다.
- 관리자/운영자 변경은 서버의 audit log 및 admin reason 정책을 따른다.

## 8. 상태 및 오류 처리

Plan 모듈은 다음 상태를 지원해야 한다.

| 상태            | 의미              | UI 처리                           |
| --------------- | ----------------- | --------------------------------- |
| `LOADING`       | 서버 계획 조회 중 | skeleton 또는 loading indicator   |
| `READY`         | 계획 정상 표시    | 요약, 상세, 액션 활성화           |
| `EMPTY`         | 계획 미등록       | 급여 계획 생성 CTA                |
| `RECALCULATING` | 서버 재계산 중    | 계산 액션 잠금                    |
| `OFFLINE`       | 네트워크 불안정   | 마지막 안전 캐시 또는 재시도 안내 |
| `ERROR`         | 조회/검증 실패    | redacted 오류와 재시도 CTA        |

오류는 사용자 행동을 안내해야 하며, 서버 내부 stack trace 또는 민감 데이터는 표시하지 않는다.

## 9. 알림 연계

Plan 모듈은 다음 알림과 연결된다.

- 급여일 전 계획 확인 알림
- 급여일 당일 고정지출/고정저축 분리 알림
- 일일 예산 초과 위험 알림
- 고정지출 예정일 알림
- 월 마감 급여납치 결과 알림

알림 본문에는 원시 금액을 노출하지 않고, 필요한 경우 `마스킹된 예산`, `서버 계산 금액`, `계획 확인 필요`와 같은 안전한 문구를 사용한다.

## 10. 광고/제휴 정책

Plan 모듈에서는 금융 상태 기반 타겟팅 광고를 금지한다. 허용되는 것은 화면 맥락 기반의 비개인화 광고/제휴 표기뿐이다.

- 허용: `광고`, `제휴` 라벨이 명확한 일반 맥락형 안내
- 금지: 급여액, 지출액, 저축액, 남은 예산, 급여납치 금액 기반 타겟팅
- 금지: 대출, 고위험 투자, 사행성, 불법/성인/니코틴/주류/무기/처방약 관련 광고
- 금지: 사용자 식별자와 금융 이벤트를 광고주에게 전달

## 11. 테스트 기준

파일 단위와 모듈 단위 검증은 다음을 통과해야 한다.

```bash
pnpm --filter @salary-hijacking/mobile typecheck
pnpm --filter @salary-hijacking/mobile lint
pnpm --filter @salary-hijacking/mobile test
pnpm --filter @salary-hijacking/mobile e2e
```

핵심 테스트 케이스는 다음과 같다.

- 예상 급여가 0 또는 음수일 때 저장 차단
- 고정지출/고정저축/생활비 합계가 서버 응답과 일치하는지 확인
- 예상 급여납치 금액이 음수가 되지 않는지 확인
- 서버 재계산 실패 시 기존 계획을 오염시키지 않는지 확인
- 알림 설정 진입과 딥링크가 정상 동작하는지 확인
- raw 금융 데이터가 광고/커뮤니티/오류 로그로 전달되지 않는지 확인
- 오프라인 상태에서 안전한 fallback UI가 표시되는지 확인
- 접근성 role, 텍스트 대비, 터치 영역이 모바일 기준을 충족하는지 확인

## 12. 완료 기준

이 README가 정의하는 Plan Feature의 문서상·이론상 완료 기준은 다음과 같다.

- 급여 계획, 고정지출, 고정저축, 생활비 계획 책임이 명확히 분리되어 있다.
- 서버 권위 계산식과 API 계약이 명시되어 있다.
- 모바일 UI/UX 흐름이 급여 홈과 연결된다.
- 알림, 광고/제휴, 커뮤니티, LV UP과의 안전 경계가 정의되어 있다.
- raw 금융 데이터, 개인정보, push token, 광고 금융 타겟팅 금지 정책이 명시되어 있다.
- 테스트 및 E2E 기준이 정의되어 있다.
- 실제 운영 100% 확정에는 모바일 앱 전체 typecheck, API 통합, Expo 빌드, E2E/QA, 배포 환경 검증이 필요하다.
