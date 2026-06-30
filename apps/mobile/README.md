# apps/mobile · 급여납치 모바일 앱

`apps/mobile`은 급여납치 플랫폼의 사용자용 모바일 애플리케이션이다. Expo Router 기반의 React Native 앱으로 급여 홈, 계획, 일일 예산, 고정지출, 고정저축, 변동지출, 알림, LV UP, 커뮤니티, 글쓰기, 마이페이지를 제공하며 모든 금액 계산과 민감 데이터 판정은 서버 권위 API를 기준으로 처리한다.

이 README는 모바일 앱 폴더의 개발·운영·검증 기준을 고정하는 최종 문서다. 하위 파일과 디렉터리는 급여납치 플랫폼 최종 파일트리 기준으로 관리하며, 클라이언트는 표시·입력·상호작용·오프라인 보호만 담당하고 급여·예산·지출·저축·납치금액 확정 계산은 `/api/v1` 서버 응답을 따른다.

## 1. 서비스 역할

급여납치 모바일 앱의 핵심 목적은 사용자가 월급을 받은 뒤 사라지는 돈을 사후 기록하는 것이 아니라, 급여일 기준으로 고정지출·고정저축·생활비·일일 예산을 먼저 분리하고 남은 금액을 “납치금액”으로 시각화해 소비 통제와 자기계발 습관을 함께 관리하도록 돕는 것이다.

모바일 앱은 다음 경험을 하나의 흐름으로 제공한다.

1. 로그인 또는 회원가입 후 세션을 안전하게 확인한다.
2. 급여일, 예상 급여, 고정지출, 고정저축, 생활비 계획을 설정한다.
3. 홈 화면에서 급여 수령액, 계획 지출, 오늘 사용액, 남은 예산, 예상 납치금액을 확인한다.
4. 변동지출을 빠르게 기록하고 서버 재계산 결과를 반영한다.
5. 알림을 통해 급여일, 고정지출, 예산 초과, 저축, LV UP, 커뮤니티 반응을 확인한다.
6. 독서·뉴스·영어·건강 미션으로 경험치와 레벨을 쌓는다.
7. 커뮤니티에서 익명 기반으로 인증·질문·정보 공유를 수행한다.
8. 마이페이지에서 누적 성과, 내 게시글, 문의, 계정·보안·개인정보 설정을 관리한다.

## 2. 기술 스택

| 영역           | 기준                                                                    |
| -------------- | ----------------------------------------------------------------------- |
| Runtime        | Expo SDK, React Native, Hermes, Expo Router                             |
| Language       | TypeScript strict mode                                                  |
| Navigation     | Expo Router file-based routing                                          |
| State/Query    | React Query, feature-local state, 서버 응답 우선                        |
| Secure Storage | Expo SecureStore                                                        |
| Notification   | Expo Notifications + 서버 알림 정책                                     |
| Build/Deploy   | EAS Build, EAS Submit, EAS Update                                       |
| Test           | TypeScript, ESLint, Jest, React Native Testing Library, Detox E2E       |
| Design         | 다크 기반 브랜드 shell, 초록 포인트, 접근성 role, 모바일 우선 반응형 UX |

## 3. 서버 권위 원칙

모바일 앱은 재무 데이터의 원장 또는 최종 계산 주체가 아니다. 다음 계산은 반드시 서버에서 확정된 값을 사용한다.

```text
planned_total_expense = fixed_expense + daily_living_budget + planned_other_expense
expected_hijack = max(0, expected_salary - planned_total_expense)
today_remaining_budget = max(0, daily_limit - today_variable_expense)
monthly_actual_hijack = max(0, actual_income + carry_over - actual_expense - actual_savings)
```

클라이언트에서 임시 계산을 표시할 수는 있지만, 저장·확정·월마감·통계·알림·레벨 보상·관리자 운영 데이터는 서버 응답을 기준으로 갱신한다.

금액 정책은 다음을 따른다.

- KRW 정수만 허용한다.
- 음수 금액과 소수점 금액은 금지한다.
- 클라이언트 표시 금액은 서버가 마스킹하거나 확정한 값을 우선한다.
- 급여·대출·저축·지출·납치금액 원본은 광고·제휴·분석 타겟팅에 사용하지 않는다.
- 시간 저장 기준은 서버의 UTC이며, 모바일 표시는 Asia/Seoul 기준으로 변환한다.

## 4. 디렉터리 구조

```text
apps/mobile/
├─ app/
│  ├─ _layout.tsx
│  ├─ index.tsx
│  ├─ app.config.ts
│  ├─ (auth)/
│  │  ├─ login.tsx
│  │  └─ signup.tsx
│  ├─ (tabs)/
│  │  ├─ _layout.tsx
│  │  ├─ salary/index.tsx
│  │  ├─ plan/index.tsx
│  │  ├─ level/index.tsx
│  │  ├─ community/index.tsx
│  │  └─ profile/index.tsx
│  ├─ community/
│  │  ├─ [postId].tsx
│  │  └─ write.tsx
│  ├─ level/
│  │  ├─ reading.tsx
│  │  ├─ news.tsx
│  │  ├─ english.tsx
│  │  └─ health.tsx
│  └─ notifications/index.tsx
├─ src/
│  ├─ features/
│  │  ├─ salary/
│  │  ├─ plan/
│  │  ├─ budget/
│  │  ├─ expense/
│  │  ├─ notifications/
│  │  ├─ level/
│  │  ├─ community/
│  │  └─ profile/
│  └─ shared/
│     ├─ analytics/
│     ├─ api/
│     ├─ components/
│     ├─ hooks/
│     ├─ navigation/
│     ├─ storage/
│     └─ styles/
├─ assets/
├─ e2e/
├─ app.config.ts
├─ eas.json
├─ package.json
├─ tsconfig.json
└─ README.md
```

## 5. 앱 라우팅 기준

| 경로                             | 목적                                                          |
| -------------------------------- | ------------------------------------------------------------- |
| `app/_layout.tsx`                | 루트 shell, bootstrap, 인증·이메일·온보딩 게이트, Slot 렌더링 |
| `app/index.tsx`                  | 앱 진입점, bootstrap 상태에 따른 안전 라우팅                  |
| `app/(auth)/login.tsx`           | 로그인, MFA, 세션 저장, 민감 오류 redaction                   |
| `app/(auth)/signup.tsx`          | 회원가입, 약관 동의, 이메일 인증 준비, 온보딩 진입            |
| `app/(tabs)/salary/index.tsx`    | 급여 홈, 납치금액, 일일 예산, 지출 요약                       |
| `app/(tabs)/plan/index.tsx`      | 급여 계획, 고정지출, 고정저축, 생활비 계획                    |
| `app/(tabs)/level/index.tsx`     | LV UP 허브, 독서·뉴스·영어·건강 진입                          |
| `app/(tabs)/community/index.tsx` | 커뮤니티 목록, 검색, 탭, 좋아요·신고·북마크                   |
| `app/(tabs)/profile/index.tsx`   | 프로필, 누적 성과, 보안, 데이터 내보내기, 탈퇴                |
| `app/notifications/index.tsx`    | 알림함, 읽음 처리, 보관·삭제, 푸시 동의 요약                  |
| `app/community/write.tsx`        | 글쓰기, 초안, 수정, 익명, 모더레이션 preview                  |
| `app/community/[postId].tsx`     | 게시글 상세, 댓글, 신고, 삭제, 딥링크                         |
| `app/level/reading.tsx`          | 독서 미션, 책 요약, 퀴즈, 노트                                |
| `app/level/news.tsx`             | 뉴스 미션, 출처 표시, 퀴즈, 북마크                            |
| `app/level/english.tsx`          | 영어 학습, 단어, 퀴즈, 말하기 노트                            |
| `app/level/health.tsx`           | 건강 루틴, 걷기·운동·물·수면·마음 미션                        |

## 6. API 연동 원칙

모든 API는 `/api/v1` prefix를 사용한다. 관리자 전용 API는 모바일 사용자 앱에서 직접 호출하지 않는다.

공통 요청 헤더는 다음 보안 플래그를 포함해야 한다.

```text
accept: application/json
content-type: application/json
x-client-platform: ios | android | web
x-correlation-id: <uuid>
x-raw-financial-data-exposed: false
x-raw-personal-data-exposed: false
x-raw-push-token-exposed: false
x-ad-financial-targeting-used: false
```

주요 API 경계는 다음과 같다.

| 도메인           | 대표 API                                                                                              |
| ---------------- | ----------------------------------------------------------------------------------------------------- |
| Bootstrap        | `GET /api/v1/mobile/bootstrap`                                                                        |
| Auth             | `POST /api/v1/auth/login`, `POST /api/v1/auth/register`, `GET /api/v1/auth/session`                   |
| Payroll          | `GET /api/v1/payroll/home`, `POST /api/v1/payroll/plans/:id/recalculate`                              |
| Daily Budget     | `GET /api/v1/daily-budgets/current`, `POST /api/v1/daily-budgets/recalculate`                         |
| Fixed Expense    | `GET /api/v1/fixed-expenses`, `POST /api/v1/fixed-expenses/:id/pay`                                   |
| Savings          | `GET /api/v1/savings`, `POST /api/v1/savings/:id/complete`                                            |
| Variable Expense | `POST /api/v1/variable-expenses`, `DELETE /api/v1/variable-expenses/:id`                              |
| Notifications    | `GET /api/v1/notifications`, `POST /api/v1/notifications/read-all`                                    |
| Growth           | `GET /api/v1/growth/dashboard`, `POST /api/v1/growth/tasks/:id/complete`                              |
| Community        | `GET /api/v1/community/posts`, `POST /api/v1/community/posts`, `POST /api/v1/community/posts/preview` |
| User/Profile     | `GET /api/v1/users/me`, `PATCH /api/v1/users/me`, `POST /api/v1/users/me/export`                      |

## 7. 개인정보·광고·분석 정책

모바일 앱은 사용자의 급여·지출·저축·납치금액·대출·계좌·카드·푸시 토큰 원문을 광고·분석·제휴 SDK로 전달하지 않는다.

분석 이벤트는 행동 로그 중심으로 제한한다.

허용 예시는 다음과 같다.

```text
screen_view: salary_home
button_click: daily_budget_add
mission_complete: reading
community_action: post_like
notification_action: mark_read
```

금지 예시는 다음과 같다.

```text
salary_amount: 2700000
expense_amount: 13500
savings_amount: 200000
actual_hijack_amount: 5780000
account_number: ...
push_token: ...
```

광고·제휴는 contextual-only를 기본값으로 한다. 금융 금액, 급여일, 부채, 저축액, 지출액, 납치금액 기반 타겟팅은 금지한다. 광고 또는 제휴 콘텐츠는 반드시 `광고` 또는 `제휴` 라벨을 표시한다.

## 8. 커뮤니티 안전 정책

커뮤니티는 익명 표시를 지원하되 내부 user id는 서버에 보존한다. 모바일 앱은 표시명과 공개 프로필만 렌더링하며 내부 식별자, 이메일, 전화번호, 급여 원문, 계좌·카드 정보는 노출하지 않는다.

게시글 작성 시 다음 기준을 적용한다.

- 제목, 본문, 게시판 유형은 필수다.
- 금액 원문, 연락처, 계좌, 카드, 토큰, 비밀번호는 redaction 대상이다.
- 투자·대출·건강 관련 위험 조언은 모더레이션 review 또는 block 대상이다.
- 신고, 숨김, 삭제, 제재 내역은 서버 감사 로그로 남긴다.
- LV UP 인증은 금액 없이 루틴 완료 중심으로 작성한다.

## 9. 알림 정책

알림은 급여관리 루프와 자기계발 루틴을 강화하기 위한 목적으로 사용한다.

| 알림 유형      | 목적                                    |
| -------------- | --------------------------------------- |
| 급여일 알림    | 급여 계획 확인, 고정지출·저축 분리 유도 |
| 고정지출 알림  | 결제 예정, 납부 완료, 미납 경고         |
| 일일 예산 알림 | 오늘 예산, 초과 위험, 남은 예산 확인    |
| 저축 알림      | 고정저축 실행 또는 실패 확인            |
| LV UP 알림     | 독서·뉴스·영어·건강 미션 리마인드       |
| 커뮤니티 알림  | 댓글, 좋아요, 신고 결과, 공지           |
| 운영 알림      | 점검, 정책 변경, 보안 안내              |

푸시 토큰은 서버와 알림 서비스에서만 처리한다. 모바일 앱은 토큰 원문을 로그·분석·광고 이벤트에 포함하지 않는다.

## 10. 기능별 완료 기준

| 기능       | 모바일 완료 기준                                                       |
| ---------- | ---------------------------------------------------------------------- |
| 급여 홈    | 서버 응답 기반 급여/지출/저축/납치금액 표시, 광고 라벨, 예산 상태 표시 |
| 계획       | 급여일, 예상급여, 고정지출, 고정저축, 생활비 계획 입력 및 재계산 요청  |
| 일일 예산  | 오늘 사용액, 남은 금액, 초과 경고, 변동지출 추가                       |
| 고정지출   | 반복 지출 목록, 납부 상태, 결제 예정 알림 연결                         |
| 고정저축   | 저축 계획 목록, 완료 상태, 실패/성공 알림 연결                         |
| 변동지출   | 빠른 기록, 삭제, 카테고리 분류, 서버 재계산 반영                       |
| 알림       | 목록, 읽음, 전체 읽음, 보관, 삭제, 딥링크, 푸시 설정 요약              |
| LV UP      | 독서·뉴스·영어·건강 루틴, XP, 레벨, 퀴즈, 인증 연결                    |
| 커뮤니티   | 목록, 상세, 글쓰기, 댓글, 좋아요, 신고, 익명 표시                      |
| 마이페이지 | 프로필, 누적 성과, 내 게시글, 문의, 공지, 보안/개인정보 설정           |

## 11. 개발 명령어

```bash
pnpm install
pnpm --filter @salary-hijacking/mobile start
pnpm --filter @salary-hijacking/mobile typecheck
pnpm --filter @salary-hijacking/mobile lint
pnpm --filter @salary-hijacking/mobile test
pnpm --filter @salary-hijacking/mobile qa
```

EAS 빌드 명령어는 다음을 기준으로 한다.

```bash
pnpm --filter @salary-hijacking/mobile build:dev:android
pnpm --filter @salary-hijacking/mobile build:preview:android
pnpm --filter @salary-hijacking/mobile build:e2e:android
pnpm --filter @salary-hijacking/mobile build:production:android
pnpm --filter @salary-hijacking/mobile build:production:ios
```

## 12. 환경변수 정책

`EXPO_PUBLIC_*` 값에는 공개 가능한 값만 넣는다. 서버 secret, DB URL, JWT secret, FCM server key, private key, service account, raw salary, raw expense, raw savings, account/card number는 절대 넣지 않는다.

허용 예시는 다음과 같다.

```text
EXPO_PUBLIC_API_BASE_URL=https://api.salaryhijacking.com
EXPO_PUBLIC_DEEPLINK_HOST=salaryhijacking.com
EXPO_PUBLIC_NOTIFICATIONS_ENABLED=true
EXPO_PUBLIC_ADS_ENABLED=true
EXPO_PUBLIC_PARTNER_ENABLED=true
EXPO_PUBLIC_PERFORMANCE_BUDGET_MS=2500
```

## 13. 품질 기준

모바일 앱은 다음 품질 게이트를 통과해야 한다.

1. `package.json` JSON parse 통과
2. `tsconfig.json` JSON parse 통과
3. `eas.json` JSON parse 통과
4. TypeScript strict 통과
5. ESLint max warnings 0 통과
6. Jest 단위 테스트 통과
7. Detox E2E 핵심 플로우 통과
8. Expo doctor 통과
9. EAS preview build 통과
10. EAS production build 통과
11. 개인정보·광고 타겟팅 금지 검사 통과
12. 앱 시작 성능 예산 준수
13. 접근성 role 및 텍스트 대비 기준 준수
14. 오프라인 fallback 및 오류 redaction 확인
15. 푸시 토큰·급여 원문 로그 미노출 확인

## 14. E2E 핵심 시나리오

```text
1. 앱 실행 → bootstrap → 로그인 필요 시 로그인 화면 이동
2. 회원가입 → 이메일 인증 → 온보딩 → 급여 홈 진입
3. 급여 계획 생성 → 고정지출/고정저축/생활비 설정 → 예상 납치금액 확인
4. 변동지출 추가 → 일일 예산 잔액 변경 → 서버 재계산 반영
5. 알림 수신 → 읽음 처리 → 딥링크 이동
6. LV UP 미션 완료 → XP/레벨 반영 → 커뮤니티 인증 작성
7. 커뮤니티 글 작성 → 상세 조회 → 댓글/좋아요/신고
8. 마이페이지 → 데이터 내보내기 → 로그아웃
```

## 15. 배포 기준

프로덕션 배포 전 다음 조건을 모두 만족해야 한다.

- 실제 API 도메인이 설정되어 있다.
- 딥링크 도메인과 앱 scheme이 검증되어 있다.
- iOS/Android 인증서와 푸시 인증서가 연결되어 있다.
- EAS production build가 성공했다.
- 앱스토어/플레이스토어 제출 프로필이 준비되어 있다.
- 광고·제휴 라벨과 비개인화 정책이 확인되어 있다.
- 급여·지출·저축·납치금액 원문이 분석/광고/로그로 유출되지 않는다.
- 장애·점검·강제 업데이트 안내가 동작한다.
- 관리자 운영 정책과 사용자 앱 정책의 경계가 분리되어 있다.

## 16. 파일 단위 완성도 체크리스트

- [x] 모바일 앱의 역할과 범위를 정의했다.
- [x] Expo/React Native 기술 스택을 고정했다.
- [x] 서버 권위 계산 원칙을 명시했다.
- [x] 앱 라우팅과 화면별 책임을 정의했다.
- [x] `/api/v1` API 경계를 정리했다.
- [x] 개인정보·광고·분석 금지 항목을 명시했다.
- [x] 커뮤니티 안전 정책을 반영했다.
- [x] 알림 정책과 푸시 토큰 보호 기준을 반영했다.
- [x] 급여·계획·예산·지출·저축·알림·LV UP·커뮤니티·마이페이지 완료 기준을 정리했다.
- [x] 개발·품질·E2E·배포 기준을 포함했다.

## 17. 객관적 완성도 판정

이 README는 `apps/mobile` 폴더의 문서상·이론상 최종 운영 기준을 정의한다. 파일 단위로는 더 이상 단순 설명 문서가 아니라 모바일 앱 구조, 보안 경계, API 경계, 기능 기준, 품질 기준, 배포 기준을 모두 포함하는 기준 문서다.

운영 기준의 프로젝트 종합 완성도는 실제 저장소에서 `pnpm install`, `pnpm run qa`, Expo/EAS 빌드, 실제 API/푸시/딥링크 연동, 스토어 제출, E2E/QA가 모두 통과되어야 확정된다.
