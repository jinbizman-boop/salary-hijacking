---
프로젝트: 급여납치(Salary Hijacking) 모바일 플랫폼
문서등급: 최종본
적용범위: API·백엔드 문서
기준일: 2026-06-15
상태: 문서상·이론상 최종 완료본
작성기준: 기존 최상위 기획문서, 사용자·시장·전략문서, UX/UI 기획문서, 기능 기획문서, 데이터·DB 문서, 급여납치 화면 및 기능 설계 기획안.html
배포환경: 모바일 애플리케이션 / GitHub / Cloudflare / Neon DB(PostgreSQL)
공통원칙: 본 문서는 추가 기획 없이 백엔드 구현·검수·운영 기준으로 사용할 수 있도록 API 계약, 보안, 예외, 권한, 데이터 연결 기준을 완결한다.
---

# 05. 푸시 알림 API 명세서 최종본

## 1. 문서 목적

본 문서는 급여납치 앱의 예산 초과, 결제 예정, 목표 달성, 레벨업 미션, 이벤트, 커뮤니티 반응, 공지 알림을 생성·저장·읽음 처리·푸시 발송하는 API와 백엔드 정책을 최종 확정한다.

## 2. 알림 채널

| 채널            | 설명                                       | 필수 여부 |
| --------------- | ------------------------------------------ | --------: |
| 앱 내 알림 목록 | 모든 알림은 DB에 저장되어 알림 화면에 표시 |      필수 |
| 모바일 푸시     | 사용자가 권한을 허용한 경우 FCM으로 발송   |      선택 |
| 관리자 공지     | 공지성 알림, 운영자 생성                   |      선택 |

## 3. 알림 유형

| Type                 | 설명               | 연결 화면         |           기본 수신 |
| -------------------- | ------------------ | ----------------- | ------------------: |
| BUDGET_OVER          | 일일 예산 초과     | 급여 홈/일일 예산 |                  ON |
| BUDGET_REMAINING_LOW | 남은 예산 부족     | 급여 홈           |                  ON |
| FIXED_PAYMENT_DUE    | 고정지출 결제 예정 | 계획/고정지출     |                  ON |
| SAVINGS_TRANSFER_DUE | 고정저축 이체 예정 | 계획/고정저축     |                  ON |
| HIJACK_GOAL_ACHIEVED | 목표 달성          | 마이페이지/성과   |                  ON |
| GROWTH_MISSION       | 오늘의 레벨업 미션 | LV UP             |                  ON |
| GROWTH_LEVEL_UP      | 레벨 상승          | 마이페이지/LV UP  |                  ON |
| COMMUNITY_COMMENT    | 내 글 댓글         | 게시글 상세       |                  ON |
| COMMUNITY_LIKE       | 내 글 좋아요       | 게시글 상세       |                  ON |
| EVENT_REWARD         | 이벤트 보상        | 이벤트/알림       |                  ON |
| NOTICE               | 공지사항           | 공지 상세         |                  ON |
| AD_PROMOTION         | 광고/제휴 혜택     | 랜딩              | marketingOptIn 기준 |

## 4. 기기 토큰 API

### 4.1 푸시 토큰 등록

`POST /api/v1/devices/push-tokens`

```json
{
  "deviceId": "device_ios_001",
  "platform": "IOS",
  "fcmToken": "fcm_registration_token",
  "appVersion": "1.0.0",
  "osVersion": "iOS 18.5",
  "pushPermissionStatus": "AUTHORIZED"
}
```

Response

```json
{
  "success": true,
  "data": {
    "deviceTokenId": "uuid-device-token",
    "status": "ACTIVE"
  }
}
```

### 4.2 푸시 토큰 비활성화

`DELETE /api/v1/devices/push-tokens/{deviceTokenId}`

## 5. 알림 조회 API

| Method | Endpoint                               | 설명                |
| ------ | -------------------------------------- | ------------------- |
| GET    | `/notifications?page=1&size=20`        | 내 알림 전체 조회   |
| GET    | `/notifications?readStatus=UNREAD`     | 읽지 않은 알림 조회 |
| POST   | `/notifications/{notificationId}/read` | 단건 읽음 처리      |
| POST   | `/notifications/read-all`              | 전체 읽음 처리      |
| DELETE | `/notifications/{notificationId}`      | 알림 숨김 처리      |

응답 예시

```json
{
  "success": true,
  "data": [
    {
      "notificationId": "uuid",
      "type": "HIJACK_GOAL_ACHIEVED",
      "title": "누적납치 금액 신기록 달성",
      "body": "내 급여 납치 현황 5,780,000원 달성",
      "readStatus": "UNREAD",
      "deepLink": "salaryhijacking://profile/achievement",
      "createdAt": "2026-06-15T00:10:00Z"
    }
  ]
}
```

## 6. 알림 수신 설정 API

`PATCH /api/v1/users/me/settings/notifications`

```json
{
  "pushEnabled": true,
  "budgetAlertEnabled": true,
  "fixedPaymentAlertEnabled": true,
  "growthAlertEnabled": true,
  "communityAlertEnabled": true,
  "marketingOptIn": false
}
```

## 7. 내부 알림 생성 API

`POST /internal/api/v1/notifications`

인증: SYSTEM 또는 ADMIN 서비스 토큰

```json
{
  "userId": "uuid-user",
  "type": "FIXED_PAYMENT_DUE",
  "title": "오늘 예정된 고정지출이 있어요",
  "body": "ChatGPT 자동결제 30,000원이 오늘 예정되어 있습니다.",
  "deepLink": "salaryhijacking://plan/fixed-expenses",
  "scheduledAt": "2026-06-15T00:00:00Z",
  "pushRequired": true,
  "dedupeKey": "fixed_due:uuid-user:uuid-expense:2026-06-15"
}
```

## 8. FCM 발송 정책

| 항목           | 기준                                                                          |
| -------------- | ----------------------------------------------------------------------------- |
| 연동 방식      | FCM HTTP v1 API                                                               |
| 인증           | Firebase service account 기반 OAuth2 access token                             |
| 대상           | device token, 필요 시 topic 또는 condition                                    |
| 실패 처리      | invalid token은 즉시 비활성화, 일시 실패는 exponential backoff 재시도         |
| 야간 방해금지  | 22:00~08:00 광고/콘텐츠성 푸시는 지연 발송, 예산/결제/보안성 알림은 발송 가능 |
| 중복 방지      | `dedupe_key` unique 제약 적용                                                 |
| 푸시 권한 거부 | 앱 내 알림만 저장하고 FCM 발송 생략                                           |

FCM 메시지 payload 예시

```json
{
  "message": {
    "token": "fcm_registration_token",
    "notification": {
      "title": "오늘의 예산을 초과했어요",
      "body": "오늘 설정금액보다 3,000원을 더 사용했습니다."
    },
    "data": {
      "notificationId": "uuid",
      "type": "BUDGET_OVER",
      "deepLink": "salaryhijacking://home/budget"
    }
  }
}
```

## 9. 발송 상태값

| 상태       | 의미                                |
| ---------- | ----------------------------------- |
| CREATED    | 알림 생성됨                         |
| SCHEDULED  | 예약 발송 대기                      |
| SENT       | FCM 발송 요청 성공                  |
| DELIVERED  | 클라이언트 수신 확인 가능 시 수신됨 |
| READ       | 사용자가 읽음 처리                  |
| FAILED     | 발송 실패                           |
| SUPPRESSED | 설정/중복/방해금지로 발송 생략      |
| DELETED    | 사용자 숨김 또는 삭제               |

## 10. 오류 코드

| 코드                        | HTTP | 상황                           |
| --------------------------- | ---: | ------------------------------ |
| NOTIFICATION_NOT_FOUND      |  404 | 알림 없음                      |
| NOTIFICATION_OWNER_MISMATCH |  403 | 본인 알림 아님                 |
| NOTIFICATION_PUSH_DISABLED  |  200 | 푸시 비활성, 앱 내 알림만 생성 |
| NOTIFICATION_DUPLICATED     |  409 | dedupeKey 중복                 |
| NOTIFICATION_FCM_FAILED     |  503 | FCM 일시 장애                  |
| DEVICE_TOKEN_INVALID        |  422 | 유효하지 않은 기기 토큰        |

## 11. 완료 판정

본 문서는 알림 생성, 읽음 처리, 푸시 발송, 수신 설정, FCM 연동, 중복 방지, 실패 처리 기준을 모두 포함하므로 푸시 알림 API의 최종본으로 확정한다.
