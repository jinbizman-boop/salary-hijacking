# 급여납치 Mobile Shared API

## 목적

`apps/mobile/src/shared/api`는 급여납치 모바일 앱의 모든 화면과 기능 모듈이 서버 권위 API를 일관되게 호출하기 위한 공통 계층이다. 이 계층은 급여, 예산, 지출, 저축, 알림, LV UP, 커뮤니티, 프로필, 운영/광고/제휴 기능에서 중복된 네트워크 처리, 인증 헤더, 에러 표준화, 개인정보 보호, 재시도, 오프라인 대응을 제거한다.

이 모듈은 화면별 임의 계산이나 클라이언트 단독 확정을 금지하고, `/api/v1` 서버 응답을 최종 상태로 사용한다. 모바일 클라이언트는 입력 수집, 표시, 사용자 의사 확인, 낙관적 UI의 임시 표현만 담당한다.

## 적용 범위

- 인증 세션 확인, 로그인, 회원가입, 이메일 인증, 토큰 갱신, 로그아웃
- 급여 홈, 급여 계획, 일일 예산, 고정지출, 고정저축, 변동지출
- 알림 목록, 읽음 처리, 푸시 수신 설정, quiet hours
- LV UP 독서, 뉴스, 영어, 건강 미션과 경험치
- 커뮤니티 글 목록, 상세, 작성, 댓글, 신고, 좋아요, 북마크
- 프로필, 누적 성과, 내 게시글, 문의, 데이터 내보내기, 탈퇴
- 광고/제휴 노출 정책 검증과 비식별 컨텍스트 요청
- 운영 추적용 correlation id, audit reason 전달, 장애 대응

## 핵심 원칙

1. 모든 금액 계산은 서버 권위로 확정한다.
2. KRW 금액은 정수만 허용하며 음수와 소수는 API 요청 단계에서 차단한다.
3. 원시 급여, 지출, 저축, 납치금액, 계좌, 카드, 이메일, 전화번호, 푸시 토큰은 로그와 광고 컨텍스트에 전달하지 않는다.
4. 모든 요청은 `x-correlation-id`를 포함한다.
5. 금융 기반 광고 타겟팅은 항상 금지한다.
6. 사용자별 데이터 접근은 서버가 최종 검증하며, 클라이언트는 IDOR 방어용 자기 사용자 범위만 요청한다.
7. 에러 메시지는 사용자에게 안전한 한국어 문장으로 변환하고, 내부 에러와 스택은 노출하지 않는다.
8. 네트워크 장애 시 마지막 안전 캐시 또는 읽기 전용 fallback만 표시한다.
9. API 버전은 `/api/v1`로 고정하며 신규 버전은 호환 계층을 둔다.
10. 요청/응답 스키마는 기능별 타입과 런타임 검증을 병행한다.

## 표준 API 클라이언트 계약

모든 API 호출은 다음 공통 헤더를 포함한다.

```text
accept: application/json
content-type: application/json
x-client-platform: ios | android | web
x-correlation-id: <uuid-or-safe-random-id>
x-raw-financial-data-exposed: false
x-raw-personal-data-exposed: false
x-raw-push-token-exposed: false
x-ad-financial-targeting-used: false
```

관리자 또는 운영성 변경 API를 호출하는 화면은 서버 정책에 따라 별도 `X-Admin-Reason` 또는 mutation reason을 요구할 수 있다. 모바일 사용자 앱은 관리자 권한을 기본 포함하지 않는다.

## 권장 디렉터리 구성

```text
shared/api/
  README.md
  client.ts
  endpoints.ts
  errors.ts
  headers.ts
  schemas.ts
  retry.ts
  privacy.ts
  query-keys.ts
  offline.ts
  mocks.ts
  __tests__/
```

## 엔드포인트 그룹

```text
/api/v1/auth/*
/api/v1/mobile/bootstrap
/api/v1/payroll/*
/api/v1/daily-budgets/*
/api/v1/fixed-expenses/*
/api/v1/savings/*
/api/v1/variable-expenses/*
/api/v1/notifications/*
/api/v1/growth/*
/api/v1/community/*
/api/v1/users/*
/api/v1/uploads/*
/api/v1/ads/*
```

## 에러 표준화

API 에러는 화면에서 직접 파싱하지 않는다. 공통 계층은 HTTP 상태, 서버 error code, retry-after, correlation id를 표준 객체로 변환한다.

- `401`: 로그인 필요
- `403`: 접근 권한 부족 또는 세션 보호
- `404`: 리소스 없음
- `409`: 상태 충돌 또는 중복 처리
- `422`: 입력 검증 실패
- `429`: 요청 과다
- `5xx`: 서버 장애 또는 점검

모든 에러 객체는 민감 필드를 redaction한 뒤 화면과 analytics에 전달한다.

## 개인정보 및 광고 보호

공유 API 계층은 다음 데이터를 요청 로그, 이벤트, 광고/제휴 컨텍스트에 포함하지 않는다.

- 실명, 이메일, 전화번호, 계좌, 카드, 주소
- 급여 원액, 실수령액, 납치금액, 누적 납치금액
- 고정지출/변동지출/저축 원시 금액
- 푸시 토큰, 세션 토큰, refresh token, authorization header
- 커뮤니티 내부 user id와 관리자 감사 정보

광고 요청은 화면 맥락, 슬롯, 언어, 국가, 비개인화 플래그만 전달할 수 있다. 급여·지출·저축·예산·납치금액 기반 타겟팅은 금지한다.

## 서버 권위 계산 경계

클라이언트가 표시용으로 계산할 수 있는 값은 skeleton, progress, 정렬, 필터링, 마스킹뿐이다. 다음 계산은 서버 응답을 최종값으로 사용한다.

```text
planned_total_expense = fixed_expense + daily_living_budget + planned_other_expense
expected_hijack = max(0, expected_salary - planned_total_expense)
today_remaining_budget = max(0, daily_limit - today_variable_expense)
monthly_actual_hijack = max(0, actual_income + carry_over - actual_expense - actual_savings)
```

## 캐시 및 재시도

- 읽기 요청은 짧은 TTL 캐시를 사용할 수 있다.
- 쓰기 요청은 idempotency key 또는 서버 중복 방지 정책을 사용한다.
- 네트워크 실패 시 지수 백오프와 최대 재시도 횟수를 적용한다.
- 금액 변경, 삭제, 결산, 탈퇴는 자동 재시도를 제한하고 사용자 확인을 요구한다.
- 오프라인 상태에서는 읽기 전용 캐시만 표시하고 서버 확정처럼 표현하지 않는다.

## 테스트 완료 기준

- TypeScript strict 통과
- 모든 엔드포인트 타입 검증 통과
- 민감 필드 redaction 테스트 통과
- KRW 정수/비음수 검증 통과
- 401/403/409/422/429/5xx 에러 변환 테스트 통과
- 오프라인 fallback 테스트 통과
- 금융 기반 광고 타겟팅 차단 테스트 통과
- 인증 만료 및 refresh rotation 시나리오 통과
- E2E에서 급여 홈, 계획, 예산, 지출, 저축, 알림, LV UP, 커뮤니티, 프로필 흐름 통과

## 완료 판정

이 README는 `shared/api` 계층이 문서상·이론상 갖춰야 할 서버 권위 API 계약, 개인정보 보호, 광고 금지, 에러 처리, 재시도, 캐시, 테스트 기준을 정의한다. 실제 운영 완성도는 구현 파일, 백엔드 API, 인증/푸시/광고 정책, Expo 빌드, E2E/QA가 함께 통과할 때 확정된다.
