# TodoList 프로젝트 구조 설계 원칙

버전: 1.0 / 작성일: 2026-07-29

## 0. 참조 문서

본 문서는 아래 두 문서를 재정의하지 않고 그대로 인용하며, 그 위에 코드/폴더 구조 원칙을 정의한다.

- 도메인 정의서: [`docs/1-domain-definition.md`](./1-domain-definition.md) — 용어(2장), 엔티티(3장), 상태 파생 로직(4장), 비즈니스 규칙 1~7(5장)
- PRD: [`docs/2-PRD.md`](./2-PRD.md) — 기능/비기능 요구사항(5~6장), 기술 아키텍처(7장)
- 사용자 시나리오: [`docs/3-user-scenario.md`](./3-user-scenario.md)

기술 스택은 PRD 7장을 그대로 따른다.

- 프론트엔드: React 19 + TypeScript, Zustand(클라이언트 상태), TanStack Query(서버 상태)
- 백엔드: Node.js + JavaScript(TypeScript 미사용) + Express, DB 접근은 `pg` 직접 사용(ORM 미사용)
- DB: PostgreSQL 17
- 플랫폼: 웹 전용 반응형 UI
- 제약: 1인 개발, 2일 내 MVP — 과설계 지양, 확장 가능한 기본 원칙만 유지

## 1. 최상위 공통 원칙

모든 스택(프론트엔드/백엔드/DB)에 공통으로 적용되는 원칙이다.

1. **관심사 분리(Separation of Concerns)**: UI 표현, 상태 관리, 서버 통신, 비즈니스 로직, 데이터 접근을 각각 별도 레이어/모듈로 분리한다.
2. **단일 책임(Single Responsibility)**: 하나의 파일/함수/모듈은 하나의 역할만 담당한다. 예를 들어 상태 파생 계산과 HTTP 요청 처리는 서로 다른 함수에 위치한다.
3. **명시적 의존성(Explicit Dependency)**: 모듈 간 의존은 import를 통해 명시적으로 드러나야 하며, 전역 변수나 암묵적 공유 상태에 의존하지 않는다.
4. **설정과 코드의 분리**: DB 접속정보, 시크릿, 포트 등은 코드에 하드코딩하지 않고 환경변수(`.env`)로 분리한다(5장 참조).
5. **문서와의 정합성 유지**: 코드/폴더 구조에서 사용하는 용어와 규칙은 도메인 정의서(2장 Ubiquitous Language, 5장 비즈니스 규칙)와 PRD(FR 번호)를 그대로 따르며, 임의로 재정의하지 않는다.
6. **과설계 지양(YAGNI)**: 1인 개발·2일 일정 제약을 감안해, 지금 필요하지 않은 추상화(불필요한 인터페이스, 과도한 DI 컨테이너, 마이크로서비스 분리 등)는 도입하지 않는다. 다만 레이어 분리처럼 "적은 비용으로 향후 확장을 막지 않는" 최소한의 구조적 원칙은 지킨다.
7. **일관성 우선**: 정답이 여러 개인 규칙(네이밍, 폴더 배치 등)은 팀(1인) 내에서 하나의 규칙만 선택해 전체 코드베이스에 일관되게 적용한다.

## 2. 의존성/레이어 원칙

### 2.1 프론트엔드 레이어 (React)

```
UI(컴포넌트/페이지) → 상태관리(Zustand/TanStack Query) → API 클라이언트(fetch 래퍼)
```

- **UI 레이어**: 화면 렌더링과 사용자 입력 처리만 담당. 서버 데이터 형태를 직접 가공하지 않고 상태관리 레이어가 제공하는 값을 그대로 사용한다.
- **상태관리 레이어**:
  - Zustand: 서버와 무관한 로컬/UI 상태(로그인 여부, 선택된 필터, 모달 오픈 여부 등)만 보관한다.
  - TanStack Query: 서버 상태(할일 목록, 카테고리 목록 등)의 페칭·캐싱·리페칭을 담당한다. 서버 상태를 Zustand에 중복 저장하지 않는다.
- **API 클라이언트 레이어**: HTTP 요청/응답 처리, 인증 토큰 첨부, 에러 포맷 통일만 담당. 비즈니스 규칙 판단(상태 파생, 소유권 등)을 포함하지 않는다.
- **의존 방향**: UI → 상태관리 → API 클라이언트 순으로만 의존한다(상위 레이어가 하위 레이어를 참조). API 클라이언트가 상태관리나 UI를 참조하는 역방향 의존은 금지한다.

### 2.2 백엔드 레이어 (Express)

```
routes → controllers → services → data access(pg)
```

- **routes**: URL/HTTP 메서드와 미들웨어(인증, 유효성 검증) 연결만 담당. 비즈니스 로직을 포함하지 않는다.
- **controllers**: HTTP 요청/응답 변환(req 파싱, 상태 코드 결정, res 반환)만 담당. DB 접근이나 복잡한 도메인 판단은 services에 위임한다.
- **services**: 도메인 규칙(비즈니스 로직)이 위치하는 레이어. 아래 로직은 반드시 services에 둔다.
  - 할일 상태(시작전/진행중/완료/기한초과) 파생 계산 (도메인 정의서 4장, FR-12)
  - 소유권 검증 및 비소유 시 404 처리 (도메인 규칙 4, FR-9~11)
  - 카테고리 미지정 시 '기본' 카테고리 자동 적용 (도메인 규칙 2, FR-5)
  - 카테고리 삭제 시 할일의 '기본' 카테고리 자동 이관 (도메인 규칙 7, FR-6)
  - 시작일자 ≤ 종료일자 유효성 검증 (도메인 규칙 3, FR-7)
- **data access(pg)**: SQL 쿼리 작성/실행만 담당하며, 도메인 규칙 판단을 포함하지 않는다(순수 CRUD/쿼리).
- **의존 방향**: routes → controllers → services → data access 순으로만 의존한다(상위가 하위를 호출). data access가 services를, services가 controllers를 참조하는 역방향 의존은 금지한다.

## 3. 코드/네이밍 원칙

- **파일명**: 백엔드는 도메인 단수형 + kebab-case를 기본으로 한다. 예: `todo-service.js`, `category-controller.js`, `todo-repository.js`, `auth-middleware.js`. 프론트엔드 컴포넌트 파일은 PascalCase(`TodoList.tsx`), 훅/유틸은 camelCase(`useTodoQuery.ts`)로 구분한다.
- **함수/변수명**: camelCase를 사용한다. 예: `deriveTodoStatus()`, `assertOwnership()`, `applyDefaultCategory()`.
- **도메인 용어 반영**: 도메인 정의서 2장 Ubiquitous Language(User/Category/Todo, 소유자, 상태, 필터)를 코드 네이밍에 그대로 사용한다. 예: 테이블/변수는 `todo`, `category`, `owner_id`를 사용하고 임의의 동의어(`task`, `group`, `userId` 대신 도메인 문서와 다른 이름)를 섞어 쓰지 않는다.
- **상태값 네이밍**: 상태 4종은 도메인 정의서 4장 표기를 그대로 코드 상수로 사용한다. 예: `NOT_STARTED`, `IN_PROGRESS`, `COMPLETED`, `OVERDUE`.
- **매직 넘버/문자열 금지**: HTTP 상태 코드 외의 도메인 관련 상수(상태값, 기본 카테고리 이름 `'기본'`, 페이지네이션 기본 크기 등)는 별도 상수 모듈(`src/constants` 등)로 분리하고 리터럴을 코드 곳곳에 직접 나열하지 않는다.

## 4. 테스트/품질 원칙

PRD 9장 리스크에 "자동화 테스트 스위트 미구축"이 명시되어 있으므로, 2일 일정 내 현실적인 수준으로 한정한다.

- 전체 E2E/부하 테스트 자동화는 구축하지 않으며, UC-1~UC-9 Must 항목은 수동 QA 체크리스트로 검증한다(PRD 2.2.1, 8장).
- 다만 회귀 위험이 가장 큰 **핵심 비즈니스 로직(할일 상태 파생 계산, 도메인 4장)** 은 최소 단위 테스트를 작성한다. 최소한 4가지 상태(시작전/진행중/완료/기한초과)와 경계값(시작일 당일, 종료일 당일, 완료 후 기한초과)을 검증한다.
- 소유권 검증(도메인 규칙 4) 로직도 여유가 있으면 단위 테스트를 추가하고, 시간이 부족하면 수동 QA(타 계정 ID로 접근 시 404 확인)로 대체한다.
- 린트/포맷터: 백엔드(JS)는 ESLint, 프론트엔드(TS)는 ESLint + Prettier를 사용해 최소한의 스타일 일관성을 유지한다. 커밋 전 수동 실행으로 충분하며, 별도 CI 파이프라인 구축은 이번 범위에서 필수는 아니다.

## 5. 설정/보안/운영 원칙

- **환경변수 관리**: DB 접속정보, JWT 시크릿, 포트 등은 `.env`로 관리하고 `.gitignore`에 포함해 절대 커밋하지 않는다. 대신 키 목록만 담은 `.env.example`을 저장소에 커밋해 필요한 변수를 문서화한다.
- **DB 마이그레이션**: ORM을 사용하지 않으므로 `db/migrations/*.sql` 형태로 순번(`001_init.sql`, `002_...sql`)을 붙여 순차 관리한다(PRD 7.2). 2일 일정상 정교한 도구 없이 초기 스키마 스크립트 1~2개 수준으로 충분하다.
- **로깅**: 요청 단위 로그(메서드/경로/상태코드/응답시간)와 에러 로그를 구조화된 형태로 남긴다. 비밀번호/토큰 등 민감정보는 로그에 남기지 않는다.
- **인증(도메인 규칙 1) 강제 위치**: Express 미들웨어(`src/middlewares/auth-middleware.js`)에서 모든 보호된 라우트 진입 전에 토큰을 검증하고, 미인증 요청은 예외 없이 401로 차단한다(FR-3).
- **소유권 검증/404 처리(도메인 규칙 4) 강제 위치**: services 레이어에서 리소스 조회 시 `owner_id`가 요청 사용자와 일치하는지 확인하고, 불일치·미존재 시 동일하게 404를 반환한다. controllers는 services가 던진 결과를 그대로 상태 코드로 변환할 뿐 자체적으로 소유권을 판단하지 않는다.
- **기본 보안**: CORS는 허용 오리진(프론트엔드 도메인)만 명시적으로 열어둔다. 모든 SQL은 `pg`의 파라미터 바인딩(`$1, $2 ...`)을 사용해 SQL 인젝션을 방지하며, 문자열 결합으로 쿼리를 생성하지 않는다. 요청 바디는 컨트롤러 진입 전 유효성 검증(필수값, 날짜 형식 등)을 거친다. 비밀번호는 bcrypt로 해싱해 저장한다.

## 6. 프론트엔드 디렉토리 구조

```
frontend/
└── src/
    ├── components/       # 재사용 가능한 프레젠테이션 컴포넌트 (TodoItem, CategoryBadge 등)
    ├── pages/            # 라우트 단위 화면 (LoginPage, TodoListPage, TodoFormPage 등)
    ├── store/            # Zustand 스토어 (로그인 여부, 필터 선택 상태 등 클라이언트 상태)
    ├── queries/          # TanStack Query 훅 (useTodos, useCreateTodo 등 서버 상태 관리)
    ├── api/              # API 클라이언트 (fetch 래퍼, 인증 토큰 첨부, 엔드포인트 함수)
    ├── types/            # 도메인 타입 정의 (Todo, Category, User, TodoStatus 등)
    ├── constants/        # 상태값, 기본 카테고리명 등 매직 문자열 상수
    ├── utils/            # 순수 유틸 함수 (날짜 포맷팅 등)
    └── App.tsx           # 라우터 및 전역 프로바이더 설정
```

- `components`: 서버/클라이언트 상태를 직접 소유하지 않고 props로 받아 렌더링만 한다.
- `pages`: 라우트별 화면을 구성하며 `queries`/`store`를 조합해 `components`에 전달한다.
- `store`: Zustand로 관리하는 로컬 UI 상태만 둔다(서버 데이터 캐시 금지).
- `queries`: TanStack Query로 서버 데이터 페칭/캐싱/뮤테이션을 담당하며, 내부에서 `api`를 호출한다.
- `api`: HTTP 통신만 담당, 도메인 판단 로직 없음.
- `types`: 백엔드 응답과 1:1 대응하는 도메인 타입을 정의해 도메인 용어를 그대로 반영한다.

## 7. 백엔드 디렉토리 구조

```
backend/
└── src/
    ├── routes/           # URL-핸들러 매핑 (todo-routes.js, category-routes.js, auth-routes.js)
    ├── controllers/       # req/res 변환 (todo-controller.js, category-controller.js, auth-controller.js)
    ├── services/          # 도메인 규칙/비즈니스 로직 (todo-service.js, category-service.js, auth-service.js)
    ├── repositories/      # pg 쿼리 (todo-repository.js, category-repository.js, user-repository.js)
    ├── middlewares/       # 인증, 에러 처리, 요청 로깅 (auth-middleware.js, error-handler.js)
    ├── db/                # pg Pool 생성 및 연결 설정 (pool.js)
    ├── migrations/        # 순차 SQL 스크립트 (001_init.sql, 002_add_index.sql 등)
    ├── constants/         # 상태값(NOT_STARTED 등), 기본 카테고리명 등 상수
    ├── config/            # 환경변수 로드 및 검증 (config.js)
    └── app.js             # Express 앱 초기화, 미들웨어/라우터 등록
```

- `routes`: 예) `GET /todos` → `auth-middleware` 통과 후 `todo-controller.getTodos` 호출.
- `controllers`: 예) `todo-controller.js`는 쿼리 파라미터(카테고리/상태 필터)를 파싱해 `todo-service`에 전달하고 결과를 JSON으로 반환한다.
- `services`: 도메인 규칙이 실제로 구현되는 위치.
  - 상태 파생 로직 예시: `todo-service.js`의 `deriveTodoStatus(todo, today)` 함수가 완료 여부/시작일자/종료일자를 조합해 4가지 상태를 계산한다(도메인 4장, FR-12).
  - 소유권 검증 예시: `todo-service.js`의 `getTodoOwnedByUser(todoId, userId)`가 `repositories`에서 조회한 뒤 `owner_id !== userId`이면 `NotFoundError`를 던지고, `controllers`는 이를 404로 변환한다(도메인 규칙 4, FR-9~11).
  - 기본 카테고리 적용 예시: `category-service.js`의 `resolveCategoryId(categoryId, userId)`가 `categoryId`가 없을 때 사용자의 '기본' 카테고리 id를 반환한다(도메인 규칙 2).
  - 카테고리 이관 예시: `category-service.js`의 `deleteCategory(categoryId, userId)`가 삭제 전 소속 할일을 '기본' 카테고리로 재할당하는 리포지토리 함수를 호출한다(도메인 규칙 7).
- `repositories`: 순수 SQL 실행만 담당(예: `findTodoById`, `updateTodoCategory`). 도메인 판단 없음, 파라미터 바인딩 쿼리만 사용.
- `middlewares`: `auth-middleware.js`가 JWT 검증 및 401 처리(도메인 규칙 1), `error-handler.js`가 서비스에서 던진 에러를 일관된 HTTP 응답으로 변환(404/400 등).
- `migrations`: ORM 없이 SQL 파일을 순번대로 수동 실행하여 스키마를 관리한다(PRD 7.2).

## 8. 문서 간 정합성 우선순위

본 문서의 폴더/레이어 구조는 어디까지나 도메인 정의서와 PRD에서 정의한 규칙과 요구사항을 구현하기 위한 수단이다. 본 문서의 내용이 도메인 정의서(1장) 또는 PRD(2장)의 내용과 상충할 경우, **도메인 정의서(비즈니스 규칙의 Source of Truth) → PRD(기능/기술 요구사항) → 본 문서(구조/구현 원칙)** 순으로 우선순위를 두며, 본 문서는 그에 맞춰 즉시 수정한다.
