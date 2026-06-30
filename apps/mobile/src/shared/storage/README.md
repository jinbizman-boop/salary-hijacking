# 급여납치 Mobile Shared Storage

## 목적

`apps/mobile/src/shared/storage`는 급여납치 모바일 앱에서 사용하는 SecureStore, AsyncStorage, 캐시, 오프라인 fallback, 세션 상태 저장, 사용자 설정 저장 정책을 정의한다. 이 계층은 민감 데이터의 저장 금지와 비민감 캐시의 수명, 암호화 경계, 로그 금지를 통합한다.

## 저장 원칙

1. 세션 토큰 원문, refresh token, 푸시 토큰 원문, 계좌, 카드, 연락처, 급여 원액, 지출 원액, 저축 원액, 납치금액 원문은 일반 storage에 저장하지 않는다.
2. SecureStore에는 최소한의 세션 상태, 사용자 동의 상태, 장치 등록 상태만 저장한다.
3. AsyncStorage 또는 일반 캐시는 비민감 UI 상태와 읽기 전용 요약만 저장한다.
4. 캐시 데이터는 서버 확정값처럼 표현하지 않는다.
5. 사용자 로그아웃, 탈퇴, 세션 만료, 계정 잠금 시 관련 캐시를 즉시 삭제한다.
6. 캐시 키는 도메인, 버전, 사용자 해시 범위를 포함한다.
7. 광고/제휴 컨텍스트 캐시는 금융 데이터와 결합하지 않는다.
8. 커뮤니티 임시글은 원시 금융 금액과 연락처를 저장하기 전 client moderation을 통과해야 한다.

## 권장 디렉터리 구성

```text
shared/storage/
  README.md
  secure-store.ts
  async-store.ts
  cache-keys.ts
  cache-policy.ts
  migrations.ts
  redaction.ts
  purge.ts
  offline-snapshot.ts
  __tests__/
```

## 저장소 구분

### SecureStore

허용 항목:

- 인증 여부 요약
- 사용자 해시 범위
- 이메일 인증/온보딩 완료 여부
- push consent 상태
- quiet hours 설정
- 마지막 안전 bootstrap 상태

금지 항목:

- access token 원문
- refresh token 원문
- FCM/APNs push token 원문
- 급여/지출/저축/납치금액 원문
- 계좌/카드/연락처/이메일 원문

### AsyncStorage 또는 일반 캐시

허용 항목:

- 마지막 선택 탭
- UI 필터/정렬
- skeleton 표시 제어
- 비식별 feature flag
- 서버가 허용한 요약 digest
- 읽기 전용 오프라인 snapshot

금지 항목:

- 사용자 식별 원문
- 금융 원문 데이터
- 인증 비밀값
- 광고 타겟팅용 금융 세그먼트

## 캐시 키 정책

```text
salary-hijacking:<platform>:<domain>:<schemaVersion>:<userHashOrPublic>:<resource>
```

예시:

```text
salary-hijacking:mobile:bootstrap:v1:user_abcd:last-safe
salary-hijacking:mobile:notifications:v1:user_abcd:list-summary
salary-hijacking:mobile:community:v1:public:feed-filter
```

## TTL 기준

- bootstrap: 짧은 TTL, 오프라인 fallback 전용
- 알림 목록: 짧은 TTL, 서버 동기화 우선
- 급여/예산/지출/저축 요약: 매우 짧은 TTL 또는 화면 세션 한정
- 커뮤니티 피드: 중간 TTL 가능, 신고/숨김 상태는 서버 우선
- LV UP 과제: 당일 단위 TTL 가능, 완료 처리는 서버 확정 필요
- 프로필/보안 설정: 짧은 TTL, 변경 후 즉시 purge

## Purge 트리거

- 로그아웃
- 세션 만료
- refresh 실패
- 계정 잠금 또는 정지
- 이메일 변경
- 탈퇴 완료
- 기기 등록 해제
- 개인정보 내보내기/삭제 요청 완료
- 앱 버전 migration 실패
- 보안 정책 버전 변경

## 오프라인 fallback

오프라인 snapshot은 다음 조건을 만족해야 한다.

- 화면에 `오프라인 보호 모드`를 표시한다.
- 마지막 동기화 시간을 표시한다.
- mutation CTA를 비활성화하거나 서버 재연결을 요구한다.
- 금액은 서버가 표시 허용한 마스킹 또는 요약값만 보여준다.
- 광고/제휴 요청은 오프라인에서 실행하지 않는다.

## 테스트 완료 기준

- 민감 키 저장 차단 테스트 통과
- cache key namespace 테스트 통과
- TTL 만료 테스트 통과
- 로그아웃/탈퇴 purge 테스트 통과
- 세션 만료 purge 테스트 통과
- 오프라인 fallback 읽기 전용 테스트 통과
- storage migration 테스트 통과
- 광고 금융 세그먼트 저장 금지 테스트 통과
- Expo SecureStore/AsyncStorage 실제 빌드 테스트 통과

## 완료 판정

이 README는 `shared/storage` 계층이 문서상·이론상 갖춰야 할 보안 저장, 캐시, TTL, purge, 오프라인 fallback, 민감 데이터 금지, 테스트 기준을 정의한다. 실제 운영 완성도는 구현 파일, 실제 SecureStore/AsyncStorage 연동, 보안 테스트, Expo 빌드, E2E/QA 통과 후 확정된다.
