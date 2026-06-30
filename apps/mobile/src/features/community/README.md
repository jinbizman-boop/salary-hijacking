# 급여납치 Mobile Community Feature

> `apps/mobile/src/features/community`는 급여납치 모바일 앱의 커뮤니티 도메인을 담당하는 기능 모듈이다. 이 문서는 커뮤니티 목록, 상세, 글쓰기, 댓글, 신고, 익명성, 모더레이션, 첨부파일, 광고·제휴 경계, 서버 권위 API 연동, QA 기준을 파일 단위에서 더 이상 보완이 필요 없도록 정의한다.

## 1. 모듈 목표

커뮤니티 기능은 사용자가 급여·예산·절약·LV UP 루틴을 안전하게 공유하고 서로 피드백을 주고받는 공간이다. 단, 금융 원시 데이터와 개인정보는 커뮤니티에 노출하지 않는다. 모든 게시글·댓글·신고·첨부파일 상태는 서버가 최종 권위를 가진다.

이 모듈의 완성 기준은 다음과 같다.

1. 커뮤니티 목록, 상세, 글쓰기, 댓글, 좋아요, 북마크, 신고, 삭제 요청 흐름을 지원한다.
2. 사용자 화면에는 익명 표시명을 사용하되 서버에는 내부 `userId` 또는 해시 식별자를 유지한다.
3. 원시 급여, 계좌, 카드, 전화번호, 이메일, 푸시 토큰, 광고 식별자, 실제 지출 금액은 화면·로그·분석 이벤트로 노출하지 않는다.
4. 위험한 금융 조언, 개인정보 공유, 욕설, 스팸, 저작권 침해, 의료·투자·대출 단정 조언은 차단 또는 검토 상태로 전환한다.
5. 광고·제휴 노출은 맥락 기반으로 제한하고 급여·지출·저축·납치금액 기반 타겟팅을 금지한다.
6. 모든 변경 작업은 API v1, 서버 검증, 감사 로그, rate limit, correlation id를 통과해야 한다.
7. Expo Router 화면과 `src/features/community` 기능 모듈이 분리되어 재사용 가능해야 한다.

## 2. 사용자 가치

커뮤니티는 급여 납치 플랫폼의 행동 지속성을 높이는 장치다. 사용자는 자신의 급여 금액을 공개하지 않고도 예산 습관, 고정지출 줄이기, 절약 루틴, 독서·영어·뉴스·건강 LV UP 인증을 공유할 수 있다. 이 모듈은 단순 게시판이 아니라 예산 관리와 자기계발 루틴을 연결하는 안전한 참여 레이어다.

## 3. 범위

### 포함 기능

- 커뮤니티 게시글 목록 조회
- 게시글 상세 조회
- 글쓰기, 수정, 임시저장, 발행
- 댓글 작성, 삭제 요청, 좋아요, 신고
- 게시글 좋아요, 북마크, 신고
- 카테고리, 정렬, 검색, 페이지네이션
- 익명 표시명과 내부 식별자 분리
- LV UP 인증글 연결
- 첨부파일 업로드 결과 표시와 안전 스캔 상태 표시
- 모더레이션 프리뷰와 서버 검토 상태 반영
- 광고·제휴 라벨과 비금융 타겟팅 정책
- 오프라인 fallback과 skeleton/empty/error 상태

### 제외 기능

- 원시 급여명세서 공유
- 계좌·카드·전화번호 등 실명 기반 정보 공개
- 사용자 간 송금, 대출 중개, 투자 권유
- 광고주에게 사용자 식별자 또는 금융 행동 데이터 전달
- 클라이언트 단독 판단에 의한 모더레이션 최종 확정

## 4. 권장 디렉터리 구조

```text
apps/mobile/src/features/community/
├── README.md
├── api.ts
├── community.types.ts
├── community.constants.ts
├── community.validators.ts
├── community.redaction.ts
├── community.moderation.ts
├── community.service.ts
├── community.store.ts
├── community.analytics.ts
├── hooks/
│   ├── useCommunityFeed.ts
│   ├── useCommunityPost.ts
│   ├── useCommunityWrite.ts
│   └── useCommunityActions.ts
├── components/
│   ├── CommunityPostCard.tsx
│   ├── CommunityCommentItem.tsx
│   ├── CommunityWriteForm.tsx
│   ├── CommunityModerationBanner.tsx
│   ├── CommunityAttachmentList.tsx
│   └── CommunityAdDisclosure.tsx
└── __tests__/
    ├── community.redaction.test.ts
    ├── community.validators.test.ts
    ├── community.service.test.ts
    └── community.integration.test.ts
```

현재 저장소가 단일 파일 또는 화면 중심으로 구성되어 있더라도 위 구조를 기준으로 확장한다. 화면 파일은 `apps/mobile/app/(tabs)/community/index.tsx`, `apps/mobile/app/community/[postId].tsx`, `apps/mobile/app/community/write.tsx`가 담당하고, 재사용 가능한 도메인 로직은 이 feature 모듈로 이동한다.

## 5. 핵심 라우트 연계

| 화면 경로                                    | 역할                                                          |
| -------------------------------------------- | ------------------------------------------------------------- |
| `apps/mobile/app/(tabs)/community/index.tsx` | 커뮤니티 피드, 검색, 정렬, 신고, 좋아요, 북마크 진입          |
| `apps/mobile/app/community/[postId].tsx`     | 게시글 상세, 댓글, 댓글 신고·삭제, 첨부 안전 상태             |
| `apps/mobile/app/community/write.tsx`        | 글쓰기, 수정, 답글, LV UP 인증글, 임시저장, 모더레이션 프리뷰 |
| `apps/mobile/app/(tabs)/level/index.tsx`     | LV UP 인증글 작성 진입                                        |
| `apps/mobile/app/notifications/index.tsx`    | 댓글·신고·모더레이션 알림 딥링크                              |

## 6. 서버 권위 원칙

커뮤니티 도메인의 모든 쓰기 작업은 서버가 최종 결정한다. 클라이언트는 UX 개선을 위한 사전 검증만 수행한다.

- 게시글 발행 가능 여부는 서버 모더레이션 결과가 최종이다.
- 댓글 표시, 숨김, 삭제, 복구 상태는 서버 상태를 따른다.
- 좋아요, 북마크 수는 서버 집계값을 따른다.
- 신고 누적과 제재 상태는 관리자·운영 도메인 정책을 따른다.
- 첨부파일은 서버 또는 스캔 작업자가 `CLEAN`, `PENDING`, `REJECTED` 상태를 부여한다.
- 광고·제휴 노출 여부는 개인 금융 정보가 아닌 화면 맥락과 운영 설정만 사용한다.

## 7. API 계약

모든 API는 `/api/v1` prefix를 사용한다. 요청에는 공통 헤더를 포함한다.

```http
x-client-platform: ios|android|web
x-correlation-id: <uuid>
x-raw-financial-data-exposed: false
x-raw-personal-data-exposed: false
x-ad-financial-targeting-used: false
```

### 피드

```http
GET /api/v1/community/posts?board=FREE&sort=LATEST&cursor=<cursor>&limit=20
```

응답은 `posts`, `nextCursor`, `moderationNotice`, `contextualAd`를 포함할 수 있다.

### 상세

```http
GET /api/v1/community/posts/:postId
```

응답은 게시글, 댓글 목록, 첨부파일 스캔 상태, 신고 가능 여부, 작성자 익명 표시명, 서버 모더레이션 상태를 포함한다.

### 글쓰기 프리뷰

```http
POST /api/v1/community/posts/preview
```

클라이언트가 입력한 제목, 본문, 태그, 첨부파일 참조를 서버 정책으로 미리 검증한다. 결과는 `SAFE`, `REVIEW`, `BLOCKED` 중 하나다.

### 글 발행

```http
POST /api/v1/community/posts
PATCH /api/v1/community/posts/:postId
```

글쓰기, 수정, LV UP 인증글 발행에 사용한다. 원시 금융 금액, 개인정보, 광고 식별자, 의료·투자·대출 단정 조언은 서버에서 거부한다.

### 댓글

```http
POST /api/v1/community/posts/:postId/comments
POST /api/v1/community/comments/:commentId/like
POST /api/v1/community/comments/:commentId/report
POST /api/v1/community/comments/:commentId/delete
```

댓글 작성과 액션은 모두 서버 감사 로그 대상이다.

### 게시글 액션

```http
POST /api/v1/community/posts/:postId/like
POST /api/v1/community/posts/:postId/bookmark
POST /api/v1/community/posts/:postId/report
```

중복 액션과 rate limit은 서버가 통제한다.

## 8. 주요 타입 모델

```ts
type CommunityBoard = "FREE" | "LEVEL_UP" | "SAVING" | "QUESTION" | "NOTICE";
type CommunitySort = "LATEST" | "POPULAR" | "COMMENTS" | "BOOKMARKED";
type ModerationStatus = "SAFE" | "REVIEW" | "BLOCKED" | "HIDDEN" | "DELETED";
type AttachmentScanStatus = "PENDING" | "CLEAN" | "REJECTED";

type CommunityPost = Readonly<{
  id: string;
  board: CommunityBoard;
  title: string;
  bodyPreview: string;
  anonymousDisplayName: string;
  moderationStatus: ModerationStatus;
  likeCount: number;
  commentCount: number;
  bookmarkCount: number;
  createdAt: string;
  updatedAt: string;
  rawFinancialDataExposed: false;
  rawPersonalDataExposed: false;
  adsFinancialTargetingUsed: false;
}>;
```

금액이 필요한 경우에도 커뮤니티에는 실제 원시 금액을 저장하지 않는다. 필요 시 `maskedAmountLabel`, `rangeLabel`, `serverComputedBadge` 같은 비식별 표현만 사용한다.

## 9. 개인정보·금융정보 보호

커뮤니티는 공개 영역이므로 다음 정보는 저장·표시·로그·분석 이벤트에서 금지한다.

- 실제 급여액, 계좌 잔액, 카드번호, 계좌번호
- 전화번호, 이메일, 실명, 주소, 주민등록번호
- 푸시 토큰, 세션 토큰, 인증 토큰
- 광고 식별자, 기기 식별자, 외부 추적 ID
- 질병 진단, 처방, 약물 복용 등 민감 건강정보
- 타인의 저작권 전문 또는 장문 원문 복사

허용되는 표현은 다음과 같다.

- `이번 달 고정지출을 줄였다`
- `생활비를 주간 단위로 나눴다`
- `LV UP 영어 루틴을 7일 유지했다`
- `책 요약을 내 말로 기록했다`
- `금액 비공개 인증`

## 10. 모더레이션 정책

클라이언트는 빠른 피드백을 위해 로컬 모더레이션 프리뷰를 제공한다. 최종 판단은 서버가 수행한다.

### 차단 대상

- 개인정보 공개 요청 또는 공유
- 원시 금융 금액 공개를 유도하는 글
- 대출, 투자, 고수익 보장, 사행성 홍보
- 욕설, 혐오, 성적 괴롭힘, 폭력 표현
- 의료 진단·처방 조언
- 광고·스팸·피싱 링크
- 저작권 전문 복사

### 검토 대상

- 과도한 금액 암시
- 외부 링크 포함 글
- 반복 게시 또는 유사 문구
- 분쟁 가능성이 있는 금융 조언
- 신고 누적 작성자 글

## 11. 광고·제휴 경계

커뮤니티에서 광고 또는 제휴 카드는 반드시 라벨을 표시한다.

- 표시 라벨: `광고`, `제휴`
- 타겟팅 방식: 화면 맥락 기반 또는 전체 운영 캠페인
- 금지: 급여액, 지출액, 저축액, 납치금액, 대출 가능성, 커뮤니티 게시글 원문 기반 민감 타겟팅
- 광고 클릭 이벤트: 사용자 식별자와 금융 행동 데이터를 포함하지 않음
- 분석 이벤트: 집계 가능한 비식별 정보만 사용

## 12. 상태 관리 기준

커뮤니티 상태는 다음 단위로 관리한다.

- `feed`: 현재 board, sort, cursor, post ids
- `postDetail`: post, comments, attachment scan states
- `writeDraft`: title, body, tags, mode, moderation preview
- `actions`: pending like, bookmark, report, delete ids
- `error`: redacted user-safe error
- `privacyGuard`: raw exposure flags

캐시는 서버 응답의 짧은 TTL에 한해 허용한다. 발행, 수정, 삭제, 신고 후에는 관련 feed/detail cache를 무효화한다.

## 13. 접근성·UX 기준

- 모든 주요 버튼은 접근성 role과 label을 가진다.
- 신고, 삭제, 차단성 액션은 확인 단계를 제공한다.
- 빈 상태, 로딩, 에러, 오프라인 fallback을 명확히 표시한다.
- 작성 폼은 제목, 본문, 태그, 익명 표시, 댓글 허용 여부를 분리한다.
- 서버 검토 상태는 사용자에게 명확히 안내한다.
- 금액 또는 개인정보가 감지되면 저장 전 경고한다.
- 작은 화면에서도 카드가 잘리지 않도록 scroll layout을 사용한다.

## 14. 로깅·분석 기준

로그와 분석 이벤트에는 다음만 포함한다.

```ts
{
  event: "community_post_publish_attempt",
  board: "LEVEL_UP",
  moderationStatus: "SAFE",
  correlationId: "...",
  rawFinancialDataExposed: false,
  rawPersonalDataExposed: false,
  adsFinancialTargetingUsed: false
}
```

다음은 금지한다.

- 게시글 본문 전문
- 댓글 전문
- 사용자 이메일, 전화번호, 실명
- 급여·예산·지출·저축 원시 금액
- 푸시 토큰 또는 세션 토큰

## 15. 에러 처리 기준

사용자에게 표시되는 에러는 민감정보가 제거되어야 한다.

| HTTP 상태 | 사용자 메시지                                       |
| --------: | --------------------------------------------------- |
|       401 | 로그인이 필요합니다.                                |
|       403 | 커뮤니티 접근 권한이 없습니다.                      |
|       404 | 게시글을 찾을 수 없습니다.                          |
|       409 | 게시글 상태가 변경되었습니다. 새로고침하세요.       |
|       422 | 커뮤니티 정책에 맞지 않는 내용이 포함되어 있습니다. |
|       429 | 요청이 많습니다. 잠시 후 다시 시도하세요.           |
|      500+ | 일시적인 오류입니다. 다시 시도하세요.               |

## 16. 테스트 기준

### 단위 테스트

- 금액, 계좌, 이메일, 전화번호 redaction
- 모더레이션 프리뷰 상태 전환
- 게시글 정렬과 필터
- 댓글 작성 request payload
- 광고·제휴 guard flag
- deep link route normalization

### 통합 테스트

- 피드 조회 후 상세 진입
- 글쓰기 preview 후 publish
- LV UP 인증글 작성
- 댓글 작성 후 목록 갱신
- 신고 후 상태 표시
- 첨부파일 `PENDING`에서 `CLEAN` 상태 반영

### E2E 테스트

- 로그인 사용자만 글쓰기 가능
- 익명 표시명만 노출
- 원시 금액 입력 시 차단 또는 경고
- 개인정보 입력 시 차단 또는 경고
- 신고된 글은 운영 정책에 따라 숨김 처리
- 오프라인 상태에서 읽기 fallback 표시

## 17. 완료 체크리스트

- [x] 커뮤니티 피드 요구사항 정의
- [x] 게시글 상세 요구사항 정의
- [x] 글쓰기·수정·임시저장 요구사항 정의
- [x] 댓글·좋아요·북마크·신고 요구사항 정의
- [x] 익명 표시와 내부 식별자 분리 기준 정의
- [x] 서버 권위 API 경계 정의
- [x] raw 금융 데이터 노출 금지 기준 정의
- [x] raw 개인정보 노출 금지 기준 정의
- [x] 광고 금융 타겟팅 금지 기준 정의
- [x] 첨부파일 안전 스캔 기준 정의
- [x] 모더레이션 상태 기준 정의
- [x] 접근성·반응형 UX 기준 정의
- [x] 에러 redaction 기준 정의
- [x] 로그·분석 비식별 기준 정의
- [x] 테스트와 E2E 완료 기준 정의

## 18. 운영 판정

이 README는 `apps/mobile/src/features/community` 모듈이 문서상·이론상 충족해야 할 요구사항을 완결된 기준으로 정리한다. 실제 운영 완성도는 이 문서의 기준을 구현한 코드가 모바일 전체 typecheck, API 통합 테스트, Expo 빌드, 커뮤니티 E2E, 모더레이션 QA, 개인정보·광고 정책 점검을 모두 통과했을 때 확정한다.
