# 급여납치 Mobile Shared Navigation

## 목적

`apps/mobile/src/shared/navigation`은 Expo Router 기반 모바일 앱의 라우팅, 인증 게이트, 탭 구조, 딥링크, 알림 이동, 커뮤니티 이동, 관리자/운영 분리 정책을 정의하는 공통 내비게이션 계층이다. 사용자는 항상 안전한 순서로 로그인, 이메일 인증, 온보딩, 급여 홈, 계획, 예산, 지출, 저축, 알림, LV UP, 커뮤니티, 마이페이지로 이동해야 한다.

## 핵심 라우트

```text
/
/(auth)/login
/(auth)/signup
/(auth)/verify-email
/onboarding
/(tabs)/salary
/(tabs)/plan
/(tabs)/level
/(tabs)/community
/(tabs)/profile
/notifications
/community/[postId]
/community/write
/level/reading
/level/news
/level/english
/level/health
```

## 라우팅 원칙

1. 앱 진입점은 `/api/v1/mobile/bootstrap` 결과를 기준으로 목적지를 결정한다.
2. 미인증 사용자는 인증 화면 외 민감 화면에 접근할 수 없다.
3. 이메일 미인증 사용자는 인증 완료 전 온보딩과 금융 화면에 접근할 수 없다.
4. 온보딩 미완료 사용자는 급여일, 고정지출, 고정저축, 생활비 기본 설정을 완료해야 한다.
5. 알림 딥링크는 서버가 허용한 route만 이동한다.
6. 커뮤니티 링크는 익명 표시와 신고/검토 상태를 보존한다.
7. 관리자 콘솔은 모바일 사용자 앱 라우트에 포함하지 않는다.
8. 오프라인 상태에서는 마지막 안전 경로만 진입한다.
9. 점검 상태에서는 mutation 화면으로 진입하지 않는다.
10. 광고/제휴 딥링크는 외부 이동 전 명확한 라벨과 사용자 의사 확인을 요구한다.

## 권장 디렉터리 구성

```text
shared/navigation/
  README.md
  routes.ts
  route-guards.ts
  deep-links.ts
  tab-config.ts
  navigation-events.ts
  protected-route.ts
  linking.ts
  __tests__/
```

## 보호 게이트

### Auth Gate

- 미인증 사용자는 로그인 또는 회원가입으로 이동한다.
- refresh rotation 실패 시 보안 캐시를 정리한다.
- 인증 화면에서는 금융 데이터 요청을 하지 않는다.

### Email Verification Gate

- 이메일 인증이 필요한 계정은 인증 화면으로 이동한다.
- 인증 완료 후 온보딩 또는 급여 홈으로 복귀한다.

### Onboarding Gate

- 급여일, 예상 급여, 고정지출, 고정저축, 생활비 기준 설정이 완료될 때까지 온보딩을 유지한다.
- 서버가 온보딩 완료를 확정해야 다음 라우트로 이동한다.

### Maintenance Gate

- 운영 점검 중에는 조회 가능한 안내 화면만 표시한다.
- 결산, 삭제, 탈퇴, 계획 변경, 지출 등록 같은 mutation 진입을 제한한다.

## 탭 구성

```text
salary     급여 홈, 오늘 예산, 납치금액, 누적 성과
plan       급여 계획, 고정지출, 고정저축, 생활비 계획
level      독서, 뉴스, 영어, 건강 미션과 경험치
community  익명 커뮤니티, 글쓰기, 댓글, 신고
profile    프로필, 누적 성과, 내 게시글, 문의, 보안
```

## 딥링크 정책

- 허용 목록 기반으로만 이동한다.
- `//`, 외부 URL, 스크립트형 URL, 미등록 route는 차단한다.
- 알림 action route는 서버 응답의 `deepLink` 또는 `action.route`만 사용한다.
- 외부 광고/제휴 URL은 웹뷰 또는 외부 브라우저 이동 전 고지한다.
- 딥링크 이벤트에는 원시 금액과 사용자 식별자를 포함하지 않는다.

## 내비게이션 이벤트

허용되는 이벤트 필드는 다음으로 제한한다.

```text
screen_name
previous_screen
route_group
action
result
latency_ms
error_code
correlation_id
```

금액, 이메일, 전화번호, 계좌, 카드, 푸시 토큰, 세션 토큰, 커뮤니티 내부 user id는 금지한다.

## 테스트 완료 기준

- 라우트 상수 타입 검증 통과
- 인증/이메일/온보딩/점검 게이트 테스트 통과
- 알림 딥링크 허용/차단 테스트 통과
- 탭 이동 E2E 통과
- 오프라인 진입 fallback 테스트 통과
- 광고/제휴 외부 이동 고지 테스트 통과
- 민감 데이터 이벤트 미전송 테스트 통과
- Expo Router 실제 빌드 통과

## 완료 판정

이 README는 `shared/navigation` 계층이 문서상·이론상 갖춰야 할 route map, guard, tabs, deep link, analytics, 개인정보 보호, 테스트 기준을 정의한다. 실제 운영 완성도는 라우터 구현, 화면 통합, Expo 빌드, E2E/QA 통과 후 확정된다.
