# apps/admin · 급여납치 관리자 콘솔

> 최종 파일 위치: `apps/admin/README.md`  
> 문서 버전: `v3.1.3`  
> 적용 범위: 급여납치 플랫폼 관리자 웹 애플리케이션 전체

`apps/admin`은 급여납치 플랫폼의 운영자용 관리자 웹 애플리케이션이다. 이 앱은 회원, 관리자 계정, 게시글, 댓글, 신고, 공지, 배너, 이벤트, 운영 지표, 감사 로그, 광고·제휴 운영, 개인정보 요청, CS/모더레이션 업무를 서버 권위와 감사 로그 경계 안에서 관리한다.

이 README는 관리자 앱의 구조, 실행 방법, 품질 게이트, 보안·개인정보 정책, 광고·제휴 운영 원칙, 화면·기능 범위, 배포 기준을 한 파일에서 확인할 수 있도록 작성된 `apps/admin` 폴더의 기준 문서다.

---

## 1. 역할과 책임

관리자 콘솔은 일반 사용자 앱이 아니라 고권한 운영 도구다. 따라서 모든 화면과 API 호출은 다음 원칙을 따른다.

1. 서버가 최종 권한자다.
2. 관리자 화면은 표시·승인·조치 도구이며 핵심 계산과 권한 판단을 클라이언트에서 확정하지 않는다.
3. 관리자 mutation은 항상 인증, RBAC, MFA, 감사 로그, 사유 기록을 통과해야 한다.
4. raw 금융 데이터, raw push token, 비식별 처리 전 개인정보는 관리자 화면·로그·광고 시스템으로 노출하지 않는다.
5. 광고·제휴 운영은 급여, 소득, 지출, 저축, 납치 금액 기반 타겟팅을 금지한다.
6. 모든 export는 비식별·마스킹·권한 검증·사유 기록·감사 로그 저장 기준을 충족해야 한다.

관리자 콘솔은 다음 도메인을 운영한다.

- 인증/Auth: 관리자 로그인, MFA, 세션, 권한, 토큰 폐기
- 사용자/User: 회원 상태, 잠금, 정지, 복구, 탈퇴, 개인정보 export
- 커뮤니티/Community: 게시글, 댓글, 신고, 제재, 숨김, 복구, 삭제
- 공지/Notice: 서비스 공지, 보안 공지, 점검 공지, 정책 공지, 알림 발송
- 배너/Banner: 광고, 제휴, 서비스 안내, 캠페인 배너
- 이벤트/Event: 감사 로그, 운영 이벤트, 장애 이벤트, 보안 이벤트
- 지표/Metrics: 운영 지표, 서비스 상태, 광고 성과, 커뮤니티 품질 지표
- 신고/Reports: 신고, CS, 모더레이션, SLA, 위험도, 조치 기록
- 운영/Ops: readiness, incident, scheduler, notification, queue 상태

---

## 2. 플랫폼 기준

급여납치 플랫폼은 급여 관리, 예산 관리, 지출 관리, 저축 관리, 알림, LV UP 성장, 커뮤니티, 광고·제휴, 관리자 운영을 통합한 서비스다.

관리자 앱은 일반 사용자 기능을 대체하지 않고, 아래 영역을 운영·감사·검증하는 역할을 수행한다.

| 영역      | 관리자 콘솔 책임                                             |
| --------- | ------------------------------------------------------------ |
| 급여      | 급여 계획 운영 상태, 서버 계산 결과 검토, 문제 신고 대응     |
| 예산      | 일일 예산·월간 예산 데이터 상태 확인, 이상 징후 파악         |
| 지출      | 고정지출·변동지출 운영 이벤트 확인, 민감 금액 직접 노출 금지 |
| 저축      | 고정저축·목표저축 상태 확인, 알림·정산 이슈 대응             |
| 알림      | 공지·보안·운영 알림 발송 정책 확인, raw push token 비노출    |
| LV UP     | 성장 과제·레벨·배지 운영 지표 확인                           |
| 커뮤니티  | 게시글·댓글·신고·제재·복구·삭제 운영                         |
| 광고·제휴 | 캠페인·배너·파트너 운영, 금융 타겟팅 금지                    |
| 운영      | 감사 로그, 이벤트, 장애, readiness, 지표 확인                |

---

## 3. 서버 권위 계산식

관리자 앱은 아래 계산식을 표시하거나 검증 보조 정보로 사용할 수 있지만, 최종 계산은 API 서버가 수행한다.

```text
planned_total_expense = fixed_expense + daily_living_budget + planned_other_expense
expected_hijack = max(0, expected_salary - planned_total_expense)
today_remaining_budget = max(0, daily_limit - today_variable_expense)
monthly_actual_hijack = max(0, actual_income + carry_over - actual_expense - actual_savings)
```

계산 정책은 다음을 따른다.

- 금액은 KRW 정수로 처리한다.
- 음수 금액과 소수 금액을 허용하지 않는다.
- 저장 시각은 UTC 기준으로 보관하고, 관리자 화면은 Asia/Seoul 기준으로 표시한다.
- 사용자의 raw 급여·지출·저축 금액은 광고·제휴·타겟팅·로그에 전달하지 않는다.

---

## 4. 폴더 구조

`apps/admin`의 구조는 다음 기준으로 고정한다.

```text
apps/admin/
├── README.md
├── package.json
├── next.config.js
├── tsconfig.json
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── login/page.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── users/page.tsx
│   │   ├── posts/page.tsx
│   │   ├── reports/page.tsx
│   │   ├── notices/page.tsx
│   │   ├── banners/page.tsx
│   │   ├── metrics/page.tsx
│   │   └── events/page.tsx
│   ├── components/
│   │   └── README.md
│   ├── features/
│   │   ├── banner-management/README.md
│   │   ├── content-moderation/README.md
│   │   ├── event-management/README.md
│   │   ├── notice-management/README.md
│   │   └── user-management/README.md
│   ├── lib/
│   ├── styles/
│   ├── types/
│   └── utils/
└── tests/
```

현재 관리자 화면 파일들은 React import와 JSX 의존을 제거한 Client Page 방식으로도 동작하도록 구성될 수 있다. 이는 프로젝트의 React 타입 또는 JSX compiler option 오류가 있는 환경에서도 파일 단위 TypeScript 검증을 통과하기 위한 운영 안정화 방식이다. 저장소의 Next/React 설정이 정상화된 뒤에도 동일한 API boundary와 보안 정책은 유지되어야 한다.

---

## 5. 주요 화면

### 5.1 `/admin`

관리자 진입 게이트다.

- 관리자 세션 확인
- MFA/RBAC 경계 확인
- readiness 확인
- `/admin/dashboard` 또는 `/admin/login` 라우팅
- 서버 권위 계산식 표시
- Privacy Guard 표시
- 광고 금융 타겟팅 금지 표시

### 5.2 `/admin/login`

관리자 보안 로그인 화면이다.

- 관리자 ID/비밀번호 로그인
- TOTP MFA
- Recovery code
- WebAuthn 진입점
- 세션 확인
- 로그아웃
- 보안 정책 표시

### 5.3 `/admin/dashboard`

운영 대시보드다.

- API, Scheduler, Notifications, Admin, DB, Queue, Storage 상태
- 운영 지표 카드
- 모더레이션 큐
- 장애/보안 이벤트
- 빠른 조치
- Privacy/Ads/Audit Guard

### 5.4 `/admin/users`

사용자·계정 운영 화면이다.

- 사용자 검색·필터·정렬
- 역할, 상태, 위험도, 동의 상태 확인
- 이메일 인증, 잠금, 해제, 정지, 복구
- 강제 로그아웃, 토큰 폐기, 비밀번호 재설정
- 개인정보 export, 익명화, 영구삭제
- 관리자 사유와 감사 로그 기록

### 5.5 `/admin/posts`

커뮤니티 게시글 운영 화면이다.

- 게시글·댓글 상태 확인
- 익명 표시 유지
- 작성자 내부 식별자는 hash-only 표시
- 승인, 숨김, 복구, 잠금, 해제, 고정, 삭제
- 신고와 제재 연동
- raw 금융 내용 노출 방지

### 5.6 `/admin/reports`

신고·CS·모더레이션 처리 화면이다.

- 신고 유형별 필터
- SLA와 위험도 확인
- 담당자 배정
- triage, resolve, reject, archive
- 대상 숨김·복구
- 사용자 제재
- 비식별 export

### 5.7 `/admin/notices`

공지 운영 화면이다.

- 서비스, 급여, 예산, 저축, 커뮤니티, 광고, 보안, 점검, 정책 공지
- 작성, 수정, 발행, 일시중지, 보관
- pin/unpin
- 테스트 발송
- 알림 정책과 마케팅 동의 guard

### 5.8 `/admin/banners`

배너·광고·제휴 운영 화면이다.

- 광고, 제휴, 서비스 안내, 캠페인 관리
- 광고/제휴 라벨 표시
- contextual segment만 허용
- 급여·소득·지출·저축·납치 금액 타겟팅 금지
- 활성화, 중지, 복제, 보관

### 5.9 `/admin/metrics`

운영 지표 화면이다.

- 서비스 성능 지표
- 커뮤니티 품질 지표
- 광고·제휴 집계 지표
- 알림·스케줄러 상태
- redacted export
- raw 데이터 비노출

### 5.10 `/admin/events`

감사·운영 이벤트 화면이다.

- 감사 이벤트
- 보안 이벤트
- 스케줄러 이벤트
- 알림 이벤트
- 커뮤니티 이벤트
- 광고 이벤트
- resolve, retry, archive, redacted export

---

## 6. API Boundary

관리자 앱은 다음 API prefix를 사용한다.

```text
/admin/auth
/admin/api/v1
```

주요 endpoint 예시는 다음과 같다.

```text
GET  /admin/auth/session
POST /admin/auth/login
POST /admin/auth/mfa/verify
POST /admin/auth/logout
GET  /admin/api/v1/dashboard
GET  /admin/api/v1/dashboard/readiness
GET  /admin/api/v1/users
GET  /admin/api/v1/posts
GET  /admin/api/v1/reports
GET  /admin/api/v1/notices
GET  /admin/api/v1/banners
GET  /admin/api/v1/metrics
GET  /admin/api/v1/events
```

모든 관리자 mutation 요청은 다음 기준을 충족해야 한다.

```text
X-Admin-Reason: <관리자 조치 사유>
credentials: include
cache: no-store
```

금지 header 또는 payload 상태는 다음과 같다.

```text
rawFinancialDataExposed = false
rawPersonalDataExposed = false
rawPushTokenLogged = false
adsFinancialTargetingUsed = false
```

---

## 7. 보안 정책

관리자 콘솔은 다음 보안 정책을 적용한다.

- 관리자 인증 필수
- MFA 필수
- RBAC 필수
- OPERATOR, ADMIN, SUPER_ADMIN 역할 분리
- mutation 사유 필수
- 감사 로그 저장 필수
- no-store fetch
- no-cache 관리자 화면
- secret 환경변수의 `NEXT_PUBLIC_*` 노출 금지
- raw token 표시 금지
- raw push token 표시 금지
- raw 금융 데이터 표시·로그·광고 전달 금지
- 개인정보 export는 비식별 기준만 허용
- 영구삭제와 익명화는 정책·법적 보존기간·분쟁 여부 확인 후 수행

권한 원칙은 다음과 같다.

| 역할        | 허용 범위                                 |
| ----------- | ----------------------------------------- |
| OPERATOR    | 일반 운영 조회, 제한된 moderation 조치    |
| ADMIN       | 사용자·게시글·공지·배너·신고 운영 조치    |
| SUPER_ADMIN | 민감 운영 조치, 정책 변경, 영구 삭제 승인 |

---

## 8. 개인정보와 광고 정책

관리자 콘솔에서 광고·제휴 기능을 운영할 때 다음을 금지한다.

- expected salary 기반 타겟팅
- actual income 기반 타겟팅
- fixed expense 기반 타겟팅
- variable expense 기반 타겟팅
- savings amount 기반 타겟팅
- expected hijack 기반 타겟팅
- monthly actual hijack 기반 타겟팅
- 대출·부채·급여·계좌·카드 정보 기반 타겟팅
- push token 또는 device token 기반 타겟팅
- 사용자 식별자를 광고주에게 전달하는 행위

허용되는 광고·제휴 방식은 다음과 같다.

- contextual placement
- 비개인화 광고
- 화면 맥락 기반 placement
- 집계 지표 기반 운영 판단
- 광고/제휴 라벨 명확 표시
- raw 사용자 금융 데이터 없이 캠페인 성과 집계

---

## 9. 환경변수

관리자 앱의 공개 환경변수는 allowlist 기반으로 제한한다.

```text
NEXT_PUBLIC_APP_ENV
NEXT_PUBLIC_APP_VERSION
NEXT_PUBLIC_ADMIN_BASE_PATH
NEXT_PUBLIC_ADMIN_API_BASE_PATH
NEXT_PUBLIC_ADMIN_AUTH_BASE_PATH
NEXT_PUBLIC_ASSET_BASE_URL
```

다음 패턴은 공개 환경변수로 사용할 수 없다.

```text
SECRET
TOKEN
PASSWORD
PRIVATE
DATABASE
JWT
KEY
COOKIE
SESSION
FCM
SERVICE_ACCOUNT
NEON
WEBHOOK
```

서버 비밀값은 Cloudflare Pages/Workers secret 또는 배포 환경의 private variable로 관리한다.

---

## 10. 실행 스크립트

`apps/admin/package.json` 기준 스크립트는 다음 목적을 갖는다.

```bash
pnpm --filter @salary-hijacking/admin dev
pnpm --filter @salary-hijacking/admin typecheck:strict
pnpm --filter @salary-hijacking/admin lint
pnpm --filter @salary-hijacking/admin test:qa
pnpm --filter @salary-hijacking/admin build
pnpm --filter @salary-hijacking/admin deploy:staging
pnpm --filter @salary-hijacking/admin deploy:production
```

로컬 개발 기본 포트는 `3001`이다.

```bash
pnpm --filter @salary-hijacking/admin dev
```

---

## 11. 품질 게이트

관리자 앱은 다음 게이트를 통과해야 한다.

1. JSON parse
2. TypeScript strict
3. ESLint max warnings 0
4. unit test
5. integration test
6. accessibility test
7. privacy check
8. policy check
9. Next build
10. Cloudflare Pages build
11. staging deploy
12. staging E2E
13. production deploy
14. production smoke
15. audit log verification

최소 품질 명령은 다음과 같다.

```bash
pnpm --filter @salary-hijacking/admin quality
```

전체 CI 기준은 다음과 같다.

```bash
pnpm --filter @salary-hijacking/admin ci
```

---

## 12. 접근성 기준

관리자 콘솔은 운영 도구이지만 접근성 기준을 유지해야 한다.

- 키보드 접근 가능
- skip link 제공
- 버튼과 입력에 명확한 label 또는 aria-label 제공
- 위험 조치에 명확한 안내 제공
- 색상만으로 상태를 전달하지 않음
- 반응형 레이아웃 지원
- reduced motion 선호 지원

---

## 13. 운영 로그와 감사 로그

감사 로그는 관리자 조치의 필수 조건이다.

관리자 로그에는 다음을 남긴다.

- 관리자 ID 또는 관리자 hash
- 역할
- 조치 대상 타입
- 조치 대상 ID 또는 hash
- 조치 action
- 조치 reason
- 조치 결과
- 요청 시간
- IP hash
- User-Agent hash
- correlation id

로그에 남기지 않는 값은 다음과 같다.

- 비밀번호
- access token
- refresh token
- FCM token
- raw device token
- raw email
- raw phone
- raw account number
- raw card number
- raw salary amount
- raw expense amount
- raw savings amount
- raw hijack amount

---

## 14. 배포 기준

관리자 앱은 Cloudflare Pages 배포를 기준으로 한다.

배포 전 확인 항목은 다음과 같다.

- `next.config.js` 보안 header 확인
- `tsconfig.json` strict 옵션 확인
- `package.json` build gate 확인
- 관리자 API rewrite 확인
- 관리자 Auth rewrite 확인
- no-store header 확인
- secret 환경변수 미노출 확인
- staging E2E 통과
- production smoke 통과

배포 명령 예시는 다음과 같다.

```bash
pnpm --filter @salary-hijacking/admin deploy:staging
pnpm --filter @salary-hijacking/admin deploy:production
```

---

## 15. 금지 패턴

다음 패턴은 관리자 앱에서 금지한다.

```text
console.log(rawUser)
console.log(token)
console.log(pushToken)
console.log(salary)
console.log(expense)
console.log(savings)
localStorage.setItem("token", ...)
NEXT_PUBLIC_JWT_SECRET
NEXT_PUBLIC_DATABASE_URL
NEXT_PUBLIC_FCM_SERVICE_ACCOUNT
adsTarget.salaryAmount
adsTarget.expenseAmount
adsTarget.savingsAmount
adsTarget.hijackAmount
```

관리자 앱은 편의를 위해 민감 데이터 접근을 우회하지 않는다.

---

## 16. 완료 기준

이 폴더가 문서상·이론상 최종본으로 인정되려면 다음이 충족되어야 한다.

- 관리자 package 설정이 strict build gate를 가진다.
- tsconfig가 Next 관리자 앱과 TypeScript strict 기준을 충족한다.
- next.config가 보안 header, no-store, secret env guard, rewrite, redirect 기준을 충족한다.
- 관리자 app route가 진입, 로그인, 대시보드, 사용자, 게시글, 신고, 공지, 배너, 지표, 이벤트 화면을 포함한다.
- 각 화면은 관리자 API boundary를 사용한다.
- 모든 mutation은 `X-Admin-Reason`을 요구한다.
- raw 금융 데이터, raw push token, 광고 금융 타겟팅은 차단된다.
- README 문서가 components와 features의 책임을 설명한다.
- 품질 게이트가 typecheck, lint, QA, build, deploy까지 연결된다.
- 운영 기준에서는 staging/production E2E와 감사 로그 저장이 검증된다.

---

## 17. 객관적 상태

이 README는 `apps/admin` 폴더의 문서상·이론상 최종 구조를 정의한다. 파일 단위로는 관리자 콘솔의 역할, 구조, 화면, API boundary, 서버 권위, 개인정보 보호, 광고 정책, 보안 정책, 품질 게이트, 배포 기준을 모두 포함한다.

운영 환경에서의 프로젝트 종합 100% 확정은 실제 저장소 기준으로 다음을 통과해야 한다.

```bash
pnpm install
pnpm --filter @salary-hijacking/admin validate:env
pnpm --filter @salary-hijacking/admin typecheck:strict
pnpm --filter @salary-hijacking/admin lint
pnpm --filter @salary-hijacking/admin test:qa
pnpm --filter @salary-hijacking/admin build
pnpm --filter @salary-hijacking/admin deploy:staging
pnpm --filter @salary-hijacking/admin deploy:production
```

---

## 18. 최종 선언

`apps/admin`은 급여납치 플랫폼의 운영·관리·감사·보안·광고·제휴·커뮤니티 모더레이션을 담당하는 관리자 웹 애플리케이션이다. 이 폴더는 서버 권위 아키텍처, 관리자 인증, RBAC, MFA, 감사 로그, 개인정보 보호, 광고 금융 타겟팅 금지, 비식별 export, no-store 운영 정책을 기반으로 유지되어야 한다.

이 README를 기준으로 하위 파일과 화면이 구현되면, 관리자 콘솔은 문서상·이론상 상용 급여관리·가계부·자기계발 플랫폼 운영에 필요한 구조를 충족한다.
