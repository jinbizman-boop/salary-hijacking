# 급여납치 출시 문서 7종 최종본 INDEX

> 문서 상태: 최종본  
> 적용 범위: 급여납치 모바일 애플리케이션 iOS/Android 정식 출시  
> 작성 기준일: 2026-06-15  
> 기준 시간대: Asia/Seoul  
> 문서 원칙: 본 문서는 문서상·이론상 추가 기획 작업이 필요 없도록 출시 준비, 검수, 등록, 마케팅, 버전, 롤백 기준을 완결형으로 정의한다.

---

## 1. 문서 세트 구성

| 번호 | 문서명            | 파일명                           | 최종 산출 목적                                                   |
| ---: | ----------------- | -------------------------------- | ---------------------------------------------------------------- |
|    1 | 출시 체크리스트   | `01_출시_체크리스트_최종본.md`   | 앱스토어/플레이스토어 배포 전 기능·디자인·보안·약관·QA 최종 검수 |
|    2 | 스토어 등록 문서  | `02_스토어_등록_문서_최종본.md`  | App Store Connect/Google Play Console 등록 정보 확정             |
|    3 | 앱 소개 문구 문서 | `03_앱_소개_문구_문서_최종본.md` | 마케팅/스토어/광고/랜딩용 소개 문구 확정                         |
|    4 | 스크린샷 기획서   | `04_스크린샷_기획서_최종본.md`   | 급여 홈·계획·LV UP·커뮤니티·마이페이지 스토어 이미지 구성 확정   |
|    5 | 릴리즈 노트 문서  | `05_릴리즈_노트_문서_최종본.md`  | 버전별 변경사항·버그 수정·신규 기능 공지 체계 확정               |
|    6 | 버전 관리 정책서  | `06_버전_관리_정책서_최종본.md`  | v1.0.0/v1.1.0/hotfix/빌드 번호/태그 기준 확정                    |
|    7 | 롤백 계획서       | `07_롤백_계획서_최종본.md`       | 배포 실패 시 앱·API·DB·스토어·공지 복구 기준 확정                |

## 2. 출시 최종 원칙

급여납치 플랫폼의 출시 문서는 다음 조건이 모두 충족된 상태를 최종본으로 본다.

1. iOS와 Android 정식 배포 전 필수 검수 항목이 체크리스트로 고정되어 있다.
2. 스토어 등록 메타데이터, 카테고리, 설명, 키워드, 스크린샷, 개인정보 고지 항목이 정의되어 있다.
3. 앱의 핵심 가치인 급여 선점 관리, 납치금액 시각화, 일일 예산 통제, 레벨업 루틴, 커뮤니티 인증이 출시 문구와 이미지에 일관되게 반영되어 있다.
4. 릴리즈 노트와 버전 정책이 SemVer 기반으로 정의되어 있어 업데이트 관리가 가능하다.
5. 장애 또는 배포 실패 시 롤백 기준, 의사결정권자, 복구 순서, 사용자 공지 문안이 확정되어 있다.
6. 개인정보·보안·광고 데이터 분리·커뮤니티 운영 정책과 충돌하지 않는다.

## 3. 출시 승인 게이트

| 게이트           | 승인 기준                                                | 승인자                    | 산출물                 |
| ---------------- | -------------------------------------------------------- | ------------------------- | ---------------------- |
| 기능 게이트      | P1 핵심 기능 100% 통과                                   | PO/QA Lead                | QA 결과표              |
| 보안 게이트      | 인증, 권한, 개인정보, 파일 업로드 보안 통과              | Security Owner            | 보안 테스트 체크리스트 |
| 정책 게이트      | 약관, 개인정보처리방침, 데이터 안전성, 앱 권한 설명 통과 | Policy Owner              | 정책 검수표            |
| 스토어 게이트    | 스토어 등록 문구, 이미지, 카테고리, 스크린샷 검수 통과   | Marketing/Release Manager | 스토어 등록 문서       |
| 운영 게이트      | CS, 장애 대응, 공지, 모니터링 준비 완료                  | Ops Lead                  | 운영 준비 확인서       |
| 최종 출시 게이트 | 모든 승인자 승인 완료                                    | 대표/Release Manager      | Release Go 승인 기록   |

## 공식 기준 출처

- Apple App Store Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Apple App Store Product Page: https://developer.apple.com/app-store/product-page/
- Apple App Store Screenshot Specifications: https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/
- Apple App Store Submitting: https://developer.apple.com/app-store/submitting/
- Google Play Data safety: https://support.google.com/googleplay/android-developer/answer/10787469
- Google Play Store listing preview assets: https://support.google.com/googleplay/android-developer/answer/9866151
- Google Play metadata policy help: https://support.google.com/googleplay/android-developer/answer/9898842
- Google Play prepare and roll out a release: https://support.google.com/googleplay/android-developer/answer/9859348
- Google Play staged rollout: https://support.google.com/googleplay/android-developer/answer/6346149
- Android Core app quality guidelines: https://developer.android.com/docs/quality-guidelines/core-app-quality
