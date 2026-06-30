# 급여납치 API Services Layer README

> 파일 위치: `services/api/src/services/README.md`  
> 문서 버전: `3.1.0`  
> 적용 범위: `services/api/src/services/**`  
> 상태: 문서상·이론상 파일 단위 최종본

이 문서는 급여납치 Salary Hijacking Platform의 API 서비스 계층 최종 기준서다. 서비스 계층은 라우트와 저장소 사이에서 비즈니스 규칙, 서버 권위 계산, 트랜잭션 경계, 도메인 이벤트, 보안 정책, 감사 로그, 운영 안정성, 테스트 가능성을 보장한다. 라우트는 HTTP 계약만 담당하고, 저장소는 영속성만 담당하며, 서비스는 급여·예산·지출·저축·알림·성장·커뮤니티·업로드·광고·관리자 운영의 업무 규칙을 책임진다.

---

## 1. 서비스 계층의 책임

서비스 계층은 다음 책임을 반드시 가진다.

1. 사용자의 급여, 예산, 지출, 저축, 알림, 성장, 커뮤니티, 업로드, 광고·제휴, 운영 데이터를 서버 권위로 처리한다.
2. 라우트 입력을 도메인 명령으로 변환하고, 저장소 응답을 라우트 응답 모델로 변환한다.
3. 금액 계산은 KRW 정수 minor unit 기준으로 수행하며 소수점 금액을 허용하지 않는다.
4. 사용자 입력을 신뢰하지 않고 서버에서 급여 납치 금액, 일일 예산, 잔여 예산, 고정지출 합계, 고정저축 합계, 변동지출 합계, 목표 달성률을 재계산한다.
5. 모든 사용자 도메인 데이터에는 `userId` 소유권 경계를 적용한다.
6. 관리자 작업은 관리자 인증, MFA, 권한, 사유, 감사 로그를 요구한다.
7. 광고·제휴·추천은 급여, 대출, 지출, 저축, 급여 납치 금액 원문을 직접 타겟팅에 사용하지 않는다.
8. 커뮤니티는 익명 표시를 유지하되 내부적으로는 `userId` 기반 제재·신고·감사를 유지한다.
9. 알림은 예산 초과, 고정지출 예정, 급여일, 저축 목표, LV UP, 커뮤니티, 보안 이벤트를 사용자 설정에 따라 발송한다.
10. 업로드는 급여명세서, 계좌, 카드, 대출계약 등 고위험 금융 원문 파일을 기본 차단한다.
11. 모든 변경 작업은 idempotency, 감사 로그, 도메인 이벤트 발행이 가능해야 한다.
12. 테스트에서 저장소, 시계, ID 생성기, 이벤트 발행기를 주입할 수 있어야 한다.

---

## 2. 권장 디렉터리 구조

```text
services/api/src/services/
├── README.md
├── index.ts
├── shared/
│   ├── clock.service.ts
│   ├── idempotency.service.ts
│   ├── money.service.ts
│   ├── pagination.service.ts
│   ├── policy.service.ts
│   ├── redaction.service.ts
│   ├── transaction.service.ts
│   └── service-result.ts
├── auth.service.ts
├── user.service.ts
├── payroll.service.ts
├── fixed-expense.service.ts
├── savings.service.ts
├── daily-budget.service.ts
├── variable-expense.service.ts
├── notification.service.ts
├── growth.service.ts
├── community.service.ts
├── upload.service.ts
├── admin.service.ts
├── ads.service.ts
└── partner.service.ts
```

필요에 따라 서비스가 더 세분화될 수 있으나, 라우트에서 저장소를 직접 호출하여 도메인 규칙을 우회해서는 안 된다.

---

## 3. 레이어 아키텍처

```text
HTTP Routes
  ↓
Middlewares: auth, rate-limit, audit-log, error, security headers
  ↓
Validators / DTO Normalizers
  ↓
Services: business rule, server authority calculation, policy, transaction, event
  ↓
Repositories: DB persistence only
  ↓
Database / R2 / KV / Queue / External Adapters
```

라우트는 다음만 수행한다.

- 요청 path, method, body, query, header 파싱
- 인증 컨텍스트 확인
- 서비스 명령 호출
- 표준 JSON 응답 반환

서비스는 다음을 수행한다.

- 도메인 정책 검증
- 금액·기간·상태 계산
- 트랜잭션 구성
- idempotency 처리
- 저장소 호출 순서 제어
- 이벤트 발행
- 감사 로그 메타데이터 제공

저장소는 다음만 수행한다.

- 데이터 읽기/쓰기
- 트랜잭션 객체 수신 시 같은 트랜잭션에서 쿼리 실행
- DB 제약 조건 준수
- raw SQL 또는 ORM 세부 구현 숨김

---

## 4. 공통 서비스 계약

모든 서비스 메서드는 다음 원칙을 따른다.

```ts
export interface ServiceContext {
  readonly requestId: string;
  readonly actorUserId: string;
  readonly roles: readonly string[];
  readonly permissions: readonly string[];
  readonly now: Date;
  readonly idempotencyKey?: string | null;
  readonly clientIpHash?: string | null;
  readonly userAgentHash?: string | null;
}

export interface ServiceResult<T> {
  readonly ok: true;
  readonly data: T;
  readonly events?: readonly DomainEvent[];
  readonly audit?: readonly AuditMetadata[];
}
```

실패는 임의의 `Error`가 아니라 표준 도메인 오류로 표현한다.

```ts
export interface DomainServiceError {
  readonly code: string;
  readonly message: string;
  readonly status: number;
  readonly details?: unknown;
}
```

서비스는 개인 식별정보, 급여 원문, 계좌 원문, 토큰 원문, 카드 원문을 로그나 이벤트 payload에 넣지 않는다.

---

## 5. 서버 권위 금액 규칙

금액은 모두 KRW 정수로 처리한다.

```text
plannedFixedExpenseTotal = sum(active fixed expenses in payroll period)
plannedFixedSavingsTotal = sum(active savings plans in payroll period)
plannedVariableReserve = user plan or server default
plannedTotalOutflow = plannedFixedExpenseTotal + plannedFixedSavingsTotal + plannedVariableReserve + emergencyBuffer
availableForDailyBudget = max(0, payrollAmount + carryOverAmount - plannedTotalOutflow - alreadySpentAmount)
recommendedDailyBudget = floor(availableForDailyBudget / remainingDays)
expectedHijackAmount = max(0, payrollAmount - plannedTotalOutflow)
todayRemainingBudget = todayDailyBudgetLimit - todayVariableExpenseTotal
```

금지 사항은 다음과 같다.

- 프론트엔드가 보낸 급여 납치 금액을 그대로 저장하지 않는다.
- 프론트엔드가 보낸 일일 예산 잔액을 그대로 신뢰하지 않는다.
- 음수 금액 입력을 허용하지 않는다.
- 소수점 금액을 허용하지 않는다.
- 광고/추천 서비스에서 급여액, 대출액, 지출액, 저축액, 급여 납치 금액 원문을 타겟팅 키로 사용하지 않는다.

---

## 6. 도메인별 서비스 기준

### 6.1 AuthService

책임:

- 이메일/소셜 로그인 서비스 계약
- 액세스 토큰과 refresh token rotation 정책
- 관리자 로그인과 MFA 분리
- 계정 상태 검증
- 세션 무효화
- 보안 이벤트 발행

필수 규칙:

- 사용자 세션과 관리자 세션은 audience와 route prefix를 분리한다.
- refresh token 원문은 저장하지 않고 해시만 저장한다.
- 실패 로그인, 토큰 재사용, 관리자 MFA 실패는 보안 이벤트로 기록한다.

### 6.2 UserService

책임:

- 마이페이지 프로필
- 사용자 설정
- 약관, 개인정보, 마케팅, 콘텐츠 추천, 광고·제휴, 분석 동의
- 개인정보 내보내기
- 계정 탈퇴와 복구

필수 규칙:

- 프로필 수정에서 role, status, email, phone, salary, account, ad segment 등 mass assignment를 차단한다.
- 개인정보 내보내기는 금융 원문이 아니라 summary-only 원칙을 따른다.
- 광고·제휴 동의는 민감 금융 원문 타겟팅 동의가 아니다.

### 6.3 PayrollService

책임:

- 급여 계획 생성/수정/활성화/보관
- 급여 홈 데이터
- 현재 활성 계획
- 급여 기간 계산
- 고정지출, 고정저축, 변동지출 예비금, 비상금, 이월금 반영
- 일일 예산 입력값 생성

필수 규칙:

- 한 사용자에게 활성 급여 계획은 원칙적으로 하나다.
- 새 급여계획 활성화 시 기존 ACTIVE 계획은 보관하거나 비활성화한다.
- 급여계획 계산은 서버에서 재계산한다.

### 6.4 FixedExpenseService

책임:

- 월세, 통신비, 보험료, 구독료, 대출상환 등 고정지출 관리
- 반복 결제일 계산
- 예정 지출 조회
- 급여계획/일일예산 영향 계산

필수 규칙:

- 반복 주기와 결제일 유효성을 검증한다.
- ACTIVE 상태의 고정지출만 급여계획 계산에 포함한다.
- 대출상환은 사용자의 민감 금융 원문을 노출하지 않고 금액 summary로만 다룬다.

### 6.5 SavingsService

책임:

- 고정저축, 목표저축, 입금, 출금, 조정, 자동저축
- 목표 달성률과 남은 금액 계산
- 고정저축 합계 산출
- 일일예산 영향 계산

필수 규칙:

- 잔액은 음수가 될 수 없다.
- 목표 달성률은 서버에서 계산한다.
- 저축 계좌 원문은 저장소·로그·응답에서 노출하지 않는다.

### 6.6 DailyBudgetService

책임:

- 일일 예산 생성/조회/재계산
- 오늘 예산과 잔여 예산 계산
- 기간별 균등 분배와 remainder 처리
- 변동지출 연결

필수 규칙:

- 일일 예산은 급여계획, 고정지출, 고정저축, 변동지출을 반영해 서버에서 계산한다.
- 이미 사용한 변동지출은 재계산 시 차감한다.
- 일별 분배 remainder는 앞 날짜부터 1 KRW씩 배분한다.

### 6.7 VariableExpenseService

책임:

- 변동지출 생성/수정/삭제
- 환불, 무효화
- 오늘 지출, 최근 지출, 요약, 캘린더, 카테고리 breakdown
- 일일예산 소진/초과 영향 계산

필수 규칙:

- 생성과 환불은 idempotency key를 지원한다.
- 환불액은 원 지출액을 초과할 수 없다.
- 무효화된 지출은 예산 사용액에서 제외한다.
- 영수증 OCR 원문, 카드 원문, 계좌 원문은 노출하지 않는다.

### 6.8 NotificationService

책임:

- 급여일, 고정지출 예정, 예산 경고, 예산 초과, 저축 목표, LV UP, 커뮤니티, 공지, 보안 알림
- 알림 수신 설정
- 푸시 디바이스 관리
- 서버 규칙 preview

필수 규칙:

- 콘텐츠 추천 알림과 광고·제휴 알림은 명시 opt-in을 따른다.
- 알림 본문에 계좌, 카드, 급여명세 등 민감 원문을 포함하지 않는다.
- 푸시 토큰은 원문 저장을 금지하고 해시 또는 안전한 adapter 저장소로 위임한다.

### 6.9 GrowthService

책임:

- LV UP 프로필
- 성장 과제와 진행 기록
- 경험치와 레벨 계산
- 배지 지급
- 챌린지 참여/완료
- 콘텐츠 완료
- 리더보드와 추천

필수 규칙:

- 경험치와 레벨은 서버에서 계산한다.
- 리더보드는 사용자 식별자를 마스킹한다.
- 콘텐츠 추천은 급여, 지출, 저축 원문을 사용하지 않는다.

### 6.10 CommunityService

책임:

- 게시글, 댓글, 좋아요, 신고
- 익명 표시
- 신고/제재/숨김/복구
- 커뮤니티 활동과 마이페이지 연동

필수 규칙:

- 공개 표시명은 익명 처리하되 내부 `userId`는 제재와 감사용으로 유지한다.
- 급여명세, 계좌, 카드, 주민번호, 대출계약 등 민감 원문 게시를 차단한다.
- 고위험 투자·대출·사행성·불법 유도 콘텐츠는 검토 또는 차단한다.

### 6.11 UploadService

책임:

- 업로드 준비
- 직접 업로드
- 업로드 확정
- 검사/격리
- 다운로드 URL 발급
- 리소스 attach
- quota 계산

필수 규칙:

- 급여명세서, 통장사본, 계좌, 카드번호, 대출계약, 신분증 원문 업로드를 기본 차단한다.
- 목적별 MIME allowlist와 파일 크기 제한을 적용한다.
- R2 storage key는 사용자와 첨부파일 ID를 기준으로 분리한다.

### 6.12 AdsService / PartnerService

책임:

- 광고 캠페인과 제휴 콘텐츠
- 광고 표시/클릭/집계
- 운영 리포트
- 광고 라벨링 정책

필수 규칙:

- 급여, 대출, 지출, 저축, 급여 납치 금액 원문을 직접 타겟팅에 사용하지 않는다.
- 광고 테이블은 payroll/expense/savings 테이블과 직접 JOIN하지 않는다.
- 광고주는 사용자 식별자와 금융 원문에 접근할 수 없다.
- 광고/제휴 UI에는 `광고` 또는 `제휴` 표시를 제공한다.

### 6.13 AdminService

책임:

- 관리자 대시보드
- 사용자 관리
- 신고/제재/커뮤니티 운영
- 공지/이벤트/리워드
- 광고/제휴 운영
- 감사 로그
- 권한 관리

필수 규칙:

- 관리자 mutation은 `X-Admin-Reason` 또는 body `reason`이 필요하다.
- 관리자 민감 조회는 마스킹 또는 aggregate summary만 허용한다.
- SUPER_ADMIN 권한은 최소화하고 모든 권한 변경은 감사 로그를 남긴다.

---

## 7. 트랜잭션 경계

서비스는 다음 경우 반드시 하나의 트랜잭션으로 처리한다.

- 급여계획 활성화와 기존 계획 보관
- 변동지출 생성과 일일예산 사용액 반영
- 환불 생성과 지출 net amount 재계산
- 저축 거래 생성과 목표 현재 금액 갱신
- 커뮤니티 신고 처리와 제재 생성
- 관리자 권한 변경과 감사 로그 생성
- 업로드 확정과 첨부파일 상태 변경

트랜잭션 실패 시 외부 이벤트 발행은 발생하지 않아야 한다. 이벤트는 DB commit 이후 outbox 또는 queue 방식으로 발행한다.

---

## 8. Idempotency 정책

다음 작업은 idempotency key를 지원해야 한다.

- auth refresh token rotation
- variable expense create
- variable expense refund
- daily budget spend record
- fixed expense payment record
- savings transaction record
- notification send or create
- upload finalize
- payment/partner callback

idempotency key는 사용자, route, method, body hash, 만료 시각과 함께 저장한다. 같은 key로 동일 요청이 반복되면 기존 결과를 반환하고, body hash가 다르면 conflict를 반환한다.

---

## 9. 보안과 개인정보 보호

서비스 계층은 다음 데이터를 원문으로 로그, 이벤트, 광고, 추천, 커뮤니티 공개 데이터에 넣지 않는다.

- 비밀번호, 토큰, refresh token, authorization header
- 이메일, 전화번호, 주민번호
- 계좌번호, 카드번호, 통장사본
- 급여명세서, 급여 원문, 소득 증빙
- 대출계약, 채무 상세 원문
- 푸시 토큰, 디바이스 토큰
- 영수증 OCR 원문

마스킹 원칙:

```text
email -> ab***@domain.com
phone -> 010-****-1234
account/card -> last4 only or fully redacted
salary/payroll/expense/savings raw -> aggregate summary only
ip/user-agent -> hash only
```

---

## 10. 감사 로그와 도메인 이벤트

서비스는 mutation 성공 시 다음 메타데이터를 제공해야 한다.

```ts
export interface AuditMetadata {
  readonly actorUserId: string;
  readonly targetType: string;
  readonly targetId: string;
  readonly action: string;
  readonly reason?: string | null;
  readonly requestId: string;
  readonly safeSummary: Record<string, unknown>;
}
```

도메인 이벤트는 다음 원칙을 따른다.

- 이벤트 payload에는 민감 원문을 넣지 않는다.
- 이벤트 발행은 commit 이후에만 수행한다.
- 실패한 이벤트는 재시도 가능해야 한다.
- 알림, 성장 경험치, 관리자 감사, 운영 지표는 이벤트 기반으로 확장 가능해야 한다.

---

## 11. 테스트 기준

모든 서비스는 다음 테스트를 가져야 한다.

```text
unit: pure calculation and validation
integration: repository transaction behavior
e2e: route -> service -> repository -> response
security: owner boundary, mass assignment, redaction
audit: mutation reason and audit metadata
idempotency: duplicate request handling
privacy: ads/recommendation financial raw data separation
performance: large pagination and summary query limit
```

필수 계산 테스트:

- 급여계획에서 고정지출/고정저축/변동예비금/비상금/이월금 반영
- 일일예산 균등 분배와 remainder 처리
- 변동지출 환불/무효화 후 net amount
- 저축 목표 달성률과 잔여 회차
- 고정지출/고정저축 반복일 계산
- 예산 초과 알림 rule preview
- LV/EXP/배지 지급

---

## 12. 성능 기준

서비스 계층은 다음 성능 원칙을 따른다.

- 목록 API는 cursor 또는 page/pageSize를 사용하고 pageSize 최대값을 제한한다.
- 월별 요약은 DB aggregate 또는 materialized summary를 우선한다.
- 캘린더 조회는 월 단위로 제한한다.
- 관리자 대시보드는 raw table full scan을 금지한다.
- 광고/알림/커뮤니티 hot path는 캐시 가능 summary를 사용한다.
- 외부 adapter 호출은 timeout과 retry budget을 가진다.

---

## 13. 운영 안정성 기준

서비스는 다음 운영 요소를 지원해야 한다.

- requestId 전파
- structured log
- domain error code
- retry 가능한 외부 adapter 오류 분류
- DLQ 또는 outbox 기반 이벤트 재처리
- 관리자 감사 로그
- 개인정보 export와 삭제 lifecycle
- feature flag 또는 정책 버전 관리
- roll-forward 가능한 migration 계약

---

## 14. 금지 패턴

다음 코드는 서비스 계층에서 금지한다.

```text
route -> repository 직접 호출로 도메인 정책 우회
프론트엔드 계산값을 그대로 신뢰
Number 소수점 금액 저장
사용자 ID 없이 재무 데이터 조회
관리자 reason 없는 mutation
광고 서비스에서 payroll/expense/savings raw table 직접 JOIN
개인정보/토큰/계좌/카드/급여명세 원문 로그 출력
catch 후 성공 응답 반환
무제한 pageSize
외부 adapter 무한 retry
```

---

## 15. 서비스 추가 시 체크리스트

새 서비스를 추가할 때 다음을 완료해야 한다.

- [ ] 서비스 책임과 도메인 경계를 README에 맞게 정의했다.
- [ ] 입력 DTO와 출력 DTO가 명시되어 있다.
- [ ] userId 소유권 검증이 있다.
- [ ] 관리자 권한과 reason 정책이 필요한 경우 적용했다.
- [ ] 금액은 KRW 정수로 검증한다.
- [ ] 민감정보 redaction이 있다.
- [ ] idempotency가 필요한 mutation에 적용되어 있다.
- [ ] 트랜잭션 경계가 명확하다.
- [ ] 도메인 이벤트 payload가 민감 원문을 포함하지 않는다.
- [ ] 감사 로그 metadata가 있다.
- [ ] unit/integration/e2e 테스트 계획이 있다.
- [ ] 광고·추천 분리 정책을 위반하지 않는다.
- [ ] Cloudflare Workers 환경에서 Node 전용 API에 의존하지 않는다.

---

## 16. 파일 단위 완료 기준

이 `README.md`가 요구하는 서비스 계층 완료 기준은 다음과 같다.

1. 급여·예산·지출·저축 계산의 서버 권위 원칙을 명시한다.
2. 인증, 사용자, 급여, 고정지출, 고정저축, 일일예산, 변동지출, 알림, 성장, 커뮤니티, 업로드, 광고·제휴, 관리자 서비스 책임을 명시한다.
3. 트랜잭션, idempotency, 감사 로그, 도메인 이벤트 기준을 명시한다.
4. 민감정보 보호와 광고 타겟팅 분리 원칙을 명시한다.
5. 테스트, 성능, 운영 안정성 기준을 명시한다.
6. 금지 패턴과 신규 서비스 추가 체크리스트를 명시한다.

위 기준을 충족한 경우 이 파일은 `services/api/src/services/README.md`의 문서상·이론상 최종본으로 본다. 단, 실제 프로젝트 종합 완성도는 각 서비스 구현체, 라우트 연결, 저장소 구현, 미들웨어 연결, DB migration, E2E/QA, 배포 검증이 모두 통과해야 확정된다.
