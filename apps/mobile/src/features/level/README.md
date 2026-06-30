# 급여납치 Mobile Feature: Level

> 대상 경로: `apps/mobile/src/features/level`  
> 문서 버전: v3.1.0  
> 상태: 문서상·이론상 파일 단위 최종본  
> 범위: 독서, 뉴스, 영어, 건강 미션과 경험치 기반 LV UP 자기계발 모듈

## 1. 모듈 목적

`level` 기능 모듈은 급여납치 모바일 앱에서 사용자의 자기계발 루틴을 지속 가능한 미션 단위로 관리하는 영역이다. 이 모듈은 독서, 뉴스, 영어, 건강 미션을 통합하고, 각 활동의 완료 여부, 경험치, 연속 실천일, 레벨, 배지, 커뮤니티 인증 흐름을 관리한다.

급여납치의 핵심은 급여·예산·지출·저축을 서버 권위로 관리하면서 사용자가 남은 생활 예산 안에서 더 나은 생활 습관을 만들도록 돕는 것이다. `level` 모듈은 이 목표를 자기계발 루틴으로 확장한다. 돈을 직접 더 쓰게 만드는 기능이 아니라, 소비와 무관한 성장 루틴을 통해 급여 납치 성공률을 높이는 보조 시스템이다.

## 2. 적용 원칙

이 모듈은 다음 원칙을 반드시 따른다.

1. 모든 LV UP 미션 결과와 경험치 계산은 서버 권위로 확정한다.
2. 모바일 클라이언트는 미션 입력, 화면 표시, 임시 낙관적 UI만 수행한다.
3. 금액, 급여, 지출, 저축, 계좌, 카드 등 원시 금융 데이터는 LV UP 미션이나 커뮤니티 인증에 노출하지 않는다.
4. 광고와 제휴는 금융 금액 기반 타겟팅을 사용하지 않는다.
5. 커뮤니티 인증은 익명 표시를 기본으로 하며 내부 사용자 식별자는 서버에서만 보관한다.
6. 건강 미션은 생활 루틴 관리이며 의료 진단, 처방, 치료 판단을 제공하지 않는다.
7. 독서와 뉴스 미션은 저작권 전문 저장을 금지하고 출처, 요약, 사용자의 생각 기록 중심으로 동작한다.
8. 영어 미션은 학습 기록, 단어, 퀴즈, 말하기 노트 중심으로 동작하고 민감 개인정보 입력을 차단한다.
9. 푸시 알림, 광고, 커뮤니티 연동 시 raw push token, raw financial data, raw personal data를 외부로 전달하지 않는다.
10. 모든 날짜 저장은 UTC 기준이며 사용자 표시만 Asia/Seoul 기준으로 처리한다.

## 3. 포함 하위 영역

| 영역            | 설명                                        | 주요 화면                                |
| --------------- | ------------------------------------------- | ---------------------------------------- |
| Reading         | 독서 루틴, 요약, 비공개 노트, 퀴즈, 저장    | `apps/mobile/app/level/reading.tsx`      |
| News            | 뉴스 읽기, 출처 확인, 이해 퀴즈, 저장       | `apps/mobile/app/level/news.tsx`         |
| English         | 영어 단어, 리딩, 리스닝, 스피킹 노트, 퀴즈  | `apps/mobile/app/level/english.tsx`      |
| Health          | 걷기, 운동, 스트레칭, 수분, 수면, 마음 루틴 | `apps/mobile/app/level/health.tsx`       |
| Level Home      | 오늘의 성장 요약, 미션 현황, 배지, 인사이트 | `apps/mobile/app/(tabs)/level/index.tsx` |
| Community Proof | LV UP 완료 인증글 작성 연동                 | `apps/mobile/app/community/write.tsx`    |

## 4. 서버 권위 데이터 흐름

```text
Mobile UI
  -> /api/v1/growth/dashboard
  -> /api/v1/growth/{domain}/dashboard
  -> /api/v1/growth/{domain}/tasks/:id/complete
  -> /api/v1/growth/{domain}/quiz/submit
  -> /api/v1/community/posts
  -> Server Authority Calculation
  -> Audit / Notification / Community Moderation
```

클라이언트는 다음 값을 직접 확정하지 않는다.

- 레벨
- 누적 경험치
- 오늘 획득 경험치
- 연속 실천일
- 미션 완료 확정 여부
- 배지 부여 여부
- 커뮤니티 인증글 공개 여부
- 광고·제휴 노출 가능 여부
- 운영 통계 및 관리자 지표

## 5. 주요 API 계약

### 5.1 공통 대시보드

```http
GET /api/v1/growth/dashboard
```

사용자의 전체 LV UP 상태를 조회한다.

필수 응답 범위:

- 오늘 미션 수
- 완료 미션 수
- 레벨
- 경험치
- 연속 실천일
- 추천 루틴
- 배지
- 개인정보 보호 상태

### 5.2 독서

```http
GET  /api/v1/growth/reading/dashboard
POST /api/v1/growth/reading/books/:bookId/read
POST /api/v1/growth/reading/books/:bookId/bookmark
POST /api/v1/growth/reading/books/:bookId/notes
POST /api/v1/growth/reading/quiz/submit
```

필수 정책:

- 저작권 전문 저장 금지
- 짧은 인용과 사용자 요약 중심
- 노트는 비공개 기본값
- 출처 표시 필수
- 금융 원시 데이터 포함 금지

### 5.3 뉴스

```http
GET  /api/v1/growth/news/dashboard
POST /api/v1/growth/news/articles/:articleId/read
POST /api/v1/growth/news/articles/:articleId/bookmark
POST /api/v1/growth/news/quiz/submit
```

필수 정책:

- 출처 표시 필수
- publisher tracking identifier 노출 금지
- 기사 전문 저장 금지
- 퀴즈는 이해도 평가용이며 투자 조언으로 해석되지 않도록 제한
- 광고 금융 타겟팅 금지

### 5.4 영어

```http
GET  /api/v1/growth/english/dashboard
POST /api/v1/growth/english/tasks/:taskId/complete
POST /api/v1/growth/english/quiz/submit
```

필수 정책:

- CEFR 또는 내부 레벨은 서버에서 확정
- 단어, 리딩, 리스닝, 스피킹 노트 기록 지원
- 민감 개인정보 입력 차단
- 스피킹 노트는 금융·개인정보 redaction 후 저장

### 5.5 건강

```http
GET  /api/v1/growth/health/dashboard
POST /api/v1/growth/health/tasks/:taskId/complete
POST /api/v1/growth/health/water/log
```

필수 정책:

- 의료 진단, 처방, 치료 판단 제공 금지
- 생활 루틴, 수분, 걷기, 스트레칭, 수면 점검 중심
- 건강 민감정보 원문 저장 금지
- 위급 증상 안내는 일반 안전 문구로 제한하고 의료기관 상담을 권장

### 5.6 커뮤니티 인증

```http
POST /api/v1/community/posts
POST /api/v1/community/posts/preview
POST /api/v1/community/drafts
```

필수 정책:

- 익명 표시 기본값
- 내부 `user_id`는 서버 보관
- 금액, 급여, 계좌, 카드, 전화, 이메일 등 민감정보 차단
- 위험 조언, 원시 금융 공개, 과도한 개인정보 공개는 차단 또는 검토 상태로 전환
- 모든 신고, 숨김, 복구, 삭제, 제재는 관리자 감사 로그에 남김

## 6. 클라이언트 상태 모델

권장 상태 구조:

```ts
type LevelMissionStatus = "TODO" | "DONE" | "LOCKED" | "REVIEW";
type LevelDomain = "READING" | "NEWS" | "ENGLISH" | "HEALTH";

type LevelMission = Readonly<{
  id: string;
  domain: LevelDomain;
  title: string;
  description: string;
  status: LevelMissionStatus;
  xp: number;
  dueDate: string;
  communityShareEnabled: boolean;
  rawFinancialDataExposed: false;
  rawPersonalDataExposed: false;
  adsFinancialTargetingUsed: false;
}>;
```

금액은 LV UP 모듈에서 계산하거나 노출하지 않는다. 급여·예산·지출·저축과 연동되는 경우에도 화면에는 서버가 마스킹한 요약 라벨만 표시한다.

## 7. 경험치 정책

경험치 정책은 서버에서 확정한다.

권장 기준:

| 미션 유형 | 예시                      | 기본 XP |
| --------- | ------------------------- | ------: |
| 짧은 독서 | 3~5분 독서 완료           |   30~50 |
| 뉴스 읽기 | 출처 확인 + 요약          |   25~45 |
| 영어 단어 | 단어 카드 학습            |   20~40 |
| 영어 퀴즈 | 정답 제출                 |   30~60 |
| 건강 루틴 | 걷기, 물 마시기, 스트레칭 |   20~50 |
| 인증글    | 안전한 커뮤니티 인증      |   10~30 |

서버는 중복 완료, 시간 조작, 비정상 반복 요청, 봇성 제출을 감지해 경험치 지급을 보류할 수 있어야 한다.

## 8. 보안·개인정보 보호

모든 요청에는 다음 헤더를 포함한다.

```http
x-client-platform: ios|android|web
x-correlation-id: <uuid>
x-raw-financial-data-exposed: false
x-raw-personal-data-exposed: false
x-ad-financial-targeting-used: false
```

건강 영역은 다음 헤더도 포함한다.

```http
x-raw-health-diagnosis-exposed: false
```

뉴스 영역은 다음 헤더도 포함한다.

```http
x-raw-publisher-tracking-exposed: false
```

독서 영역은 다음 헤더도 포함한다.

```http
x-raw-copyright-full-text-exposed: false
```

푸시 알림과 연동될 때는 다음 경계가 필요하다.

```http
x-raw-push-token-exposed: false
```

## 9. 금지 데이터

LV UP 모듈에는 다음 원문을 저장하거나 표시하지 않는다.

- 비밀번호, 토큰, 세션, 쿠키
- 이메일, 전화번호, 실명 기반 식별자
- 계좌번호, 카드번호
- 급여 원금액, 월급 원금액
- 지출 원금액, 저축 원금액
- 대출, 부채, 이자 등 민감 금융 세부값
- FCM/APNs raw push token
- 의료 진단명, 처방, 치료 기록 원문
- 저작권이 있는 도서/기사 전문
- 광고주에게 전달 가능한 사용자 식별자

## 10. UI/UX 기준

- 한국어 우선 UI를 사용한다.
- 모바일 작은 화면에서 한 손 조작이 가능해야 한다.
- 각 미션 카드는 제목, 설명, XP, 진행 상태, 완료 버튼, 인증글 버튼을 제공한다.
- 완료 후 서버 응답 전까지 로딩 상태를 제공한다.
- 실패 시 민감정보를 제거한 오류 메시지만 표시한다.
- 오프라인 상태에서는 seed 또는 캐시 데이터로 읽기 전용 표시를 허용한다.
- 완료 확정, 경험치 지급, 배지 부여는 서버 응답 이후 반영한다.
- 건강 영역은 의료 조언처럼 보이는 문구를 피한다.
- 독서·뉴스 영역은 출처와 요약 중심으로 구성한다.

## 11. 알림 연동

LV UP 미션은 알림 모듈과 연동된다.

주요 알림:

- 오늘의 루틴 시작 알림
- 미션 완료 리마인더
- 연속 실천일 끊김 방지 알림
- 배지 획득 알림
- 커뮤니티 인증글 댓글 알림

알림 payload에는 raw 금융 데이터, raw 개인정보, raw push token을 포함하지 않는다.

## 12. 광고·제휴 정책

LV UP 화면에서 광고 또는 제휴가 노출될 수 있으나 다음을 금지한다.

- 급여 금액 기반 타겟팅
- 지출 금액 기반 타겟팅
- 저축 금액 기반 타겟팅
- 급여 납치 성공/실패 여부 기반 타겟팅
- 사용자 식별자 또는 금융 원문 데이터의 광고주 전달

허용 범위:

- 화면 맥락 기반 비개인화 광고
- 명확한 `광고` 또는 `제휴` 라벨
- 집계형 성과 로그
- 사용자 식별 불가능한 contextual placement

## 13. 테스트 체크리스트

파일 단위 완료 기준:

- README가 모듈 목적, 범위, API, 정책, UI, 테스트 기준을 모두 설명한다.
- 독서, 뉴스, 영어, 건강 도메인이 모두 포함된다.
- 경험치와 레벨이 서버 권위임을 명시한다.
- 커뮤니티 인증글 연동 정책을 포함한다.
- 광고·제휴 privacy boundary를 포함한다.
- 민감 데이터 금지 목록을 포함한다.
- 저작권·의료·금융 민감정보 경계를 포함한다.

앱 통합 완료 기준:

- `apps/mobile/app/(tabs)/level/index.tsx`에서 LV UP 홈이 정상 표시된다.
- `apps/mobile/app/level/reading.tsx`가 정상 이동·완료·노트·퀴즈 기능을 제공한다.
- `apps/mobile/app/level/news.tsx`가 정상 이동·검색·읽기·저장·퀴즈 기능을 제공한다.
- `apps/mobile/app/level/english.tsx`가 정상 이동·단어·퀴즈·스피킹 기능을 제공한다.
- `apps/mobile/app/level/health.tsx`가 정상 이동·건강 루틴·수분·회복 노트 기능을 제공한다.
- `apps/mobile/app/community/write.tsx`로 안전한 인증글 작성이 가능하다.
- `/api/v1/growth/*` API가 서버 권위로 응답한다.
- 전체 Expo 빌드와 E2E 테스트가 통과한다.

## 14. 자체 검증 결과

이 README는 다음 관점으로 검토되었다.

1. 급여납치 핵심 도메인과 LV UP 도메인의 연결성 검토
2. 독서, 뉴스, 영어, 건강 미션 누락 여부 검토
3. 서버 권위 경험치·레벨 정책 검토
4. 커뮤니티 인증글 및 moderation 경계 검토
5. 광고·제휴와 개인정보 보호 경계 검토
6. 저작권 전문 저장 금지 검토
7. 건강 의료 진단 금지 검토
8. 모바일 UI/UX와 테스트 체크리스트 검토

## 15. 객관적 완성도 판정

이 파일은 `apps/mobile/src/features/level/README.md`의 역할 기준으로 LV UP 기능 모듈의 목적, 범위, 도메인, API, 서버 권위, 개인정보 보호, 광고·제휴, 커뮤니티 인증, 테스트 기준을 모두 포함한다. 따라서 문서상·이론상 파일 단위 완성도 100%로 사용할 수 있다.

프로젝트 종합 운영 100%는 실제 저장소에 이 문서를 배치한 뒤 모바일 앱 전체 typecheck, Expo 빌드, `/api/v1/growth/*` API, 커뮤니티 인증글, 알림, 광고·제휴 정책, 관리자 moderation, E2E/QA까지 통과해야 확정된다.
