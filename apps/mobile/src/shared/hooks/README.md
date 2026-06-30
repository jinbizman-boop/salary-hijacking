# 급여납치 Mobile Shared Hooks

## 목적

`apps/mobile/src/shared/hooks`는 급여납치 모바일 앱의 상태, 네트워크, 세션, 폼, 권한, 오프라인, 알림, 분석 추적을 재사용 가능한 Hook으로 표준화한다. 각 화면은 비즈니스 규칙을 임의 구현하지 않고 공통 Hook을 통해 서버 권위 API와 보호 정책을 사용한다.

## 원칙

1. Hook은 서버 확정 데이터를 대체하지 않는다.
2. Hook 내부에서 민감 데이터를 analytics, 광고, 로그로 전달하지 않는다.
3. 모든 mutation은 loading, success, error, conflict, rate limited 상태를 제공한다.
4. 인증 세션과 사용자 범위는 공통 Hook에서만 관리한다.
5. 오프라인 데이터는 명확히 캐시 또는 읽기 전용으로 표시한다.
6. 화면별 폼 검증은 KRW 정수, 비음수, 날짜, 필수값, 약관 동의 정책을 따른다.
7. 광고/제휴 관련 Hook은 금융 기반 타겟팅을 항상 차단한다.

## 권장 디렉터리 구성

```text
shared/hooks/
  README.md
  useApiQuery.ts
  useApiMutation.ts
  useSession.ts
  useBootstrap.ts
  useOfflineStatus.ts
  useSafeForm.ts
  useKrwInput.ts
  useDebouncedValue.ts
  useConfirmAction.ts
  useNotifications.ts
  usePushPermission.ts
  usePrivacyGuard.ts
  useAnalyticsEvent.ts
  __tests__/
```

## 주요 Hook 계약

### useBootstrap

- `/api/v1/mobile/bootstrap`을 호출해 세션, feature flags, maintenance, push consent, privacy mode를 로딩한다.
- 로그인 필요, 이메일 인증, 온보딩, 점검 상태를 라우팅 계층에 전달한다.
- 실패 시 SecureStore 캐시를 읽기 전용 fallback으로 사용한다.

### useSession

- 사용자 인증 상태, 역할, 이메일 인증, 온보딩, MFA 필요 여부를 제공한다.
- 세션 토큰 원문은 절대 반환하지 않는다.
- 로그아웃 시 보안 캐시와 푸시 등록 상태를 정리한다.

### useApiQuery / useApiMutation

- 공통 API 클라이언트를 사용한다.
- correlation id와 privacy headers를 자동 부여한다.
- 에러는 안전한 한국어 메시지로 변환한다.
- mutation은 중복 실행 방지와 idempotency key 정책을 지원한다.

### useKrwInput

- 금액 입력을 KRW 정수로 제한한다.
- 음수, 소수, 과도한 금액, 빈 문자열을 표준 validation으로 처리한다.
- 원시 입력값은 화면 내부에서만 유지하며 analytics로 전송하지 않는다.

### useSafeForm

- Zod 또는 동등한 런타임 검증과 TypeScript 타입을 연결한다.
- 오류 메시지는 한국어로 표준화한다.
- 제출 전 서버 권위 경계를 표시한다.

### useNotifications / usePushPermission

- 알림 목록, 읽음 처리, 푸시 수신 설정, quiet hours를 관리한다.
- 푸시 토큰은 원문 반환 없이 등록 상태만 제공한다.
- FCM/APNs 토큰은 보안 API 계층을 통해서만 서버에 전달한다.

### usePrivacyGuard

- 화면 단위 보호 플래그를 점검한다.
- raw 금융 데이터, raw 개인정보, raw 푸시 토큰, 금융 광고 타겟팅이 발생하지 않았음을 UI와 테스트에서 확인할 수 있게 한다.

### useAnalyticsEvent

- 비식별 이벤트만 전송한다.
- 금액, 사용자 식별자, 연락처, 세션 토큰, 푸시 토큰, 커뮤니티 내부 ID는 제거한다.
- 이벤트 이름, 화면, 액션, 결과, 지연 시간, 오류 코드 수준만 허용한다.

## 기능별 Hook 연결

- 급여: `usePayrollHome`, `usePayrollPlan`, `useMonthlyClose`
- 계획: `usePlanEditor`, `useFixedExpenses`, `useSavingsPlans`
- 예산: `useDailyBudget`, `useBudgetOverrunGuard`
- 지출: `useVariableExpenses`, `useReceiptUpload`
- 알림: `useNotifications`, `usePushPermission`, `useQuietHours`
- LV UP: `useGrowthDashboard`, `useGrowthTask`, `useChallenge`
- 커뮤니티: `useCommunityFeed`, `useCommunityPost`, `useCommentMutation`, `useReportAction`
- 프로필: `useProfileSummary`, `useMyPosts`, `useSupportInquiry`, `useDataExport`

## 상태 모델

Hook은 다음 공통 상태를 반환한다.

```text
idle
loading
refreshing
success
empty
offline
validation_error
auth_required
forbidden
conflict
rate_limited
server_error
maintenance
```

## 테스트 완료 기준

- TypeScript strict 통과
- hook render 테스트 통과
- API 성공/실패/재시도 테스트 통과
- 세션 만료/로그아웃/오프라인 fallback 테스트 통과
- KRW 입력 검증 테스트 통과
- 민감 데이터 redaction 테스트 통과
- 푸시 토큰 원문 미노출 테스트 통과
- 금융 기반 광고 타겟팅 차단 테스트 통과
- 화면 E2E에서 공통 Hook 상태 전이 통과

## 완료 판정

이 README는 `shared/hooks` 계층이 문서상·이론상 갖춰야 할 상태 관리, API 연결, 세션, 오프라인, 폼 검증, 알림, analytics, 개인정보 보호 기준을 정의한다. 실제 운영 완성도는 Hook 구현, 화면 통합, 테스트, Expo 빌드, E2E/QA 통과 후 확정된다.
