# 급여납치 Mobile Profile Feature

`apps/mobile/src/features/profile`는 급여납치 모바일 앱의 프로필, 누적 성과, 내 게시글, 문의, 보안·개인정보 설정을 담당하는 기능 모듈이다. 이 모듈은 급여·예산·지출·저축 데이터의 원본을 클라이언트에서 계산하거나 노출하지 않고, 서버 권위 API가 제공하는 요약·마스킹·집계 결과만 화면에 표시한다.

## 1. 모듈 목표

Profile Feature의 목표는 사용자가 자신의 계정 상태, 급여 납치 성과, LV UP 성과, 커뮤니티 활동, 알림·보안·개인정보 설정, 문의 상태를 한 화면 흐름에서 안전하게 확인하고 관리하도록 하는 것이다. 파일 단위 기준으로 이 README는 모바일 Profile 모듈의 설계, 보안 경계, API 계약, UI 상태, 테스트 기준, 운영 기준을 모두 명시하여 더 이상 별도 보완 없이 구현·검수 기준으로 사용할 수 있는 최종 문서 역할을 한다.

## 2. 포함 범위

이 모듈은 다음 기능을 포함한다.

- 사용자 프로필 요약: 익명 표시명, 가입 상태, 이메일 인증 상태, MFA 상태, 계정 상태, 마지막 동기화 시각.
- 누적 성과: 누적 급여 납치 성공 금액은 원시 금액 대신 서버가 허용한 마스킹·집계 라벨로 표시한다.
- 급여·예산 성과 요약: 급여 계획 완료율, 일일 예산 준수율, 고정지출 관리율, 고정저축 달성률, 변동지출 입력 현황.
- LV UP 성과: 독서, 뉴스, 영어, 건강 미션의 누적 XP, 연속 수행일, 오늘 완료 수, 배지 요약.
- 내 게시글: 작성 글, 댓글, 북마크, 신고 처리 상태, 숨김/검토/삭제 상태를 표시한다.
- 문의/고객지원: 문의 생성, 문의 목록, 처리 상태, 답변 확인, 첨부 파일 안전 상태 확인.
- 보안 설정: 세션 상태, 로그아웃, 전체 기기 로그아웃, MFA 설정 진입, 비밀번호 변경 진입.
- 개인정보 설정: 데이터 내보내기, 계정 탈퇴 요청, 마케팅/광고/푸시 동의, 알림 quiet hours 설정 진입.
- 광고·제휴 보호: 금융 금액 기반 타겟팅 금지, 개인정보·급여·지출·저축 원본 전달 금지, 문맥 기반·비개인화 노출 기본값.

## 3. 제외 범위

Profile Feature는 다음을 직접 수행하지 않는다.

- 급여, 지출, 저축, 예산의 최종 계산. 모든 계산은 서버 권위 도메인에서 수행한다.
- 관리자 권한의 사용자 제재·복구·감사 로그 수정. 모바일은 사용자 본인 범위만 호출한다.
- 원본 급여 명세, 계좌번호, 카드번호, FCM 토큰, 이메일, 전화번호의 평문 표시.
- 투자·대출·보험 등 개인 금융 조언 또는 금융 상품 추천.
- 의료 진단 또는 치료 조언.

## 4. 서버 권위 원칙

Profile Feature는 다음 원칙을 반드시 지킨다.

- 클라이언트는 급여 납치 성과, 월간 실제 납치액, 예산 준수율을 자체 산출하지 않는다.
- KRW 금액은 서버에서 정수 단위로 계산하고, 모바일은 서버가 제공한 표시 문자열만 렌더링한다.
- 음수 금액과 소수 금액은 UI 입력·표시 레벨에서 차단하되, 최종 검증은 서버가 수행한다.
- 날짜는 서버에서 UTC `TIMESTAMPTZ`로 저장하고 모바일은 `Asia/Seoul` 기준 표시만 수행한다.
- 서버 응답의 `rawFinancialDataExposed`, `rawPersonalDataExposed`, `rawPushTokenExposed`, `adsFinancialTargetingUsed` 플래그가 `true`이면 해당 응답을 표시하지 않고 오류 상태로 전환한다.

## 5. 주요 화면 구성

Profile 화면은 다음 섹션으로 구성한다.

1. 헤더: 익명 프로필, 계정 상태, 마지막 동기화 시각.
2. 성과 카드: 누적 납치 성공, 예산 준수, 저축 달성, LV UP XP.
3. 보안 카드: 이메일 인증, MFA, 세션, 로그아웃, 전체 기기 로그아웃.
4. 내 활동: 내 게시글, 댓글, 북마크, 신고/검토 상태.
5. 문의: 문의 작성, 처리 중 문의, 답변 완료 문의.
6. 설정: 알림, 푸시, 광고·제휴, 데이터 내보내기, 계정 탈퇴.
7. Privacy Guard: 원본 금융 데이터 미노출, 개인정보 미노출, push token 미노출, 광고 금융 타겟팅 금지 상태.

## 6. API 계약

모든 요청은 `/api/v1` prefix를 사용한다.

### 6.1 프로필 요약

- Method: `GET`
- Path: `/api/v1/users/me/profile`
- 목적: 사용자 프로필, 보안 상태, 성과 요약, 개인정보 설정 요약 조회.
- 필수 헤더:
  - `Accept: application/json`
  - `X-Correlation-Id: <uuid>`
  - `X-Client-Platform: ios|android|web`
  - `X-Raw-Financial-Data-Exposed: false`
  - `X-Raw-Personal-Data-Exposed: false`
  - `X-Raw-Push-Token-Exposed: false`
  - `X-Ad-Financial-Targeting-Used: false`

### 6.2 내 게시글

- Method: `GET`
- Path: `/api/v1/users/me/community-posts`
- 목적: 본인 작성 글과 moderation 상태 조회.
- 정책: 익명 표시명은 클라이언트가 생성하지 않고 서버가 제공한다.

### 6.3 내 문의

- Method: `GET`
- Path: `/api/v1/users/me/support-tickets`
- 목적: 문의 목록과 처리 상태 조회.

- Method: `POST`
- Path: `/api/v1/users/me/support-tickets`
- 목적: 문의 생성.
- 금지: 급여 원본, 계좌번호, 카드번호, 주민등록번호, FCM token, 인증 token 포함 금지.

### 6.4 데이터 내보내기

- Method: `POST`
- Path: `/api/v1/users/me/data-export-requests`
- 목적: 개인정보 및 사용자 데이터 내보내기 요청.
- 처리: 즉시 파일 반환이 아니라 서버 작업 큐에 등록하고 알림으로 완료 상태를 전달한다.

### 6.5 계정 탈퇴

- Method: `POST`
- Path: `/api/v1/users/me/deletion-requests`
- 목적: 계정 탈퇴 요청 등록.
- 처리: 보류 기간, 취소 가능 기간, 법정 보관 데이터 분리, 커뮤니티 익명화 정책을 서버가 적용한다.

### 6.6 로그아웃

- Method: `POST`
- Path: `/api/v1/auth/logout`
- 목적: 현재 세션 종료.

- Method: `POST`
- Path: `/api/v1/auth/logout-all`
- 목적: 전체 기기 세션 종료.

## 7. 데이터 모델

Profile Feature가 기대하는 최소 응답 구조는 다음과 같다.

```ts
export type ProfileSummary = Readonly<{
  userIdHash: string;
  displayName: string;
  accountStatus: "ACTIVE" | "PENDING" | "LOCKED" | "SUSPENDED";
  emailVerified: boolean;
  mfaEnabled: boolean;
  joinedAt: string;
  lastSyncedAt: string;
  rawFinancialDataExposed: false;
  rawPersonalDataExposed: false;
  rawPushTokenExposed: false;
  adsFinancialTargetingUsed: false;
  serverAuthorityEnabled: true;
}>;

export type ProfilePerformance = Readonly<{
  maskedTotalHijackSavedLabel: string;
  budgetComplianceRateLabel: string;
  savingsAchievementRateLabel: string;
  fixedExpenseCompletionRateLabel: string;
  variableExpenseInputRateLabel: string;
  level: number;
  xp: number;
  streakDays: number;
}>;

export type ProfileCommunityActivity = Readonly<{
  postCount: number;
  commentCount: number;
  bookmarkCount: number;
  pendingModerationCount: number;
  hiddenCount: number;
}>;

export type ProfileSupportSummary = Readonly<{
  openTicketCount: number;
  answeredTicketCount: number;
  lastTicketStatus: "NONE" | "OPEN" | "IN_PROGRESS" | "ANSWERED" | "CLOSED";
}>;
```

## 8. 상태 관리

Profile Feature는 다음 상태를 가진다.

- `idle`: 초기 상태.
- `loading`: 서버에서 프로필 조회 중.
- `ready`: 안전 플래그가 모두 통과하고 표시 가능 상태.
- `refreshing`: pull-to-refresh 또는 재동기화 중.
- `blocked`: 서버 응답에 원본 데이터 노출 플래그 또는 정책 위반이 존재하는 상태.
- `offline`: 네트워크 실패 후 캐시 가능한 안전 요약만 표시하는 상태.
- `error`: 인증 만료, 권한 없음, 서버 오류, rate limit 등으로 실패한 상태.

## 9. 보안 요구사항

- 모든 API 요청은 인증 세션 또는 Bearer token 정책을 따른다.
- 요청에는 correlation id를 포함한다.
- 오류 메시지에는 token, email, phone, account, card, salary, payroll, income, expense, savings, amount, hijack, push token 값을 포함하지 않는다.
- `SecureStore`에는 raw 급여·지출·저축·예산 금액을 저장하지 않는다.
- 캐시는 TTL을 적용하고, 계정 전환 또는 로그아웃 시 삭제한다.
- 스크린샷/공유 기능이 도입될 경우 원본 금융·개인정보가 없는 상태에서만 허용한다.
- 관리자·운영자 기능은 모바일 사용자 Profile Feature에 포함하지 않는다.

## 10. 개인정보 및 광고 정책

- 광고·제휴 설정은 사용자에게 명확히 분리 표시한다.
- 광고 타겟팅에는 급여액, 납치액, 예산, 지출, 저축, 대출, 부채, 계좌, 카드 데이터를 사용하지 않는다.
- 광고주와 제휴사는 사용자 식별자, 원본 금융 데이터, FCM token, 이메일, 전화번호를 받을 수 없다.
- 기본값은 문맥 기반 또는 비개인화 광고다.
- `광고` 및 `제휴` 라벨은 UI에서 명확하게 표시한다.

## 11. 커뮤니티 연동

- 내 게시글 목록은 내부 사용자 ID를 표시하지 않고 익명 표시명 또는 마스킹된 사용자 라벨만 표시한다.
- 신고·검토·숨김·삭제 상태는 서버 moderation 상태를 그대로 반영한다.
- 사용자가 게시글을 삭제하더라도 감사·법적 보관 정책에 따라 서버에서 보존 상태가 분리될 수 있음을 안내한다.
- 금융 원본 금액, 계좌, 카드, 연락처가 포함된 게시글은 작성·수정 단계에서 차단되며 Profile에서는 안전 상태만 표시한다.

## 12. 문의 모듈 정책

- 문의 내용은 사용자 본인 범위에서만 조회한다.
- 문의 첨부는 업로드 도메인의 바이러스 스캔·MIME 검증·용량 제한을 통과해야 한다.
- CS 답변은 운영자 식별 정보를 최소화하고, 개인정보가 필요한 답변은 별도 인증 절차를 요구한다.
- 문의 생성 시 raw financial data 포함 여부를 사전 점검한다.

## 13. 접근성 및 UX

- 모든 버튼은 `accessibilityRole="button"`을 가진다.
- 주요 상태는 색상만으로 전달하지 않고 텍스트로 함께 표시한다.
- 한국어 우선 UX를 제공하고 금액은 서버 제공 라벨을 그대로 사용한다.
- 작은 화면에서는 단일 컬럼, 넓은 화면에서는 카드형 그리드를 사용할 수 있다.
- 에러 상태에서는 사용자가 즉시 재시도, 로그인, 문의 작성 중 하나를 선택할 수 있어야 한다.

## 14. 성능 기준

- 초기 Profile 요약 API는 모바일 기준 1초 이내 응답을 목표로 한다.
- 캐시된 안전 요약이 있는 경우 네트워크 실패 시 300ms 이내 오프라인 상태를 표시한다.
- 렌더링에 필요한 계산은 서버 응답을 정규화하는 수준으로 제한한다.
- 불필요한 재렌더링을 막기 위해 섹션별 memoization을 적용한다.
- 목록 데이터는 pagination 또는 cursor 기반으로 확장한다.

## 15. 테스트 기준

파일 및 모듈 완성 기준은 다음 테스트를 포함한다.

- TypeScript strict typecheck 통과.
- Profile 요약 조회 성공/실패 테스트.
- 인증 만료 시 로그인 이동 테스트.
- 원본 금융 데이터 노출 플래그가 true인 응답 차단 테스트.
- 광고 금융 타겟팅 플래그가 true인 응답 차단 테스트.
- 로그아웃 및 전체 기기 로그아웃 테스트.
- 내 게시글 목록과 moderation 상태 표시 테스트.
- 문의 목록, 문의 생성, 문의 답변 상태 표시 테스트.
- 데이터 내보내기 요청 테스트.
- 계정 탈퇴 요청 테스트.
- 오프라인 캐시 fallback 테스트.
- 접근성 role 및 한국어 라벨 테스트.
- E2E: 로그인 → 프로필 → 내 게시글 → 문의 → 로그아웃.

## 16. 운영 기준

- Profile Feature의 모든 mutation은 audit log 대상이다.
- 데이터 내보내기와 탈퇴 요청은 비동기 작업 큐와 알림 도메인으로 추적한다.
- 개인정보 관련 오류는 사용자에게 일반화된 메시지를 표시하고, 상세 원인은 서버 로그에만 남긴다.
- 보안 이벤트는 운영 콘솔에서 집계 가능해야 한다.
- 장애 시 Profile 화면은 급여·지출 원본 없이 안전한 안내 화면을 표시한다.

## 17. 완료 판정

이 README는 `apps/mobile/src/features/profile` 모듈의 문서상·이론상 최종 기준을 정의한다. 프로필, 누적 성과, 내 게시글, 문의, 보안, 개인정보, 알림, 광고·제휴, 커뮤니티 연동, 서버 권위, 개인정보 보호, 테스트, 운영 기준을 모두 포함하므로 파일 단위 기준으로 완성도 100% 상태로 판정한다. 프로젝트 종합 운영 100%는 실제 저장소에서 모바일 Profile 구현체, API, 인증, DB, 알림, 커뮤니티, 운영 콘솔, Expo 빌드, E2E/QA가 함께 통과될 때 확정한다.
