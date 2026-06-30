# packages/config · 급여납치 공통 설정 패키지

문서 상태: 최종본  
패키지명: `@salary-hijacking/config`  
파일 위치: `packages/config/README.md`  
프로젝트: 급여납치 Salary Hijacking Platform  
계약 버전: `1.0.0`  
기준 시간대: `Asia/Seoul`  
기준 통화: `KRW`  
핵심 역할: ESLint 9 Flat Config, Prettier 3, TypeScript strict base를 모노레포 전체에 공급하는 shared configuration package

---

## 1. 목적

`packages/config`는 급여납치 모노레포의 앱, API 서버, 관리자 콘솔, 알림 worker, scheduler, 공통 패키지, QA/E2E, 운영 도구, 문서 파이프라인이 동일한 코드 품질 기준을 사용하도록 제공하는 공통 설정 패키지다.

이 패키지는 다음 문제를 해결한다.

1. 앱·서비스·패키지별 ESLint 규칙 불일치를 방지한다.
2. Prettier 포맷 기준을 하나로 고정해 PR diff를 최소화한다.
3. TypeScript strict 옵션을 공통화해 런타임 오류 가능성을 낮춘다.
4. `apps/mobile`, `apps/admin`, `services/api`, `packages/*`, `tools/*`, `qa/*`가 같은 품질 기준을 확장하게 한다.
5. 급여·예산·지출·저축 계산이 클라이언트 임의 계산으로 흐르지 않도록, TypeScript와 lint 기준에서 안전장치를 제공한다.
6. raw financial data, token, secret, PII, 광고/제휴 민감 결합 정책 위반을 lint 단계에서 보조 차단한다.
7. CI/CD, release, quality gate에서 설정 파일 자체를 검증할 수 있게 한다.

---

## 2. 적용 범위

| 소비자                   | 적용 목적                                                                |
| ------------------------ | ------------------------------------------------------------------------ |
| `apps/mobile`            | Expo/React Native TypeScript, API client, 화면 컴포넌트 품질 기준        |
| `apps/admin`             | Next.js 관리자 콘솔 TypeScript, React, route handler 품질 기준           |
| `services/api`           | API 서버, request validation, server-authoritative calculation 품질 기준 |
| `services/notifications` | 알림 worker, queue consumer, push payload 처리 품질 기준                 |
| `services/scheduler`     | 급여일 알림, 월마감, retention job, 운영 자동화 품질 기준                |
| `packages/api-contract`  | Zod schema, API contract, declaration build 품질 기준                    |
| `packages/config`        | ESLint, Prettier, TypeScript 설정 자체 검증                              |
| `tools`                  | 코드 생성, 검증, release, 운영 스크립트 품질 기준                        |
| `qa`                     | 통합 테스트, E2E, UAT fixture와 시나리오 품질 기준                       |
| `docs`                   | Markdown, MDX, 정책 문서, API 문서 포맷 기준                             |
| `ci/release`             | lint, format, typecheck, quality, release gate                           |

---

## 3. 패키지 구조

```txt
packages/config/
├── eslint/
│   └── base.js
├── prettier/
│   └── prettier.config.js
├── typescript/
│   └── base.json
├── package.json
└── README.md
```

| 파일                          | 책임                                                                  |
| ----------------------------- | --------------------------------------------------------------------- |
| `eslint/base.js`              | ESLint 9 Flat Config, JS/TS/TSX/CJS/tests/scripts 공통 lint 정책      |
| `prettier/prettier.config.js` | Prettier 3 ESM config, 코드/문서/설정 파일 포맷 정책                  |
| `typescript/base.json`        | TypeScript strict ESM/Bundler base config                             |
| `package.json`                | public export map, validate scripts, peer/dev dependencies, 품질 정책 |
| `README.md`                   | config 패키지 목적, 사용법, 검증 기준, 완료 기준 문서                 |

---

## 4. Public export 정책

`packages/config/package.json`은 다음 subpath export를 제공한다.

| import path                                     | 대상                               |
| ----------------------------------------------- | ---------------------------------- |
| `@salary-hijacking/config/eslint/base`          | ESLint 9 Flat Config               |
| `@salary-hijacking/config/prettier`             | Prettier 3 config                  |
| `@salary-hijacking/config/prettier/config`      | Prettier 3 config alias            |
| `@salary-hijacking/config/typescript/base`      | TypeScript base tsconfig           |
| `@salary-hijacking/config/typescript/base.json` | TypeScript base tsconfig 명시 경로 |
| `@salary-hijacking/config/package.json`         | package metadata                   |

---

## 5. ESLint 사용 기준

루트 `eslint.config.js` 예시:

```js id="i7dpcv"
import baseConfig from "@salary-hijacking/config/eslint/base";

export default [
  ...baseConfig,
  {
    name: "salary-hijacking/root-project-overrides",
    rules: {
      // 루트 전용 override만 이곳에 작성한다.
    },
  },
];
```

ESLint 공통 설정은 다음 원칙을 따른다.

1. ESLint 9 Flat Config를 기준으로 한다.
2. TypeScript parser/plugin이 설치되어 있으면 TS/TSX config를 자동 활성화한다.
3. parser/plugin이 없는 bootstrap 상태에서도 import 자체가 깨지지 않아야 한다.
4. `console.log`, `console.debug`, `console.trace`, `debugger`, `eval`, `new Function`을 차단한다.
5. TypeScript 파일에서는 core `no-undef` 오탐을 막고 `tsc`가 undefined 검증을 담당한다.
6. raw PII, raw token, raw secret, raw financial source data, ads financial join true flag를 lint 단계에서 보조 차단한다.
7. tests/scripts/config 파일에는 필요한 범위에서 console과 제한 규칙을 완화한다.
8. Prettier와 충돌하는 formatting rule은 `eslint-config-prettier`로 비활성화한다.

---

## 6. Prettier 사용 기준

루트 `prettier.config.js` 예시:

```js id="oaz9qj"
export { default } from "@salary-hijacking/config/prettier";
```

Prettier 공통 설정은 다음 기준을 고정한다.

| 항목             | 기준     |
| ---------------- | -------- |
| Prettier         | `>=3 <4` |
| `printWidth`     | `100`    |
| `tabWidth`       | `2`      |
| `useTabs`        | `false`  |
| `semi`           | `true`   |
| `singleQuote`    | `false`  |
| `trailingComma`  | `all`    |
| `endOfLine`      | `lf`     |
| plugin 강제 의존 | 없음     |

지원 파일 범위:

- TypeScript, JavaScript, TSX, JSX, MJS, CJS, MTS, CTS
- JSON, JSONC, JSON5
- YAML, GitHub Actions, Docker Compose, infra YAML
- Markdown, MDX, README, CHANGELOG, SECURITY
- HTML, CSS, SCSS, Less
- scripts, tools, config files

---

## 7. TypeScript 사용 기준

패키지 `tsconfig.json` 예시:

```json id="phtcb2"
{
  "extends": "../../packages/config/typescript/base.json",
  "compilerOptions": {
    "baseUrl": ".",
    "rootDir": "src",
    "outDir": "dist",
    "noEmit": false
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"]
}
```

Next.js 앱 `tsconfig.json` 예시:

```json id="mfz41x"
{
  "extends": "../../packages/config/typescript/base.json",
  "compilerOptions": {
    "jsx": "preserve",
    "noEmit": true,
    "plugins": [{ "name": "next" }]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

TypeScript base는 다음 기준을 고정한다.

| 항목                             | 기준       |
| -------------------------------- | ---------- |
| target                           | `ES2022`   |
| module                           | `ESNext`   |
| moduleResolution                 | `Bundler`  |
| jsx                              | `preserve` |
| strict                           | `true`     |
| noImplicitAny                    | `true`     |
| strictNullChecks                 | `true`     |
| exactOptionalPropertyTypes       | `true`     |
| noUncheckedIndexedAccess         | `true`     |
| noImplicitOverride               | `true`     |
| isolatedModules                  | `true`     |
| verbatimModuleSyntax             | `true`     |
| forceConsistentCasingInFileNames | `true`     |

---

## 8. 급여납치 보안·개인정보 정책

이 패키지는 설정 패키지이지만, 급여납치 플랫폼의 보안 기준을 품질 게이트에서 보조해야 한다.

공통 정책은 다음과 같다.

1. raw financial data를 auth, community, ads, logs에 직접 결합하지 않는다.
2. access token, refresh token, secret key, DB URL, 원문 PII는 response나 log에 남기지 않는다.
3. 광고/제휴 이벤트는 급여액, 지출액, 저축액, 납치금액 원천 데이터와 분리한다.
4. 서버 권위 계산을 우선하고 클라이언트 최종 계산을 금지한다.
5. API contract, DB migration, service route, mobile/admin client가 동일한 schema와 type 기준을 사용해야 한다.
6. lint, typecheck, format, quality, release gate는 설정 파일 자체까지 검증해야 한다.

---

## 9. 검증 명령

`packages/config` 내부 검증:

```bash id="7n15p2"
cd packages/config

pnpm run validate
pnpm run validate:json
pnpm run validate:exports
pnpm run validate:eslint
pnpm run validate:prettier
pnpm run validate:typescript
pnpm run validate:policy
pnpm run quality
pnpm run release
```

루트 검증:

```bash id="152xij"
pnpm run lint
pnpm run typecheck
pnpm exec prettier --check .
pnpm run quality
pnpm run release
```

---

## 10. 변경 절차

공통 설정 변경은 전체 모노레포에 영향을 준다. 변경 시 다음을 함께 확인한다.

1. `packages/config/package.json` export map 반영
2. ESLint config import 검증
3. Prettier config import 검증
4. TypeScript base JSON 검증
5. `apps/mobile` typecheck 영향 확인
6. `apps/admin` typecheck 영향 확인
7. `services/api` typecheck 영향 확인
8. `packages/api-contract` declaration build 영향 확인
9. QA/E2E fixture lint 영향 확인
10. docs/Markdown format 영향 확인
11. CI workflow lint/typecheck/format task 영향 확인
12. `CHANGELOG.md` 또는 변경 기록 반영

breaking change는 다음 조건을 만족해야 한다.

- 각 앱·서비스·패키지별 migration path가 있어야 한다.
- typecheck 실패 가능성이 있는 strict option 추가는 단계적으로 적용해야 한다.
- ESLint error level 변경은 QA와 CI에서 먼저 검증해야 한다.
- Prettier 변경은 대규모 formatting PR과 기능 PR을 분리해야 한다.

---

## 11. 금지 사항

`packages/config`에서는 다음을 금지한다.

1. `export {};` placeholder 상태로 유지
2. 실제 export map 없이 설정 파일만 배치
3. TypeScript strict base 없이 앱별로 임의 tsconfig 작성
4. Prettier plugin을 필수 설치로 강제해 bootstrap을 깨뜨리는 구성
5. ESLint parser/plugin 미설치 시 import가 실패하는 구성
6. 루트와 패키지의 formatting 기준 불일치
7. raw financial data, token, secret, PII 노출 허용 정책
8. 클라이언트 최종 급여 계산을 허용하는 품질 정책
9. release gate 없이 설정 변경
10. 실제 검증 스크립트 없이 `finalStatus`만 선언

---

## 12. 완료 기준

이 README는 다음 기준을 충족할 때 파일 단위 완료로 본다.

1. 패키지 목적을 설명한다.
2. 적용 범위와 소비자를 설명한다.
3. 폴더 구조와 파일 책임을 설명한다.
4. public export 정책을 설명한다.
5. ESLint 사용법을 설명한다.
6. Prettier 사용법을 설명한다.
7. TypeScript 사용법을 설명한다.
8. 급여납치 보안·개인정보 정책을 설명한다.
9. 검증 명령을 설명한다.
10. 변경 절차를 설명한다.
11. 금지 사항을 설명한다.
12. 완료 기준과 최종 판정을 포함한다.
13. 미완료 표식, TODO, 임시 placeholder가 없다.

---

## 13. 최종 판정

`packages/config/README.md`는 급여납치 공통 설정 패키지의 목적, 구조, export, ESLint, Prettier, TypeScript, 보안·개인정보 정책, 검증 명령, 변경 절차, 금지 사항을 통합 정의하는 최종 문서다.

문서상·이론상 `packages/config/README.md` 파일 단위 기준으로 더 이상 추가 작성이 필요 없는 최종본으로 사용한다.

프로젝트 종합 완성도 100%는 다음 파일과 실제 검증이 모두 일치하고 통과했을 때 최종 확정한다.

- `packages/config/package.json`
- `packages/config/eslint/base.js`
- `packages/config/prettier/prettier.config.js`
- `packages/config/typescript/base.json`
- root `eslint.config.js`
- root `prettier.config.js`
- 각 앱·서비스·패키지 `tsconfig.json`
- CI/CD lint, format, typecheck, quality, release gate
