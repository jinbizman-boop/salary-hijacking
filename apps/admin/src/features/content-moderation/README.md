# 급여납치 관리자 콘솔 · Content Moderation Feature README

> 최종 파일 위치: `apps/admin/src/features/content-moderation/README.md`  
> 문서 버전: `3.1.0`  
> 적용 범위: 관리자 콘솔의 커뮤니티 게시글·댓글·신고·사용자 제재·운영 리포트·감사 로그·비식별 export 기능  
> 상태: 문서상·이론상 최종본

---

## 1. 목적

`content-moderation` 기능은 급여납치 플랫폼의 커뮤니티와 사용자 생성 콘텐츠를 안전하게 운영하기 위한 관리자 전용 기능 영역이다. 이 기능은 사용자가 작성한 게시글, 댓글, 신고, 작성자 제재, 복원, 숨김, 삭제, 잠금, 상신, 비식별 export를 관리자 RBAC와 감사 로그 경계 안에서 처리한다.

급여납치 플랫폼은 급여·예산·지출·저축·알림·레벨업·커뮤니티·광고·제휴·운영 데이터를 다루기 때문에 커뮤니티 모더레이션에서도 금융 원문, 개인정보, 광고 타겟팅 정보가 노출되지 않아야 한다. 따라서 이 기능의 최우선 원칙은 익명성 보호, hash-only 식별, raw 금융 데이터 차단, raw 개인정보 차단, 광고 금융 타겟팅 금지, 관리자 사유 기록, 감사 로그 보존이다.

---

## 2. 핵심 원칙

1. 사용자 화면은 익명 표시를 유지한다.
2. 관리자 화면에서도 내부 식별자는 `authorHash`, `reporterHash`, `actorHash`처럼 hash-only로 표시한다.
3. 이메일, 전화번호, 계좌번호, 카드번호, 급여액, 지출액, 저축액, 납치금액, 알림 push token 원문은 노출하지 않는다.
4. 게시글·댓글 본문은 `safePreview` 또는 서버에서 마스킹된 값만 표시한다.
5. 관리자 mutation은 항상 RBAC, MFA, `X-Admin-Reason`, 감사 로그를 요구한다.
6. 숨김, 복원, 잠금, 삭제, 제재, 상신, export는 모두 감사 가능한 이벤트로 기록한다.
7. 광고·제휴 판단은 콘텐츠 맥락 기반으로만 수행하며 급여·지출·저축·납치금액 기반 타겟팅은 금지한다.
8. 운영 export는 비식별·마스킹된 데이터만 허용한다.
9. 모더레이션 정책은 사용자 보호, 플랫폼 안전, 금융정보 보호를 기준으로 적용한다.
10. 서버 권위 아키텍처를 유지하며 프론트엔드는 표시·요청·검증 보조 역할만 수행한다.

---

## 3. 담당 도메인

`content-moderation`은 다음 도메인을 포함한다.

| 도메인           | 설명                       | 관리자 조치                                 |
| ---------------- | -------------------------- | ------------------------------------------- |
| CommunityPost    | 커뮤니티 게시글            | 승인, 숨김, 복원, 잠금, 삭제, 고정, 상신    |
| CommunityComment | 댓글·대댓글                | 승인, 숨김, 복원, 삭제, 상신                |
| Report           | 사용자 신고                | 분류, 검토, 처리, 반려, 상신                |
| UserSafety       | 작성자/신고자 안전         | 제재, 경고, 일시 정지, 복구 요청            |
| AuditLog         | 관리자 조치 기록           | 조치 사유, 전후 상태, 관리자 ID, request ID |
| RedactedExport   | 비식별 export              | 필터 기반 안전 export 요청                  |
| AdsSafety        | 광고·제휴 관련 콘텐츠 검토 | 금융 원문 타겟팅 차단, 광고 표기 검토       |
| IncidentSignal   | 보안·운영 이상 신호        | 고위험 콘텐츠 상신, incident 연결           |

---

## 4. 관리자 화면 연계

이 feature README는 다음 관리자 페이지와 직접 연결된다.

| 화면             | 파일                                  | 역할                                           |
| ---------------- | ------------------------------------- | ---------------------------------------------- |
| 게시글 운영      | `apps/admin/src/app/posts/page.tsx`   | 게시글 목록, 필터, 상세, 모더레이션 액션       |
| 신고·리포트 운영 | `apps/admin/src/app/reports/page.tsx` | 신고, CS, 보안, 광고 리포트 처리               |
| 사용자 운영      | `apps/admin/src/app/users/page.tsx`   | 작성자 제재, 계정 상태 변경, 토큰 폐기         |
| 이벤트 로그      | `apps/admin/src/app/events/page.tsx`  | 감사 이벤트와 운영 이벤트 추적                 |
| 지표             | `apps/admin/src/app/metrics/page.tsx` | 신고량, 처리량, 위험도, SLA, privacy pass rate |
| 공지             | `apps/admin/src/app/notices/page.tsx` | 커뮤니티 정책·제재 기준 공지                   |

---

## 5. 서버 API 경계

관리자 모더레이션 기능은 다음 API 경계를 사용한다.

```text
GET    /admin/api/v1/posts
POST   /admin/api/v1/posts/:postId/approve
POST   /admin/api/v1/posts/:postId/hide
POST   /admin/api/v1/posts/:postId/restore
POST   /admin/api/v1/posts/:postId/lock
POST   /admin/api/v1/posts/:postId/unlock
POST   /admin/api/v1/posts/:postId/pin
POST   /admin/api/v1/posts/:postId/unpin
POST   /admin/api/v1/posts/:postId/delete
POST   /admin/api/v1/posts/:postId/escalate
POST   /admin/api/v1/posts/:postId/sanction_author
POST   /admin/api/v1/posts/exports/redacted

GET    /admin/api/v1/reports
POST   /admin/api/v1/reports/:reportId/triage
POST   /admin/api/v1/reports/:reportId/assign
POST   /admin/api/v1/reports/:reportId/resolve
POST   /admin/api/v1/reports/:reportId/reject
POST   /admin/api/v1/reports/:reportId/hide_target
POST   /admin/api/v1/reports/:reportId/restore_target
POST   /admin/api/v1/reports/:reportId/sanction_actor
POST   /admin/api/v1/reports/:reportId/escalate
POST   /admin/api/v1/reports/:reportId/archive
POST   /admin/api/v1/reports/:reportId/export_redacted
POST   /admin/api/v1/reports/exports/redacted
```

모든 mutation 요청은 다음 헤더를 포함해야 한다.

```text
X-Admin-Reason: <관리자 조치 사유>
X-Raw-Financial-Data-Exposed: false
X-Raw-Personal-Data-Exposed: false
X-Raw-Push-Token-Logged: false
X-Ad-Financial-Targeting-Used: false
```

서버는 위 헤더를 신뢰하지 않고 자체 정책 엔진에서 다시 검증해야 한다.

---

## 6. 데이터 계약

### 6.1 Post Safe View

```ts
export type AdminModerationPost = {
  readonly id: string;
  readonly board: "FREE" | "PAYROLL" | "BUDGET" | "SAVINGS" | "GROWTH" | "NOTICE" | "REPORT";
  readonly status: "PENDING" | "VISIBLE" | "HIDDEN" | "REPORTED" | "DELETED" | "LOCKED";
  readonly severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  readonly title: string;
  readonly safePreview: string;
  readonly anonymousAuthorLabel: string;
  readonly authorHash: string;
  readonly reportCount: number;
  readonly likeCount: number;
  readonly commentCount: number;
  readonly riskScore: number;
  readonly pinned: boolean;
  readonly locked: boolean;
  readonly moderatorMemo: string | null;
  readonly lastReportReason: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly reviewedAt: string | null;
  readonly reviewedBy: string | null;
  readonly rawFinancialDataExposed: false;
  readonly rawPersonalDataExposed: false;
  readonly adsFinancialTargetingUsed: false;
  readonly auditReasonRequired: true;
};
```

### 6.2 Report Safe View

```ts
export type AdminModerationReport = {
  readonly id: string;
  readonly type: "COMMUNITY_POST" | "COMMUNITY_COMMENT" | "USER_PROFILE" | "AD_CAMPAIGN" | "NOTICE" | "PAYROLL_DATA" | "BUDGET_DATA" | "SECURITY" | "CS_TICKET";
  readonly status: "OPEN" | "TRIAGED" | "IN_REVIEW" | "ACTION_REQUIRED" | "RESOLVED" | "REJECTED" | "ARCHIVED";
  readonly severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  readonly title: string;
  readonly safeSummary: string;
  readonly targetId: string;
  readonly targetLabel: string;
  readonly targetSafePreview: string;
  readonly reporterHash: string;
  readonly reportedActorHash: string | null;
  readonly reportCount: number;
  readonly riskScore: number;
  readonly slaDueAt: string;
  readonly moderatorMemo: string | null;
  readonly lastActionReason: string | null;
  readonly rawFinancialDataExposed: false;
  readonly rawPersonalDataExposed: false;
  readonly rawPushTokenLogged: false;
  readonly adsFinancialTargetingUsed: false;
  readonly auditReasonRequired: true;
};
```

---

## 7. 모더레이션 액션 정책

| 액션            | 대상        | 요구 권한 | 필수 사유 | 감사 로그 | 설명                                     |
| --------------- | ----------- | --------: | --------: | --------: | ---------------------------------------- |
| APPROVE         | 게시글/댓글 | OPERATOR+ |        예 |        예 | 검토 대기 콘텐츠를 공개 가능 상태로 전환 |
| HIDE            | 게시글/댓글 | OPERATOR+ |        예 |        예 | 사용자 화면에서 숨김 처리                |
| RESTORE         | 게시글/댓글 | OPERATOR+ |        예 |        예 | 숨김 콘텐츠 복구                         |
| LOCK            | 게시글      | OPERATOR+ |        예 |        예 | 댓글·반응 추가 차단                      |
| UNLOCK          | 게시글      | OPERATOR+ |        예 |        예 | 잠금 해제                                |
| PIN             | 게시글      |    ADMIN+ |        예 |        예 | 커뮤니티 상단 고정                       |
| UNPIN           | 게시글      |    ADMIN+ |        예 |        예 | 상단 고정 해제                           |
| DELETE          | 게시글/댓글 |    ADMIN+ |        예 |        예 | 정책 위반 콘텐츠 삭제 또는 soft delete   |
| ESCALATE        | 신고/콘텐츠 | OPERATOR+ |        예 |        예 | 보안·법무·운영 상위 검토로 상신          |
| SANCTION_AUTHOR | 작성자      |    ADMIN+ |        예 |        예 | 작성자 경고·정지·제재 요청               |
| EXPORT_REDACTED | 목록/리포트 |    ADMIN+ |        예 |        예 | 비식별 export 생성 요청                  |

---

## 8. 위험도 산정 기준

위험도는 서버에서 계산하며 프론트엔드는 표시만 한다.

```text
riskScore = min(1000,
  reportWeight
  + contentPolicyWeight
  + repeatedViolationWeight
  + financialLeakWeight
  + personalDataLeakWeight
  + adPolicyWeight
  + securitySignalWeight
)
```

기준 예시:

| 신호             | 설명                                              | 정책                |
| ---------------- | ------------------------------------------------- | ------------------- |
| 금융 원문 노출   | 급여액, 계좌, 카드, 지출액, 저축액, 납치금액 원문 | 즉시 숨김·상신      |
| 개인정보 노출    | 전화, 이메일, 주민등록번호, 주소, 계좌 등         | 즉시 숨김·상신      |
| 위험 금융 조언   | 대출 유도, 사기성 투자, 무리한 금융행위 유도      | 숨김·정책 검토      |
| 광고·제휴 미표기 | 광고성 게시물인데 표기 없음                       | 숨김·광고 정책 검토 |
| 괴롭힘·혐오      | 개인 공격, 혐오, 폭력, 협박                       | 숨김·제재 검토      |
| 스팸             | 반복 홍보, 자동화 글                              | 숨김·계정 제재 검토 |
| 보안 위협        | 계정 탈취, 악성 링크, 피싱                        | 즉시 숨김·보안 상신 |

---

## 9. 개인정보·금융정보 보호

### 9.1 금지 데이터

다음 값은 관리자 모더레이션 화면, 로그, export에 원문으로 포함되면 안 된다.

- 이메일 원문
- 전화번호 원문
- 주민등록번호·주소 등 고유 개인정보
- 계좌번호, 카드번호
- 급여액, 소득액, 지출액, 저축액, 예산액, 납치금액
- 급여명세서, 통장 사본, 카드명세서 원문
- push token, FCM token, device token
- access token, refresh token, session cookie, password, MFA secret

### 9.2 허용 데이터

- `maskedEmail`
- `maskedPhone`
- `authorHash`
- `reporterHash`
- `actorHash`
- `safePreview`
- `redactedExportId`
- 집계 카운트
- 정책상 안전한 상태값과 심각도

---

## 10. 광고·제휴 정책

Content Moderation은 광고·제휴 관련 게시물도 검토한다. 단, 광고 판단은 문맥·신고·게시판·표기 여부 기반으로만 수행한다.

금지:

```text
salaryAmount 기반 광고 타겟팅
expenseAmount 기반 광고 타겟팅
savingsAmount 기반 광고 타겟팅
hijackAmount 기반 광고 타겟팅
loanAmount 기반 광고 타겟팅
raw financial payload export
advertiser에게 userId, authorHash, 금융 원문 전달
```

허용:

```text
광고/제휴 표기 누락 감지
스팸성 광고 콘텐츠 숨김
광고 정책 위반 상신
비식별 집계 기반 운영 지표
contextual board 기준 정책 검토
```

---

## 11. 감사 로그

모든 관리자 조치는 다음 필드를 감사 로그에 남긴다.

```ts
export type ContentModerationAuditEvent = {
  readonly action: string;
  readonly adminIdHash: string;
  readonly targetType: "POST" | "COMMENT" | "REPORT" | "USER" | "EXPORT";
  readonly targetId: string;
  readonly reason: string;
  readonly beforeStatus: string | null;
  readonly afterStatus: string | null;
  readonly requestId: string;
  readonly ipHash: string;
  readonly userAgentHash: string;
  readonly createdAt: string;
  readonly rawFinancialDataLogged: false;
  readonly rawPersonalDataLogged: false;
  readonly rawPushTokenLogged: false;
  readonly adsFinancialTargetingUsed: false;
};
```

감사 로그에는 관리자 식별자, IP, user-agent를 원문으로 남기지 않고 hash로 저장한다.

---

## 12. 운영 지표

Content Moderation은 다음 운영 지표를 제공한다.

| 지표                    | 의미                          |
| ----------------------- | ----------------------------- |
| pendingPostCount        | 검토 대기 게시글 수           |
| reportedPostCount       | 신고된 게시글 수              |
| hiddenContentCount      | 숨김 처리된 콘텐츠 수         |
| restoredContentCount    | 복원된 콘텐츠 수              |
| sanctionRequestCount    | 작성자 제재 요청 수           |
| averageTriageMinutes    | 신고 분류 평균 시간           |
| slaBreachCount          | SLA 초과 리포트 수            |
| privacyPassRate         | raw 금융·개인정보 노출 차단율 |
| adsPolicyViolationCount | 광고·제휴 정책 위반 수        |
| redactedExportCount     | 비식별 export 요청 수         |

---

## 13. 폴더 구조 권장안

```text
apps/admin/src/features/content-moderation/
├─ README.md
├─ api/
│  ├─ posts.client.ts
│  ├─ reports.client.ts
│  └─ moderation-actions.client.ts
├─ components/
│  ├─ ModerationTable.tsx
│  ├─ ModerationDetailPanel.tsx
│  ├─ ModerationActionBar.tsx
│  ├─ ReportSlaBadge.tsx
│  └─ PrivacyGuardPanel.tsx
├─ constants/
│  ├─ moderation-actions.ts
│  ├─ moderation-filters.ts
│  └─ moderation-policy.ts
├─ types/
│  ├─ post.types.ts
│  ├─ report.types.ts
│  └─ audit.types.ts
├─ utils/
│  ├─ redaction.ts
│  ├─ risk-score.ts
│  ├─ policy-labels.ts
│  └─ admin-reason.ts
└─ tests/
   ├─ content-moderation.contract.test.ts
   ├─ content-moderation.privacy.test.ts
   └─ content-moderation.e2e.spec.ts
```

현재 관리자 페이지 파일들이 자체 완결형으로 구현되어 있어도, 상용화 단계에서는 위 구조로 분리할 수 있다. 분리하더라도 서버 권위, `X-Admin-Reason`, redaction, hash-only, 광고 금융 타겟팅 금지 원칙은 유지해야 한다.

---

## 14. QA 체크리스트

### 14.1 정적 검증

- [ ] `strict` TypeScript 통과
- [ ] `noImplicitAny` 위반 없음
- [ ] React import/JSX 의존성 정책 확인
- [ ] API endpoint 문자열이 `/admin/api/v1/*` 경계 준수
- [ ] `X-Admin-Reason` 없는 mutation 차단
- [ ] raw 금융 데이터 필드가 UI에 표시되지 않음
- [ ] raw 개인정보 필드가 UI에 표시되지 않음
- [ ] raw push token이 UI/로그/export에 포함되지 않음
- [ ] 광고 금융 타겟팅 값이 요청 body/header에 포함되지 않음
- [ ] `assert...Completeness()` 또는 동등한 완성도 marker 존재

### 14.2 기능 검증

- [ ] 게시글 목록 조회
- [ ] 게시글 검색·필터·정렬
- [ ] 신고 목록 조회
- [ ] 신고 검색·필터·정렬
- [ ] 게시글 승인
- [ ] 게시글 숨김
- [ ] 게시글 복원
- [ ] 게시글 잠금/해제
- [ ] 게시글 고정/해제
- [ ] 게시글 삭제
- [ ] 신고 분류
- [ ] 신고 해결/반려
- [ ] 작성자 제재 요청
- [ ] 비식별 export 요청
- [ ] 모더레이션 메모 저장
- [ ] 감사 로그 조회 연계

### 14.3 보안 검증

- [ ] OPERATOR/ADMIN/SUPER_ADMIN 권한별 조치 범위 확인
- [ ] MFA 미검증 관리자의 mutation 차단
- [ ] CSRF/세션 만료 시 요청 차단
- [ ] rate-limit 적용
- [ ] 관리자 사유가 공백인 조치 차단
- [ ] audit sink 장애 시 fallback 로그 정책 확인
- [ ] export 생성 시 개인정보·금융정보 redaction 확인

### 14.4 E2E 검증

- [ ] 신고 접수 → 모더레이션 큐 반영
- [ ] 신고 처리 → 대상 숨김 → 감사 로그 생성
- [ ] 숨김 콘텐츠 복원 → 사용자 화면 반영
- [ ] 작성자 제재 → 사용자 상태 반영
- [ ] 비식별 export → 원문 미포함 검증
- [ ] 광고성 게시글 신고 → 광고 정책 큐 연결
- [ ] 고위험 콘텐츠 → incident/escalation 연결

---

## 15. 장애 대응

| 상황           | 대응                                              |
| -------------- | ------------------------------------------------- |
| API 장애       | 목록 캐시 표시 또는 오류 toast, mutation 비활성화 |
| 감사 로그 장애 | mutation 차단 또는 durable fallback 큐 적재       |
| redaction 실패 | 화면 표시·export 즉시 차단                        |
| 권한 검증 실패 | 403 처리, 관리자 재로그인 유도                    |
| MFA 만료       | `/admin/login`으로 이동                           |
| export 실패    | 재시도 큐 또는 운영 알림 생성                     |
| SLA 초과       | Reports/Events/Incidents로 상신                   |

---

## 16. 출시 기준

이 feature는 다음 조건을 만족할 때 출시 가능하다.

1. 관리자 인증, RBAC, MFA가 실제 서버에서 적용된다.
2. 모든 mutation에 `X-Admin-Reason`이 강제된다.
3. 감사 로그가 누락 없이 저장된다.
4. 게시글·댓글·신고 조치 endpoint가 운영 DB와 연결된다.
5. 비식별 export가 raw 금융·개인정보·push token을 포함하지 않는다.
6. 광고 금융 타겟팅 금지 정책이 서버에서 강제된다.
7. 관리자 UI가 모바일·태블릿·데스크톱에서 사용 가능하다.
8. E2E 테스트가 신고 접수부터 조치, 감사 로그, 사용자 화면 반영까지 통과한다.
9. 개인정보·금융정보 redaction 테스트가 통과한다.
10. staging과 production 배포 검증이 통과한다.

---

## 17. 완료 판정

이 README는 `apps/admin/src/features/content-moderation/README.md`의 문서상·이론상 최종본으로, 급여납치 관리자 콘솔의 콘텐츠 모더레이션 기능에 필요한 목적, 원칙, 도메인, API 경계, 데이터 계약, 액션 정책, 개인정보·금융정보 보호, 광고·제휴 정책, 감사 로그, 운영 지표, 폴더 구조, QA, 장애 대응, 출시 기준을 포함한다.

파일 단위 문서 완성도 기준으로는 더 이상 보강이 필요 없는 최종본이다. 실제 프로젝트 종합 운영 완성도는 이 문서 기준을 코드, API, DB, 감사 로그, 배포 환경, E2E/QA에서 모두 충족할 때 확정된다.
