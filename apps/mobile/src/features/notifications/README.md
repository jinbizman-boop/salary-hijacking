# 급여납치 모바일 Notifications Feature

> 경로: `apps/mobile/src/features/notifications/README.md`  
> 상태: 문서상·이론상 최종본  
> 기준: 급여납치 Paycheck Accounting 개발 문서, 화면 및 기능 설계 기획안, salary-hijacking-platform 요구사항, 모바일 알림함 구현 파일, 알림 서비스/스케줄러/푸시 정책, 광고·제휴 개인정보 보호 정책

## 1. 모듈 목적

`features/notifications`는 급여납치 모바일 앱에서 급여일, 고정지출, 고정저축, 일일 예산, 변동지출, LV UP, 커뮤니티, 운영 공지, 광고·제휴 알림을 안전하게 표시하고 관리하는 알림 도메인 모듈이다.

이 모듈의 핵심 목적은 단순 알림 목록 표시가 아니라 다음 네 가지를 동시에 만족하는 것이다.

1. 사용자가 오늘 해야 할 급여·예산·저축·지출·성장 행동을 놓치지 않게 한다.
2. 알림 본문에 원시 급여액, 지출액, 저축액, 계좌, 카드, 푸시 토큰, 이메일, 전화번호 등 민감 정보를 노출하지 않는다.
3. 서버 권위 계산 결과와 운영 정책을 기준으로 읽음, 전체 읽음, 보관, 삭제, 딥링크 액션, 푸시 수신 설정을 처리한다.
4. 광고·제휴 알림은 명확히 구분하고 금융 금액 기반 타겟팅을 금지한다.

## 2. 제품 내 위치

모바일 앱 기준 알림 기능은 다음 화면과 연결된다.

| 영역          | 연결 경로                                    | 역할                                              |
| ------------- | -------------------------------------------- | ------------------------------------------------- |
| 알림함        | `apps/mobile/app/notifications/index.tsx`    | 전체 알림 목록, 필터, 읽음/보관/삭제, 딥링크 액션 |
| 급여 홈       | `apps/mobile/app/(tabs)/salary/index.tsx`    | 급여일, 오늘 예산, 초과 경고, 월 마감 알림 진입   |
| 계획          | `apps/mobile/app/(tabs)/plan/index.tsx`      | 급여 계획, 고정지출, 고정저축 관련 알림 진입      |
| LV UP         | `apps/mobile/app/(tabs)/level/index.tsx`     | 독서·뉴스·영어·건강 미션 알림 진입                |
| 커뮤니티      | `apps/mobile/app/(tabs)/community/index.tsx` | 댓글, 좋아요, 신고, 운영 제재 알림 진입           |
| 마이페이지    | `apps/mobile/app/(tabs)/profile/index.tsx`   | 푸시 수신 설정, 보안/개인정보 설정 진입           |
| 루트 레이아웃 | `apps/mobile/app/_layout.tsx`                | 푸시 동의 요약, strict privacy guard, 세션 게이트 |

## 3. 핵심 사용자 시나리오

### 3.1 급여일 알림

사용자가 설정한 급여일 또는 서버 계산 급여 이벤트가 도래하면 `PAYDAY` 알림을 표시한다. 알림 본문은 “급여 계획 확인”, “고정지출·고정저축 먼저 분리”처럼 행동 중심으로 표현하며 실제 급여 금액은 표시하지 않는다.

### 3.2 고정지출 알림

월세, 통신비, 구독료, 보험료 등 고정지출 예정일이 가까워지면 `FIXED_EXPENSE` 알림을 표시한다. 액수는 서버 계산 화면에서만 확인하며, 알림에는 마스킹 또는 범주형 문구만 표시한다.

### 3.3 일일 예산 경고

사용자의 오늘 변동지출 합계가 일일 예산 한도에 근접하거나 초과하면 `DAILY_BUDGET` 또는 `VARIABLE_EXPENSE` 알림을 표시한다. 공식 계산은 서버 권위 수식 `today_remaining_budget = max(0, daily_limit - today_variable_expense)`를 따른다.

### 3.4 저축 루틴 알림

고정저축 이체 예정, 저축 목표 달성, 이번 달 예상 납치액 변화는 `SAVINGS` 알림으로 표시한다. 원시 금액은 표시하지 않고 “저축 루틴 확인”, “목표 진행률 확인” 중심으로 안내한다.

### 3.5 LV UP 알림

독서, 뉴스, 영어, 건강 미션 완료 또는 연속 실천일 갱신이 발생하면 `LEVEL_UP` 알림을 표시한다. XP, streak, 미션 완료 상태는 표시 가능하지만 급여·지출 원시 데이터와 연결하지 않는다.

### 3.6 커뮤니티 알림

댓글, 좋아요, 신고 처리, 게시글 숨김/복구, 운영 제재는 `COMMUNITY` 알림으로 표시한다. 익명 표시 정책을 유지하고 내부 사용자 ID, 이메일, 전화번호, 디바이스 정보는 노출하지 않는다.

### 3.7 광고·제휴 알림

광고·제휴 알림은 `AD_PARTNER`로 분리한다. 모든 UI는 `광고` 또는 `제휴` 라벨을 노출해야 하며, 급여액·지출액·저축액·납치액을 기준으로 한 타겟팅을 금지한다.

### 3.8 시스템/운영 알림

서비스 점검, 정책 변경, 보안 안내, 개인정보 처리 안내, 필수 공지는 `SYSTEM` 알림으로 표시한다. 필수 공지는 삭제·보관을 제한할 수 있다.

## 4. 도메인 분류

| 카테고리           | 의미                       |   삭제 가능 | 원시 금액 노출 |
| ------------------ | -------------------------- | ----------: | -------------: |
| `PAYDAY`           | 급여일, 급여 계획 확인     |        가능 |           금지 |
| `FIXED_EXPENSE`    | 고정지출 예정/실패/확인    |        가능 |           금지 |
| `DAILY_BUDGET`     | 일일 예산 남은금액/초과    |        가능 |           금지 |
| `SAVINGS`          | 고정저축, 목표 저축        |        가능 |           금지 |
| `VARIABLE_EXPENSE` | 변동지출 기록/초과         |        가능 |           금지 |
| `LEVEL_UP`         | 성장 미션, XP, streak      |        가능 |           금지 |
| `COMMUNITY`        | 댓글, 신고, 제재, 운영처리 |        가능 |           금지 |
| `AD_PARTNER`       | 광고·제휴 안내             |        가능 |           금지 |
| `SYSTEM`           | 보안, 점검, 정책, 필수공지 | 정책별 제한 |           금지 |

## 5. 상태 모델

알림 상태는 다음 세 가지로 제한한다.

| 상태       | 설명                                         |
| ---------- | -------------------------------------------- |
| `UNREAD`   | 아직 사용자가 읽지 않은 알림                 |
| `READ`     | 읽음 처리된 알림                             |
| `ARCHIVED` | 보관 처리되어 기본 목록에서 숨김 처리된 알림 |

삭제는 클라이언트 임의 삭제가 아니라 서버 API를 통해 처리한다. 서버는 보존 정책, 감사 로그, 필수 공지 여부를 기준으로 실제 삭제, 사용자 숨김, 보관 처리 중 하나를 결정한다.

## 6. 서버 권위 원칙

Notifications 모듈은 표시·필터·임시 optimistic UI를 수행할 수 있지만 다음 판단은 반드시 서버가 수행한다.

1. 알림 생성 여부
2. 급여일, 지출 예정일, 저축 예정일 계산
3. 오늘 예산 남은금액 및 초과 상태
4. 월 마감 납치액 계산
5. 알림 수신 권한
6. 필수 공지 보호 여부
7. 알림 삭제/보관 가능 여부
8. 푸시 토큰 유효성
9. quiet hours 적용 여부
10. 광고·제휴 알림 발송 가능 여부

클라이언트는 서버에서 받은 값을 다시 계산하지 않고 표시한다. 단, 화면 UX를 위해 unread count, 카테고리 필터, 정렬, 로컬 optimistic state는 사용할 수 있다.

## 7. 주요 API 계약

모바일 클라이언트는 API prefix `/api/v1`을 사용한다.

| Method   | Endpoint                                        | 목적                               |
| -------- | ----------------------------------------------- | ---------------------------------- |
| `GET`    | `/api/v1/notifications`                         | 알림 목록, digest, preference 조회 |
| `POST`   | `/api/v1/notifications/:notificationId/read`    | 단일 알림 읽음 처리                |
| `POST`   | `/api/v1/notifications/read-all`                | 전체 알림 읽음 처리                |
| `POST`   | `/api/v1/notifications/:notificationId/archive` | 단일 알림 보관                     |
| `POST`   | `/api/v1/notifications/:notificationId/delete`  | 단일 알림 삭제 또는 사용자 숨김    |
| `GET`    | `/api/v1/notifications/preferences`             | 수신 설정 조회                     |
| `PATCH`  | `/api/v1/notifications/preferences`             | 수신 설정 변경                     |
| `POST`   | `/api/v1/notifications/push-token`              | 푸시 토큰 등록                     |
| `DELETE` | `/api/v1/notifications/push-token`              | 푸시 토큰 해제                     |
| `POST`   | `/api/v1/notifications/test`                    | 운영/QA용 테스트 알림 발송         |

## 8. 요청 헤더 정책

모바일 알림 요청은 다음 헤더를 포함해야 한다.

```http
accept: application/json
content-type: application/json
x-client-platform: ios|android|web
x-correlation-id: <uuid-or-safe-random-id>
x-raw-financial-data-exposed: false
x-raw-personal-data-exposed: false
x-raw-push-token-exposed: false
x-ad-financial-targeting-used: false
```

`x-correlation-id`는 오류 추적과 감사 로그 상관관계를 위해 사용한다. 이메일, 전화번호, 계좌, 카드, 푸시 토큰, 급여 금액 등 원문 식별자는 correlation id에 포함하지 않는다.

## 9. 응답 모델 예시

```json
{
  "data": {
    "digest": {
      "totalCount": 12,
      "unreadCount": 3,
      "payrollCount": 2,
      "budgetCount": 4,
      "growthCount": 2,
      "communityCount": 1,
      "systemCount": 3,
      "pushConsent": "GRANTED",
      "lastSyncedAt": "2026-06-24T00:00:00.000Z",
      "privacyPassRate": "100.00%"
    },
    "notifications": [
      {
        "id": "ntf_01",
        "category": "DAILY_BUDGET",
        "severity": "WARNING",
        "status": "UNREAD",
        "title": "오늘 예산 확인",
        "body": "오늘 사용 가능한 생활 예산을 확인하세요.",
        "createdAt": "2026-06-24T00:00:00.000Z",
        "expiresAt": null,
        "deepLink": "/(tabs)/salary",
        "maskedAmountLabel": "마스킹된 예산",
        "isMandatory": false,
        "rawFinancialDataExposed": false,
        "rawPersonalDataExposed": false,
        "rawPushTokenExposed": false,
        "adsFinancialTargetingUsed": false
      }
    ]
  }
}
```

## 10. 개인정보·민감정보 보호

알림 모듈은 다음 정보를 화면, 로그, 푸시 payload, 딥링크 query, crash report에 원문으로 남기지 않는다.

- 급여액, 예상 급여액, 실수령액
- 지출액, 저축액, 납치액, 잔액
- 계좌번호, 카드번호, 결제수단 식별자
- 이메일, 전화번호, 이름, 주소
- access token, refresh token, session id
- FCM/APNs/Expo push token
- 관리자 내부 ID, 운영 감사 로그 원문

필요한 경우 서버에서 생성한 마스킹 라벨만 표시한다. 예시는 `서버 계산 금액 비공개`, `마스킹된 예산`, `확인 필요`와 같은 문구다.

## 11. 푸시 토큰 정책

푸시 토큰은 알림 발송에 필요한 기술 식별자이지만 개인정보와 동일한 수준으로 취급한다.

1. 앱 화면에 푸시 토큰 원문을 표시하지 않는다.
2. 클라이언트 로그에 푸시 토큰을 기록하지 않는다.
3. 서버 등록 시 TLS 기반 API로 전송한다.
4. 삭제·로그아웃·토큰 만료 시 서버에서 정리한다.
5. 실패한 토큰은 retry queue와 cleanup job에서 제거한다.
6. 토큰은 광고주, 제휴사, 외부 분석 도구에 전달하지 않는다.

## 12. Quiet Hours 정책

Quiet hours는 사용자가 알림을 받지 않는 시간대를 의미한다. 모바일 앱은 설정 요약을 표시할 수 있으나 적용 여부와 예외 처리 여부는 서버·스케줄러가 결정한다.

예외적으로 다음 알림은 정책에 따라 quiet hours 중에도 발송될 수 있다.

- 보안 알림
- 계정 잠금/이상 징후 알림
- 운영 필수 공지
- 법적·정책상 즉시 고지가 필요한 알림

## 13. 필수 공지 보호

`isMandatory=true` 알림은 사용자가 임의로 삭제하거나 보관할 수 없도록 UI에서 제한해야 한다. 실제 강제 여부는 서버가 판단한다.

필수 공지 후보는 다음과 같다.

- 개인정보 처리방침 변경
- 서비스 약관 변경
- 보안 사고 안내
- 장기 점검 또는 장애 안내
- 앱 강제 업데이트 안내
- 법적 고지

## 14. 광고·제휴 알림 원칙

광고·제휴 알림은 상용화 5단계 요구사항의 일부지만, 금융 민감 데이터와 분리되어야 한다.

1. 광고·제휴 알림은 `AD_PARTNER` 카테고리로 구분한다.
2. 화면에 `광고` 또는 `제휴` 라벨을 표시한다.
3. 급여액, 지출액, 저축액, 납치액 기반 타겟팅을 금지한다.
4. 광고주에게 user id, device token, 이메일, 전화번호, 금융 데이터를 제공하지 않는다.
5. 기본값은 contextual/non-personalized ads다.
6. 사용자가 수신 거부한 경우 마케팅성 알림을 발송하지 않는다.
7. 필수 운영 공지와 광고 알림을 혼동시키지 않는다.

## 15. 클라이언트 모듈 구성 권장안

이 README는 feature 경계 문서이며, 구현 파일은 다음 구조로 확장될 수 있다.

```text
apps/mobile/src/features/notifications/
├── README.md
├── api/
│   ├── notifications.client.ts
│   └── push-token.client.ts
├── components/
│   ├── NotificationCard.tsx
│   ├── NotificationDigest.tsx
│   ├── NotificationFilterTabs.tsx
│   └── NotificationPreferenceSummary.tsx
├── hooks/
│   ├── useNotifications.ts
│   ├── useNotificationPreferences.ts
│   └── usePushRegistration.ts
├── model/
│   ├── notification.types.ts
│   ├── notification.schema.ts
│   └── notification.policy.ts
└── utils/
    ├── notification-route.ts
    ├── notification-redaction.ts
    └── notification-sort.ts
```

현재 모바일 화면 단위 구현은 `apps/mobile/app/notifications/index.tsx`에서 정적 import와 JSX 없이 동작 가능한 방식으로 제공된다.

## 16. 화면 요구사항

알림함 화면은 다음 UI 요소를 갖는다.

1. 전체/안읽음/급여/예산/LV UP/커뮤니티/시스템 탭
2. 알림 digest 카드
3. unread count
4. push consent 요약
5. 마지막 동기화 시각
6. 카테고리 라벨
7. severity 라벨
8. 알림 제목/본문
9. 마스킹 금액 라벨
10. 읽음 처리 버튼
11. 전체 읽음 버튼
12. 보관 버튼
13. 삭제 버튼
14. 딥링크 액션 버튼
15. 필수 공지 보호 UI
16. 수신 설정 요약
17. privacy guard 표시
18. empty state
19. error toast
20. refresh 동기화

## 17. 정렬·필터 정책

기본 정렬은 다음 우선순위를 따른다.

1. `UNREAD` 우선
2. `CRITICAL` > `WARNING` > `SUCCESS` > `INFO`
3. 최신 `createdAt` 우선
4. 필수 공지는 정책에 따라 상단 고정 가능

탭 필터는 클라이언트에서 적용할 수 있지만, 보안·권한·보존 정책은 서버 응답 기준을 따른다.

## 18. 오류 처리 정책

모든 오류 메시지는 사용자에게 이해 가능한 한국어 문장으로 표시한다. 내부 오류, stack trace, SQL, token, device id, push token, 원문 금융 데이터는 표시하지 않는다.

| HTTP 상태 | 사용자 메시지                               |
| --------: | ------------------------------------------- |
|       401 | 로그인이 필요합니다.                        |
|       403 | 알림 접근이 제한되었습니다.                 |
|       404 | 알림을 찾을 수 없습니다.                    |
|       409 | 알림 상태가 변경되었습니다. 새로고침하세요. |
|       422 | 알림 정책 검증에 실패했습니다.              |
|       429 | 요청이 많습니다. 잠시 후 다시 시도하세요.   |
|      500+ | 서버 점검 또는 일시 장애입니다.             |

## 19. 감사 로그 정책

다음 이벤트는 서버 감사 로그 또는 운영 로그 대상이다.

- 알림 생성
- 알림 발송 성공/실패
- 푸시 토큰 등록/삭제
- 알림 읽음 처리
- 전체 읽음 처리
- 보관/삭제 요청
- 필수 공지 삭제 시도
- 마케팅 알림 수신 거부 이후 발송 차단
- 광고·제휴 알림 클릭
- 운영자가 발송한 공지

감사 로그에는 민감 원문을 저장하지 않고 user id hash, category, action, result, correlation id 중심으로 저장한다.

## 20. 테스트 체크리스트

파일 단위와 앱 단위 QA에서 다음을 확인한다.

- [ ] `/api/v1/notifications` 목록 조회 성공
- [ ] unread 탭이 정상 필터링됨
- [ ] 급여/예산/LV UP/커뮤니티/시스템 탭이 정상 필터링됨
- [ ] 읽음 처리 후 unread count 감소
- [ ] 전체 읽음 처리 후 unread count 0 처리
- [ ] 보관 처리 후 기본 목록에서 숨김
- [ ] 삭제 요청 후 서버 정책에 따라 제거 또는 숨김
- [ ] 필수 공지 삭제/보관 버튼 비활성화
- [ ] 딥링크가 허용된 내부 경로로만 이동
- [ ] 외부 URL, `//`, javascript scheme이 차단됨
- [ ] 푸시 토큰 원문이 화면에 노출되지 않음
- [ ] 급여·지출·저축·납치 원시 금액이 알림 본문에 노출되지 않음
- [ ] 광고·제휴 알림이 별도 카테고리와 라벨로 표시됨
- [ ] 광고 금융 타겟팅 플래그가 false로 유지됨
- [ ] 401/403/404/409/422/429/500 오류 메시지가 안전하게 표시됨
- [ ] correlation id가 모든 요청에 포함됨
- [ ] 오프라인/네트워크 실패 시 기존 화면이 무너지지 않음
- [ ] Expo iOS/Android 빌드에서 화면이 렌더링됨
- [ ] E2E에서 알림 읽음/보관/삭제 플로우가 통과함

## 21. 성능 기준

모바일 알림함은 다음 성능 기준을 목표로 한다.

| 항목                           |       목표 |
| ------------------------------ | ---------: |
| 초기 알림 목록 렌더링          |   1초 이내 |
| 읽음/보관/삭제 optimistic 반응 | 100ms 이내 |
| 알림 목록 API p95              | 500ms 이하 |
| push token 등록 API p95        | 700ms 이하 |
| crash-free session             | 99.5% 이상 |
| raw sensitive exposure         |        0건 |

## 22. 접근성 기준

- 모든 버튼은 `accessibilityRole="button"`을 가진다.
- 필터 탭은 선택 상태를 시각적으로 구분한다.
- 색상만으로 severity를 전달하지 않고 텍스트 라벨을 함께 표시한다.
- empty state와 error state는 명확한 문장으로 안내한다.
- 중요 알림은 제목, 카테고리, 본문 순서로 읽히도록 구성한다.

## 23. 보안 금지사항

다음 구현은 금지한다.

```ts
// 금지: 푸시 토큰 원문 로그
console.log(pushToken);

// 금지: 급여 금액을 알림 본문에 직접 삽입
body: `이번 달 급여 ${salaryAmount}원이 입금되었습니다.`;

// 금지: 광고 타겟팅에 금융 지표 사용
adTargeting.salaryRange = expectedSalary;

// 금지: 외부 딥링크 무검증 이동
router.push(untrustedUrl);
```

## 24. 서버와 클라이언트 책임 분리

| 책임                     |          클라이언트 | 서버 |
| ------------------------ | ------------------: | ---: |
| 목록 표시                |                   O |    O |
| 필터/정렬 UI             |                   O | 선택 |
| 알림 생성                |                   X |    O |
| 푸시 발송                |                   X |    O |
| 푸시 토큰 보관           |                   X |    O |
| 금액 계산                |                   X |    O |
| 읽음/보관/삭제 최종 반영 |              요청만 |    O |
| 필수 공지 보호           |             UI 보조 |    O |
| 광고 타겟팅 정책         |           표시 보조 |    O |
| 감사 로그                | correlation id 전달 |    O |

## 25. 완료 기준

이 모듈의 문서상·이론상 완료 기준은 다음과 같다.

1. 알림 도메인의 목적과 경계가 명확하다.
2. 급여·예산·지출·저축·LV UP·커뮤니티·광고·운영 알림을 모두 포괄한다.
3. 서버 권위 원칙이 명시되어 있다.
4. API 계약이 명시되어 있다.
5. 개인정보·금융정보·푸시토큰 노출 금지 원칙이 명시되어 있다.
6. 광고·제휴 알림 정책이 명시되어 있다.
7. quiet hours와 필수 공지 정책이 명시되어 있다.
8. 모바일 화면 요구사항이 명시되어 있다.
9. 오류 처리, 감사 로그, 성능, 접근성 기준이 명시되어 있다.
10. 테스트 체크리스트가 포함되어 있다.

## 26. 운영 기준 주의사항

이 README는 `features/notifications` 모듈의 문서상·이론상 최종본이다. 운영 기준 프로젝트 종합 100% 확정은 실제 저장소에서 다음 검증이 통과되어야 한다.

- `apps/mobile` 전체 TypeScript typecheck
- Expo iOS/Android 빌드
- `/api/v1/notifications` API 통합 테스트
- 푸시 토큰 등록/정리 테스트
- quiet hours 스케줄러 테스트
- 알림 읽음/보관/삭제 E2E
- 필수 공지 보호 QA
- 광고·제휴 알림 개인정보 보호 QA
- 민감정보 노출 자동 스캔
- 운영 배포 환경 smoke test
