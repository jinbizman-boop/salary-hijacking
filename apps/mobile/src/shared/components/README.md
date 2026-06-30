# 급여납치 Mobile Shared Components

## 목적

`apps/mobile/src/shared/components`는 급여납치 모바일 앱의 화면 품질과 일관성을 보장하는 공통 UI 컴포넌트 계층이다. 급여 홈, 계획, 일일 예산, 고정지출, 고정저축, 변동지출, 알림, LV UP, 커뮤니티, 글쓰기, 마이페이지에서 반복되는 카드, 리스트, 버튼, 입력, 상태 표시, 빈 화면, 오류 화면, 광고/제휴 라벨, 개인정보 보호 배너를 표준화한다.

## 설계 원칙

1. 모바일 우선, 작은 화면 우선, 터치 친화적 UI를 기본으로 한다.
2. 금액, 개인정보, 푸시 토큰 등 민감 데이터는 컴포넌트 props에서 마스킹된 값만 받는다.
3. 화면별 서버 권위 값을 임의 계산하지 않고 표시만 한다.
4. 접근성 role, label, disabled, loading 상태를 필수 제공한다.
5. 한국어 금융 UX 문장과 오류 문장을 일관되게 유지한다.
6. 광고/제휴 콘텐츠는 명확하게 `광고` 또는 `제휴`로 라벨링한다.
7. 금융 기반 광고 타겟팅 여부를 표시하거나 추론하지 않는다.
8. skeleton, empty, error, offline, maintenance 상태를 모든 주요 컴포넌트에서 지원한다.
9. 색상, 간격, 폰트, radius는 shared styles token을 사용한다.
10. 커뮤니티 컴포넌트는 익명 표시와 신고/차단/검토 상태를 지원한다.

## 권장 디렉터리 구성

```text
shared/components/
  README.md
  AppShell.tsx
  SafeScreen.tsx
  Header.tsx
  Card.tsx
  Button.tsx
  FormField.tsx
  AmountText.tsx
  ProgressRing.tsx
  StatusBadge.tsx
  EmptyState.tsx
  ErrorState.tsx
  OfflineBanner.tsx
  PrivacyGuard.tsx
  AdDisclosure.tsx
  ListItem.tsx
  ConfirmSheet.tsx
  __tests__/
```

## 핵심 컴포넌트 계약

### SafeScreen

- SafeArea, ScrollView, keyboard 대응, loading/error/offline 상태를 통합한다.
- 모든 화면의 최상위 wrapper로 사용한다.
- 화면 진입 시 analytics 이벤트는 shared analytics 정책에 맞춰 비식별로만 전송한다.

### AmountText

- 서버에서 내려온 마스킹 또는 표시 허용 금액만 렌더링한다.
- 원시 금액을 analytics, 광고, 오류 메시지에 전달하지 않는다.
- KRW 정수 포맷과 음수 방지 표시 정책을 적용한다.

### PrivacyGuard

- 화면 단위 보호 상태를 시각화한다.
- `rawFinancialData=false`, `rawPersonalData=false`, `rawPushToken=false`, `adsFinancialTargeting=false`를 명확히 유지한다.
- 디버그 빌드에서도 민감 원문을 보여주지 않는다.

### AdDisclosure

- 광고/제휴 라벨, 비개인화 안내, 금융 타겟팅 차단 문구를 포함한다.
- 광고 클릭 이벤트는 비식별 슬롯/화면 맥락만 전송한다.

### ConfirmSheet

- 지출 삭제, 저축 계획 변경, 알림 전체 읽음, 커뮤니티 신고, 탈퇴 등 되돌리기 어려운 액션에 사용한다.
- 서버 mutation은 사용자 확인 후 1회만 실행한다.

## 상태 패턴

모든 화면 컴포넌트는 다음 상태를 통일해서 표현한다.

```text
idle
loading
success
empty
offline
validation_error
auth_required
forbidden
conflict
rate_limited
server_error
maintenance
```

## 기능별 UI 연결

- 급여: 월급일, 예상 급여, 예상 납치금액, 누적 납치금액, 결산 카드
- 계획: 고정지출, 고정저축, 생활비 계획, 계획 초과 경고
- 예산: 오늘 예산, 남은 금액, 초과 상태, 변동지출 입력 CTA
- 지출: 변동지출 리스트, 카테고리, 영수증 첨부 상태, 삭제 확인
- 저축: 자동 저축 계획, 목표 달성률, 실패/연체 표시
- 알림: 읽음/안읽음, 알림 유형, 푸시 설정, quiet hours
- LV UP: 루틴 카드, 경험치, 연속 달성, 인증 CTA
- 커뮤니티: 익명 작성자, 신고, 댓글, 검토/숨김 상태
- 프로필: 누적 성과, 내 게시글, 문의, 보안/개인정보 설정

## 접근성 기준

- 버튼은 `accessibilityRole="button"`과 한국어 label을 제공한다.
- 알림/경고는 시각적 색상뿐 아니라 텍스트로도 상태를 전달한다.
- 터치 영역은 최소 44px 기준을 따른다.
- 입력 컴포넌트는 validation message와 hint를 제공한다.
- 로딩 인디케이터는 현재 작업명을 함께 표시한다.

## 성능 기준

- 긴 리스트는 가상화 또는 페이지네이션 컴포넌트를 사용한다.
- 이미지와 첨부 파일은 lazy loading과 scan 상태를 표시한다.
- 재렌더링이 많은 카드 컴포넌트는 memoization 대상이다.
- skeleton은 서버 응답 전 체감 성능을 개선하되 허위 금액을 표시하지 않는다.

## 테스트 완료 기준

- TypeScript strict 통과
- 스냅샷 테스트 또는 렌더 테스트 통과
- 접근성 role/label 테스트 통과
- loading/empty/error/offline 상태 테스트 통과
- 민감 데이터 props 차단 테스트 통과
- 광고/제휴 라벨 표시 테스트 통과
- 주요 화면 E2E에서 공통 컴포넌트 동작 통과

## 완료 판정

이 README는 `shared/components` 계층이 문서상·이론상 갖춰야 할 UI 일관성, 접근성, 개인정보 보호, 광고 라벨링, 상태 처리, 성능, 테스트 기준을 정의한다. 실제 운영 완성도는 컴포넌트 구현과 모든 모바일 화면 적용, Expo 빌드, E2E/QA 통과 후 확정된다.
