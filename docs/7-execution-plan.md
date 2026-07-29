# TodoList 실행계획 (DB / 백엔드 / 프론트엔드)

버전: 1.0 / 작성일: 2026-07-29

## 0. 개요

본 문서는 [`docs/1-domain-definition.md`](./1-domain-definition.md), [`docs/2-PRD.md`](./2-PRD.md),
[`docs/3-user-scenario.md`](./3-user-scenario.md), [`docs/4-project-structure.md`](./4-project-structure.md),
[`docs/5-arch-diagram.md`](./5-arch-diagram.md), [`docs/6-erd.md`](./6-erd.md), `database/schema.sql`을
바탕으로 데이터베이스(DB) / 백엔드(BE) / 프론트엔드(FE) 세 영역의 실행계획을 각각 전문 서브에이전트(postgres-pro,
backend-developer, frontend-developer)에 병렬로 위임해 작성한 뒤 통합한 것이다.

- Task ID 체계: `DB-n`, `BE-n`, `FE-n`
- 각 Task는 제목/설명/의존성/완료 조건(체크박스)으로 구성
- 1인 개발·2일 MVP 규모를 전제로 하며, PRD의 MoSCoW 우선순위(Must/Should/Could)를 그대로 따른다
- 문서 간 상충 시 우선순위: 도메인 정의서 > PRD > project-structure.md > 본 실행계획 ([`docs/4-project-structure.md`](./4-project-structure.md) 8장과 동일 원칙)

### 0.1 영역 간 전체 의존 흐름

```
DB-1 → DB-2 → (DB-3 / DB-4 / DB-6 병행) → DB-5 → DB-7(선택)
                    │
                    ▼
BE-1 → BE-2 → BE-3 → BE-4 → BE-5 → BE-6 → BE-8 → BE-9
                              └─────────────→ BE-7(Should, 여유 시)
                    │
                    ▼
FE-1 → FE-2 → FE-3 → (FE-4 / FE-5 / FE-6 병행) → FE-7 → FE-9
                              └─────────────────────→ FE-8(Should, 여유 시)
```

- DB-2(스키마 적용) 완료가 BE-1 착수의 전제 조건이다.
- BE-2(회원가입/로그인 API)까지는 FE가 Mock으로 선행 개발 가능하나, FE-3부터는 실제 BE 엔드포인트 연동이 필요하다.
- BE와 FE는 API 계약(엔드포인트/요청·응답 스키마)만 먼저 확정되면 상당 부분 병행 개발이 가능하다.

---

## 1. 데이터베이스(DB) 영역

> 참조: [`docs/1-domain-definition.md`](./1-domain-definition.md)(엔티티, 비즈니스 규칙 1~7),
> [`docs/2-PRD.md`](./2-PRD.md)(7.3절), [`docs/4-project-structure.md`](./4-project-structure.md)(5장, 7장),
> [`docs/6-erd.md`](./6-erd.md), `database/schema.sql`

### DB-1. PostgreSQL 17 로컬 개발 환경 준비 및 접속 확인

**설명**: 로컬/개발 환경에 PostgreSQL 17을 준비하고 TodoList 전용 DB·계정을 생성한다. 접속정보는
`.env`/`.env.example`로 분리할 항목을 확정해 백엔드 `pg Pool` 설정(BE-1)이 그대로 참조하도록 한다.

**의존성**: 없음 (최초 착수 가능)

**완료 조건**
- [x] PostgreSQL 17 서버가 기동 중이며 접속이 성공한다 (`psql` CLI 미설치 환경이므로 `postgresql-mcp` 도구의 `pg_debug_database(issue=connection)`로 동등 검증, status: ok).
- [x] TodoList 전용 데이터베이스(`todolist_dev`)와 전용 접속 계정(`todolist_app`)이 생성되어 있다.
- [x] `pgcrypto` 확장(`gen_random_uuid()`) 활성화 권한을 확인했다 (`todolist_dev`에 확장 생성 및 `gen_random_uuid()` 기반 PK 정상 동작 확인).
- [x] `DATABASE_URL` 등 접속정보 키 목록이 확정되어 백엔드 `.env.example`에 전달 가능하다 (`backend/.env`, `backend/.env.example`에 `POSTGRES_CONNECTION_STRING`/`PORT`/`JWT_SECRET` 반영).

### DB-2. database/schema.sql 실행 및 테이블/제약조건/인덱스 검증

**설명**: 기작성된 `database/schema.sql`(users/categories/todos, CHECK 제약, 인덱스)을 실제 실행하고,
도메인 규칙 3(`chk_todos_date_range`), FK 관계, unique 제약(email, owner_id+name)의 동작을 검증한다.

**의존성**: DB-1 완료

**완료 조건** (검증: [`database/tests/db-1-to-5-verification.md`](../database/tests/db-1-to-5-verification.md) TC-DB2-1~5)
- [x] `database/schema.sql` 실행이 오류 없이 완료되고 3개 테이블 생성을 확인했다 (`todolist_dev`에 적용, TC-DB2-1).
- [x] FK/CHECK/NOT NULL 제약이 스키마와 일치함을 확인했다 (`information_schema` 조회, TC-DB2-2).
- [x] `end_date < start_date` INSERT가 거부됨(도메인 규칙 3)을 확인했다 (`chk_todos_date_range` 위반, 동일 날짜는 정상 저장 확인, TC-DB2-3).
- [x] 동일 `owner_id`+동일 `name` 카테고리 중복 INSERT가 unique 위반으로 거부됨을 확인했다 (`idx_categories_owner_name`, TC-DB2-4).
- [x] `users` 삭제 시 CASCADE, `categories` 삭제 시(소속 할일 있으면) RESTRICT 동작을 확인했다 (TC-DB2-5).

### DB-3. 마이그레이션 파일 명명 규칙 확립 및 초기 마이그레이션 분리

**설명**: [`docs/4-project-structure.md`](./4-project-structure.md) 원칙(`db/migrations/*.sql` 순번 관리,
ORM 미사용)에 따라 `database/schema.sql`을 `001_init.sql` 등 순번 파일로 재구성해 `backend/src/migrations/`에 배치한다.

**의존성**: DB-2 완료

**완료 조건** (검증: TC-DB3-1~2)
- [x] `001_init.sql`(전체 스키마)로 분리되어 있다 (`backend/src/migrations/001_init.sql`; 원본에 인덱스 추가분이 없어 `002_add_index.sql`은 대상 없음으로 생략).
- [x] 각 파일 상단에 실행 순서/대상 버전을 주석으로 명시했다.
- [x] 마이그레이션 실행 명령이 백엔드가 그대로 사용할 수 있는 형태로 정리되어 있다 (`backend/src/migrations/run.js`, 콘솔 로그 기반).
- [x] 신규 환경에서 순차 실행 시 DB-2와 동일한 스키마가 재현됨을 확인했다 (임시 스키마 `db3_verify`에 재현 후 정리, TC-DB3-2).

### DB-4. '기본' 카테고리 자동 생성 정책 확정 (DB 관점 결정)

**설명**: PRD 7.3의 "설계 시 택1"을 **회원가입 트랜잭션 내 실제 `categories` 행 자동 생성** 방식으로 확정한다
(도메인 규칙 2, [`docs/6-erd.md`](./6-erd.md) 권장안). 실제 트랜잭션 코드 구현은 BE-2 소관이다.

**의존성**: DB-2 완료

**완료 조건** (검증: TC-DB4-1~2)
- [x] '기본' 카테고리는 회원가입 트랜잭션 내 실제 행 생성 방식임을 결정·문서화했다 ([`docs/decisions/DB-4-default-category-policy.md`](./decisions/DB-4-default-category-policy.md)).
- [x] 이 방식이 `(owner_id, name)` unique 제약과 충돌하지 않음을 확인했다 (트랜잭션 내 user+기본 카테고리 동시 생성 성공, TC-DB4-2).
- [x] `category_id NOT NULL + ON DELETE RESTRICT`가 "기본 카테고리 항상 존재" 전제와 정합함을 확인했다.
- [x] "회원가입 시 기본 카테고리 1건 자동 INSERT 필요", "기본 카테고리 삭제 방지는 애플리케이션에서 처리 필요"를 BE에 인터페이스 요구사항으로 전달했다 (위 결정 문서에 명시).

### DB-5. 카테고리 삭제 시 재할당 정책 검증 시나리오 수립

**설명**: 도메인 규칙 7(카테고리 삭제 시 할일은 삭제되지 않고 '기본'으로 이관)을 `ON DELETE RESTRICT` +
애플리케이션 선행 `UPDATE` 방식으로 SQL 레벨 검증 시나리오를 마련한다. 실제 구현은 BE-4 소관.

**의존성**: DB-2, DB-4 완료

**완료 조건** (검증: TC-DB5-1~5, [`database/scenarios/category-deletion-reassignment.sql`](../database/scenarios/category-deletion-reassignment.sql))
- [x] 소속 할일이 남은 카테고리 삭제 시도가 FK 위반으로 거부됨을 재확인했다 (TC-DB5-3, `todos_category_id_fkey`).
- [x] "소속 todos.category_id를 '기본' id로 UPDATE 후 카테고리 DELETE" 트랜잭션 시나리오를 직접 실행해 검증했다 (TC-DB5-2, 커밋 후 이관/삭제 확인).
- [x] 이관 대상 0건(빈 카테고리)인 경우도 오류 없이 동작함을 확인했다 (TC-DB5-4).
- [x] '기본' 카테고리 자체의 삭제 방지는 DB 제약만으로 불가능하므로 애플리케이션 처리 필요 항목으로 명시했다 (DB-4 결정 문서에 BE-4 요구사항으로 명시).
- [x] 위 트랜잭션 SQL을 BE-4의 `deleteCategory()` 구현 참고 자료로 정리했다 (`database/scenarios/category-deletion-reassignment.sql`).

### DB-6. 목록 조회 필터링(FR-8) 인덱스 성능 확인

**설명**: PRD 6.1/FR-8 기준 기존 인덱스(`idx_todos_owner_id`, `idx_todos_category_id`,
`idx_todos_owner_completed_end_date`)가 실제 조회 패턴에서 사용되는지 `EXPLAIN ANALYZE`로 확인한다.

**의존성**: DB-2 완료 (DB-7 시드 데이터가 있으면 더 유의미)

**완료 조건** (검증: [`database/tests/db-6-index-performance.md`](../database/tests/db-6-index-performance.md), 벤치마크 5만 건 규모 실측 후 데이터 정리 완료)
- [x] 대표 쿼리 3종(단독 owner, owner+category, 기한초과 조건)에 대해 `EXPLAIN ANALYZE`를 실행하고 기록했다 (TC-DB6-1~3, 각각 1.95ms/0.34ms/1.06ms).
- [x] 인덱스 스캔 사용 여부(또는 Seq Scan 사유)를 확인했다 (전 구간 Seq Scan 없이 Bitmap Index Scan만 사용됨; TC-DB6-3은 예상한 복합 인덱스 대신 `idx_todos_owner_id`가 선택됨을 확인).
- [x] "시작 전/진행중" 필터에 `start_date` 인덱스 커버리지 부족 여부를 확인하고 추가 여부를 판단했다 (TC-DB6-4~6: `start_date`는 Filter로 처리되나 추가 비용 1ms 이내로 무의미 → **추가 인덱스 불필요**로 결론, 후보 마이그레이션은 `.disabled` 상태로 보류).
- [x] 최종 인덱스 목록을 BE-6(목록 조회 쿼리) 참고 자료로 정리했다 (기존 3개 인덱스 유지 확정, 문서 5절에 BE-6 구현 참고사항 포함).

### DB-7 (선택). 로컬 개발/QA용 시드 데이터 스크립트

**설명**: 수동 QA를 위해 사용자·카테고리·4가지 상태 조합의 `todos` 샘플 데이터를 삽입하는 시드 스크립트를 작성한다
(Could 우선순위, 여유 시 진행).

**의존성**: DB-2, DB-4 완료

**완료 조건**
- [ ] 최소 1명 사용자, 카테고리 2개 이상('기본' 포함), 4가지 상태를 모두 포함한 할일이 생성된다.
- [ ] `password_hash`는 유효한 해시 형태로 저장된다.
- [ ] 재실행 시 중복 오류 없이 처리된다.
- [ ] DB-6 EXPLAIN 검증에 재활용해 결과를 재확인했다(선택).

### DB 영역 요약

| Task ID | 한줄 요약 |
|---|---|
| DB-1 | PostgreSQL 17 로컬 환경 준비 및 접속/계정 확인 |
| DB-2 | schema.sql 실행 및 제약조건/인덱스 검증 |
| DB-3 | 마이그레이션 파일 순번 분리 (001_init.sql 등) |
| DB-4 | '기본' 카테고리 자동 생성 정책 확정 (회원가입 트랜잭션 내 생성) |
| DB-5 | 카테고리 삭제 시 RESTRICT + 선행 이관 검증 시나리오 수립 |
| DB-6 | FR-8 목록 조회 인덱스 성능(EXPLAIN) 확인 |
| DB-7 (선택) | 로컬 QA용 시드 데이터 스크립트 |

---

## 2. 백엔드(BE) 영역

> 참조: [`docs/1-domain-definition.md`](./1-domain-definition.md), [`docs/2-PRD.md`](./2-PRD.md) 5~8장,
> [`docs/3-user-scenario.md`](./3-user-scenario.md), [`docs/4-project-structure.md`](./4-project-structure.md) 2.2절/7장

### BE-1. 프로젝트 초기화 및 공통 인프라 설정

**설명**: `backend/src` 하위에 `routes/controllers/services/repositories/middlewares/db/migrations/constants/config`
구조를 생성하고, `pg Pool`(`db/pool.js`), 환경변수 로드(`config/config.js`), `.env.example`, 상수 모듈을 준비한다.

**의존성**: 데이터베이스 스키마(DB-2) 준비 완료 필요. 다른 BE Task 선행 불필요(최초 착수)

**완료 조건**
- [x] project-structure.md 7장과 동일한 디렉토리 구조가 생성되어 있다 (`backend/src/{routes,controllers,services,repositories,middlewares,db,migrations,constants,config}`, `app.js`).
- [x] `.env.example`에 필요한 환경변수 키가 모두 문서화되고, 실제 `.env`는 커밋되지 않는다 (`POSTGRES_CONNECTION_STRING`/`PORT`/`JWT_SECRET`, `.gitignore`로 `.env` 제외 확인).
- [x] `db/pool.js`가 환경변수 기반으로 Pool을 생성하고 기동 시 DB 연결을 로그로 확인할 수 있다 (`verifyConnection()`, `npm start` 시 "[db] PostgreSQL 연결 확인 성공." 로그 확인).
- [x] 상태값 4종과 기본 카테고리명이 `constants/`에 상수로 정의되어 있다 (`constants/status.js`의 `TODO_STATUS`, `constants/category.js`의 `DEFAULT_CATEGORY_NAME`).
- [x] `GET /health` 등 헬스체크 엔드포인트가 200을 반환한다 (`curl http://localhost:3000/health` → `{"status":"ok"}`, `node --test` 통합 테스트로도 검증).

### BE-2. 회원가입/로그인 (인증 기본 기능)

**설명**: FR-1, FR-2(UC-1, UC-2) 구현. `user-repository.js`, `auth-service.js`(bcrypt 해싱, JWT 발급,
회원가입 트랜잭션 내 '기본' 카테고리 자동 생성 — DB-4 정책 반영, [`docs/decisions/DB-4-default-category-policy.md`](./decisions/DB-4-default-category-policy.md) 참고), `auth-controller.js`, `auth-routes.js`.

**의존성**: BE-1 완료. 데이터베이스 스키마(users/categories) 준비 완료 필요

**완료 조건**
- [ ] 회원가입 시 계정이 생성되고 비밀번호가 bcrypt 해시로 저장됨을 확인했다.
- [ ] 회원가입 성공 시 '기본' 카테고리가 자동 생성되어 있다(도메인 규칙 2).
- [ ] 이메일 중복 재가입 시도가 거부된다(FR-1, E-4).
- [ ] 올바른/틀린 자격증명에 대한 로그인 결과가 각각 정확히 처리된다(FR-2).
- [ ] 비즈니스 로직은 서비스 레이어에, SQL은 리포지토리에만 위치한다(레이어 원칙).

### BE-3. 인증 미들웨어 (JWT 검증)

**설명**: 도메인 규칙 1, FR-3에 대응하는 `auth-middleware.js` 구현. 이후 모든 보호 라우트(BE-4~BE-7)가
이 미들웨어를 통과하도록 연결한다.

**의존성**: BE-2(JWT 발급/시크릿) 완료

**완료 조건**
- [ ] 토큰 없이 보호 API 호출 시 예외 없이 401이 반환된다(FR-3, E-3).
- [ ] 만료/위조 토큰도 401로 거부된다.
- [ ] 유효 토큰은 `req.user`를 채워 컨트롤러에 전달된다.
- [ ] 인증 로직이 미들웨어 한 곳에만 존재하고 중복 구현이 없다.

### BE-4. 카테고리 CRUD 및 기본 카테고리 이관 로직

**설명**: FR-5, FR-6(UC-8, UC-9) 구현. `resolveCategoryId()`(도메인 규칙 2), `deleteCategory()`(트랜잭션 내
선행 이관 후 삭제, 도메인 규칙 7, DB-5 시나리오 반영, [`database/scenarios/category-deletion-reassignment.sql`](../database/scenarios/category-deletion-reassignment.sql) 참고), 소유권 검증(도메인 규칙 4).

**의존성**: BE-3 완료. 데이터베이스 스키마(categories/todos) 준비 완료 필요

**완료 조건**
- [ ] 카테고리 생성 즉시 목록 조회에 노출된다(FR-5).
- [ ] 기본 카테고리 미생성 사용자도 할일 등록이 정상 처리된다.
- [ ] 카테고리 삭제 시 소속 할일이 삭제되지 않고 '기본'으로 재할당됨을 확인했다(도메인 규칙 7, FR-6).
- [ ] 타 계정 소유 카테고리 접근 시 404가 반환된다(도메인 규칙 4).
- [ ] 이관+삭제가 하나의 트랜잭션으로 처리된다.

### BE-5. 할일 등록/수정/삭제 및 소유권 검증

**설명**: FR-7, FR-9, FR-10, FR-11(UC-4, UC-6, UC-7) 구현. 기간 유효성(도메인 규칙 3),
`getTodoOwnedByUser()`(도메인 규칙 4), 완료 처리 시 `is_completed`/`completed_at` 갱신.

**의존성**: BE-3, BE-4(`resolveCategoryId` 재사용) 완료. 데이터베이스 스키마(todos, CHECK 제약) 준비 완료 필요

**완료 조건**
- [ ] 카테고리 미지정 등록 시 '기본' 카테고리가 자동 적용된다(FR-7).
- [ ] 종료일자<시작일자 요청이 거부되고, 시작일=종료일은 정상 저장된다(도메인 규칙 3, E-1).
- [ ] 타 계정 소유 할일 수정/삭제 시도 시 404가 반환된다(도메인 규칙 4, E-2).
- [ ] 완료 처리/취소 시 `is_completed`/`completed_at`이 정확히 갱신된다.
- [ ] 삭제된 할일은 목록 조회에서 더 이상 반환되지 않는다.

### BE-6. 할일 목록 조회, 필터링(AND), 상태 파생 로직

**설명**: FR-8, FR-12(UC-5) 구현. `deriveTodoStatus()`가 4가지 상태를 조회 시점에 계산하며(완료 처리 시
기한 경과 무관 COMPLETED 우선, 도메인 규칙 6), 카테고리+상태 필터를 AND로 결합한다.

**의존성**: BE-5 완료. 데이터베이스 인덱스(DB-6) 준비 완료 필요

**완료 조건**
- [ ] 필터 미지정 시 소유 전체 할일이 반환된다.
- [ ] 카테고리 단독 필터, 상태 단독 필터(4종, 경계값 포함)가 각각 정확히 동작한다.
- [ ] 카테고리+상태 동시 적용 시 AND 조합 결과만 반환된다(FR-8).
- [ ] 완료 처리된 할일은 기한 경과와 무관하게 '완료'로만 표시된다(도메인 규칙 6).
- [ ] 상태 계산이 백엔드 서비스 레이어 단일 소스에만 존재한다(FR-12).

### BE-7. 계정 정보 수정 (Should)

**설명**: FR-4(UC-3) 구현. 닉네임/비밀번호 수정 API. Must 항목 완료 후 여유 시 진행.

**의존성**: BE-2, BE-3 완료. Must 항목(BE-1~BE-6) 완료 후 착수 권장

**완료 조건**
- [ ] 본인만 자신의 정보를 수정할 수 있고, 미인증 시 401이 반환된다.
- [ ] 닉네임 변경이 즉시 반영된다(FR-4).
- [ ] 비밀번호 변경 후 새 비밀번호로만 로그인된다.
- [ ] 잘못된 입력값은 저장 전 거부된다.

### BE-8. 전역 에러 처리 미들웨어 및 응답 포맷 통일

**설명**: `error-handler.js`로 서비스 에러(NotFound/Validation/Conflict 등)를 일관된 상태 코드/포맷으로 변환.

**의존성**: BE-2, BE-4, BE-5, BE-6 완료 필요

**완료 조건**
- [ ] 소유권/미존재 에러가 전역 미들웨어를 통해 일관되게 404로 변환된다.
- [ ] 유효성 검증 실패가 모두 400과 일관된 포맷으로 반환된다.
- [ ] 500 에러 시 스택 트레이스가 클라이언트에 노출되지 않는다.
- [ ] 모든 에러 응답이 동일 JSON 스키마를 따른다.
- [ ] 로그에 비밀번호/토큰 원문이 남지 않는다.

### BE-9. 핵심 비즈니스 로직 단위 테스트

**설명**: project-structure.md 4장 원칙에 따라 `deriveTodoStatus()`(및 여유 시 소유권 검증)에 대한 최소 단위 테스트.

**의존성**: BE-6 완료 (소유권 테스트 추가 시 BE-5 필요)

**완료 조건**
- [ ] NOT_STARTED 케이스가 테스트로 검증된다.
- [ ] IN_PROGRESS(경계값 포함) 케이스가 검증된다.
- [ ] COMPLETED(기한 경과 무관) 케이스가 검증된다(도메인 규칙 6).
- [ ] OVERDUE 케이스가 검증된다.
- [ ] 전체 테스트가 `npm test`로 통과한다.

### 백엔드 영역 요약

| Task ID | 한줄 요약 |
|---|---|
| BE-1 | Express 프로젝트 골격, pg Pool, config/.env 초기화 |
| BE-2 | 회원가입/로그인 API 및 기본 카테고리 자동 생성 |
| BE-3 | JWT 인증 미들웨어 (미인증 401 차단) |
| BE-4 | 카테고리 CRUD 및 삭제 시 기본 카테고리 자동 이관 |
| BE-5 | 할일 등록/수정/삭제 및 소유권 기반 404 처리 |
| BE-6 | 할일 목록 조회 + AND 필터 + 상태 파생 로직 |
| BE-7 | 계정 정보 수정 (Should) |
| BE-8 | 전역 에러 처리 및 응답 포맷 통일 |
| BE-9 | 상태 파생 로직 단위 테스트 |

---

## 3. 프론트엔드(FE) 영역

> 참조: [`docs/2-PRD.md`](./2-PRD.md) 3장/5장/7.1절/7.4절, [`docs/3-user-scenario.md`](./3-user-scenario.md),
> [`docs/4-project-structure.md`](./4-project-structure.md) 2.1절/6장

### FE-1. 프로젝트 셋업 및 반응형 레이아웃 골격

**설명**: React 19+TS+Vite 초기화, `components/pages/store/queries/api/types/constants/utils` 구조 구성,
Zustand·TanStack Query 초기 설정, PRD 7.4절 브레이크포인트 기준 반응형 공통 레이아웃(FR-13).

**의존성**: 없음 (최초 착수, 백엔드 서버 구동과 무관하게 착수 가능)

**완료 조건**
- [ ] 개발 서버가 정상 기동하고 빈 페이지가 렌더링된다.
- [ ] 8개 디렉토리가 모두 생성되어 있다.
- [ ] Zustand 스토어와 `QueryClientProvider`가 콘솔 에러 없이 로드된다.
- [ ] 데스크톱/모바일(약 375px) 양쪽에서 공통 레이아웃이 가로 스크롤 없이 표시된다.
- [ ] 라우팅 골격에서 페이지 전환이 정상 동작한다.

### FE-2. API 클라이언트 레이어 구축

**설명**: `src/api/`(fetch 래퍼, 토큰 첨부, 에러 포맷 통일), `src/types/`(User/Category/Todo/TodoStatus,
도메인 용어 그대로), `src/constants/`(상태 4종, 기본 카테고리명) 구현.

**의존성**: FE-1 완료. 백엔드 API 엔드포인트/요청·응답 스키마(BE-2 이후) 확정 필요(Mock으로 우선 착수 가능)

**완료 조건**
- [ ] fetch 래퍼가 토큰을 `Authorization` 헤더에 자동 첨부한다.
- [ ] 401/404/400 에러가 일관된 형태로 파싱된다.
- [ ] 타입 정의가 도메인 정의서 3장 속성과 1:1 매핑된다.
- [ ] 상태 상수/기본 카테고리명이 `constants/`에 정의되어 매직 문자열이 없다.
- [ ] 백엔드(또는 Mock) 대상 헬스체크 API 호출이 정상 수신된다.

### FE-3. 회원가입/로그인 화면

**설명**: FR-1, FR-2(UC-1, UC-2) 구현. 로그인 성공 시 토큰을 Zustand `authStore`에 저장하고 목록 화면으로 이동.

**의존성**: FE-1, FE-2 완료. 백엔드 회원가입/로그인 API(BE-2) 준비 필요

**완료 조건**
- [ ] 정상 회원가입 후 로그인 화면으로 이동한다.
- [ ] 이메일 중복 시 에러 메시지가 표시되고 이동하지 않는다.
- [ ] 올바른 로그인 시 토큰 저장 후 목록 화면 진입, 틀린 자격증명은 에러 표시된다.
- [ ] 모바일(약 375px)에서 폼이 가로 스크롤 없이 조작 가능하다.
- [ ] 미로그인 상태로 보호 페이지 접근 시 로그인 화면으로 리다이렉트된다.

### FE-4. 할일 등록/수정 폼 (캘린더 기반 기간 선택)

**설명**: FR-7, FR-9(UC-4, UC-6) 구현. 캘린더로 시작일/종료일 선택, 클라이언트 1차 유효성 검증(도메인 규칙 3),
완료 처리/취소 토글, 성공 시 목록 쿼리 무효화.

**의존성**: FE-2, FE-3 완료. 백엔드 할일 등록/수정 API(BE-5), 카테고리 목록 API(BE-4) 준비 필요

**완료 조건**
- [ ] 카테고리 미지정 등록도 성공하고 '기본' 카테고리로 노출된다.
- [ ] 종료일<시작일 선택 시 등록 전 에러가 표시된다.
- [ ] 캘린더로 날짜 선택이 정상 반영된다.
- [ ] 완료 처리 토글 저장 시 목록에 완료 상태로 반영된다.
- [ ] 등록/수정 성공 시 새로고침 없이 목록에 최신 데이터가 반영된다.
- [ ] 모바일(약 375px)에서 폼 전체가 가로 스크롤 없이 조작 가능하다.

### FE-5. 할일 목록 화면 + 카테고리/상태 필터 UI

**설명**: FR-8(UC-5, 7장) 구현. 필터 선택값은 Zustand, 목록 데이터는 TanStack Query로 분리 관리, AND 조합 조회.

**의존성**: FE-2, FE-3 완료(FE-4와 병행 가능). 백엔드 목록 조회 API(BE-6, 필터 쿼리 파라미터 지원) 준비 필요

**완료 조건**
- [ ] 필터 미지정 시 전체 목록이 노출된다.
- [ ] 카테고리+상태 동시 선택 시 AND 조건 결과만 노출된다.
- [ ] 상태 4종 각각 단독 필터링이 정확히 동작한다.
- [ ] 필터 해제 시 전체 목록으로 복원된다.
- [ ] 필터값(Zustand)과 목록 데이터(TanStack Query)가 분리 저장되어 있다.
- [ ] 모바일(약 375px)에서 필터/목록이 가로 스크롤 없이 동작한다.

### FE-6. 카테고리 관리 UI (생성/수정/삭제)

**설명**: FR-5, FR-6(UC-8, UC-9) 구현. 삭제 시 '기본' 이관 안내 문구 포함.

**의존성**: FE-2, FE-3 완료(FE-4/FE-5와 카테고리 목록 쿼리 공유, 병행 가능). 백엔드 카테고리 CRUD API(BE-4) 준비 필요

**완료 조건**
- [ ] 생성 직후 목록/필터에 즉시 노출된다.
- [ ] 이름 수정이 즉시 반영된다.
- [ ] 삭제 시 확인 UI가 노출되고 확인 후에만 삭제된다.
- [ ] 카테고리 삭제 후 소속 할일이 '기본'으로 표시됨을 확인한다.
- [ ] 카테고리 미생성 신규 계정도 카테고리 미지정 등록이 가능하다.

### FE-7. 할일 삭제 (확인 UX 포함)

**설명**: FR-10(UC-7) 구현. 확인 모달, 성공 시 목록 쿼리 무효화, 404 시 사용자 친화적 에러 처리(도메인 규칙 4).

**의존성**: FE-5 완료. 백엔드 삭제 API(BE-5) 준비 필요

**완료 조건**
- [ ] 삭제 버튼 클릭 시 확인 모달이 노출되고 취소 시 삭제되지 않는다.
- [ ] 확인 후 삭제 성공 시 목록에서 즉시 사라진다.
- [ ] 404 응답 시 "항목을 찾을 수 없음" 메시지가 표시되고 크래시하지 않는다.
- [ ] 모바일(약 375px)에서 삭제/확인 모달이 가로 스크롤 없이 동작한다.

### FE-8. 계정 정보 수정 화면 (Should)

**설명**: FR-4(UC-3) 구현. Must 항목 완료 후 여유 시 진행.

**의존성**: FE-3 완료. Must 항목(FE-1~FE-7) 완료 후 착수 권장. 백엔드 계정 수정 API(BE-7) 준비 필요

**완료 조건**
- [ ] 닉네임 변경이 새로고침 없이 즉시 반영된다.
- [ ] 비밀번호 변경 후 새 비밀번호로 재로그인이 가능하다.
- [ ] 필수 항목 누락 시 저장 전 에러가 표시된다.
- [ ] 모바일(약 375px)에서 폼이 가로 스크롤 없이 조작 가능하다.

### FE-9. 폼 유효성 검증 UI 피드백 및 반응형/크로스 브라우저 QA (Should/선택)

**설명**: FR-14 대응 및 FR-13 최종 점검. 각 폼의 에러 메시지 통일, 3개 브레이크포인트·2개 브라우저 수동 점검.

**의존성**: FE-3, FE-4, FE-6, FE-8 완료. 백엔드 의존 없음(통합 마무리 점검)

**완료 조건**
- [ ] 필수 항목 누락 시 각 폼에서 인라인 에러가 표시되고 제출이 차단된다.
- [ ] 에러 메시지 스타일이 공용 컴포넌트로 일관 적용된다.
- [ ] 3개 브레이크포인트(375px/768~1023px/1024px+)에서 핵심 조작이 가로 스크롤 없이 가능하다.
- [ ] Chrome/Edge 등 2개 브라우저에서 핵심 시나리오(로그인→등록→필터→수정→삭제)가 정상 동작한다.

### 프론트엔드 영역 요약

| Task ID | 한줄 요약 |
|---|---|
| FE-1 | 프로젝트 셋업, 디렉토리 구조, Zustand/TanStack Query 초기화, 반응형 골격 |
| FE-2 | API 클라이언트, 도메인 타입, 상수 정의 |
| FE-3 | 회원가입/로그인 화면 |
| FE-4 | 캘린더 기반 할일 등록/수정 폼 |
| FE-5 | 할일 목록 + 카테고리/상태 필터(AND) UI |
| FE-6 | 카테고리 생성/수정/삭제 UI |
| FE-7 | 할일 삭제(확인 UX) |
| FE-8 | 계정 정보 수정 화면 (Should) |
| FE-9 | 폼 유효성 피드백 통일 및 반응형/크로스 브라우저 QA (Should/선택) |

---

## 4. 전체 Task 총괄

| 영역 | Task 수 | Must 대응 | Should/선택 |
|---|---|---|---|
| DB | 7개 (DB-1~7) | DB-1~6 | DB-7 |
| 백엔드 | 9개 (BE-1~9) | BE-1~6, BE-8~9 | BE-7 |
| 프론트엔드 | 9개 (FE-1~9) | FE-1~7 | FE-8~9 |
| **합계** | **25개** | | |

본 실행계획은 [`docs/2-PRD.md`](./2-PRD.md) 8장의 2일 일정(Day1: DB/인증/CRUD API, Day2: 프론트엔드/필터링/QA/배포)에
맞춰 순서대로 착수하며, 문서(도메인 정의서/PRD/project-structure.md)와 상충하는 경우 본 문서를 즉시 수정한다.
