# DB-1~DB-5 완료조건 검증 테스트 스펙

버전: 1.0 / 작성일: 2026-07-29

## 1. 개요

본 문서는 [`docs/7-execution-plan.md`](../../docs/7-execution-plan.md)의 DB-2, DB-3, DB-4, DB-5 Task
완료조건(체크박스)을 실제 데이터베이스 `todolist_dev`에 대해 검증하기 위한 테스트 케이스 명세다.

- 실행 주체: 오케스트레이터가 `postgresql-mcp` MCP 도구(`pg_execute_sql`, `pg_execute_query`,
  `pg_execute_mutation`, `pg_manage_schema` 등)로 아래 SQL을 순차 실행한다. 본 문서는 코드/스키마를
  직접 변경하지 않고, 실행 절차·SQL·기대 결과만 정의한다.
- 대상 DB: `todolist_dev` (전용 계정 `todolist_app`으로 접속 가정)
- 전제: DB-1(서버 기동/계정 생성), DB-2 1차 적용(`database/schema.sql` 실행)이 이미 완료된 상태.
- 원칙: 모든 테스트 케이스(TC)는 **테스트 전용 데이터**만 사용하며, 각 섹션 끝에 cleanup(DELETE/DROP)
  SQL을 포함해 검증 후 운영 스키마·데이터를 원상 복구한다. 테스트 전용 이메일은 각 TC 번호가 겹치지
  않도록 `tc-db2-3@example.com`처럼 케이스 번호를 포함한 고유값을 사용한다.
- 실행 순서 원칙: 같은 TC 내에서는 "데이터 준비 → 검증 SQL → 기대 결과 확인 → cleanup" 순으로 실행하고,
  cleanup은 검증 성공/실패 여부와 무관하게 반드시 수행한다(트랜잭션 오류로 세션이 abort 상태가 되면
  `ROLLBACK;` 후 cleanup을 재시도한다).

---

## 2. DB-2 검증 케이스

> 완료조건(원문, `docs/7-execution-plan.md` DB-2절):
> - [ ] `psql -f database/schema.sql` 실행이 오류 없이 완료되고 3개 테이블 생성을 확인했다.
> - [ ] FK/CHECK/NOT NULL 제약이 스키마와 일치함을 `\d` 명령으로 확인했다.
> - [ ] `end_date < start_date` INSERT가 거부됨(도메인 규칙 3)을 확인했다.
> - [ ] 동일 `owner_id`+동일 `name` 카테고리 중복 INSERT가 unique 위반으로 거부됨을 확인했다.
> - [ ] `users` 삭제 시 CASCADE, `categories` 삭제 시(소속 할일 있으면) RESTRICT 동작을 확인했다.

### TC-DB2-1: 3개 테이블 존재 확인

도구: `pg_manage_schema` (get_info / list tables 액션) 또는 `pg_execute_query`.

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('users', 'categories', 'todos')
ORDER BY table_name;
```

기대 결과: 정확히 3행(`categories`, `todos`, `users`)이 반환된다. `psql -f database/schema.sql`
자체는 CLI가 없는 환경이므로, schema.sql이 이미 적용되어 있는 현재 상태에서 위 조회로 "오류 없이
3개 테이블이 생성되었음"을 대체 확인한다.

### TC-DB2-2: FK/CHECK/NOT NULL 제약 확인

도구: `pg_execute_query`.

```sql
SELECT tc.table_name, tc.constraint_name, tc.constraint_type
FROM information_schema.table_constraints tc
WHERE tc.table_schema = 'public'
  AND tc.table_name IN ('users', 'categories', 'todos')
  AND tc.constraint_type IN ('FOREIGN KEY', 'CHECK', 'UNIQUE', 'PRIMARY KEY')
ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name;
```

기대 결과(최소 아래 항목이 존재):
- `categories`: FK `categories_owner_id_fkey`(owner_id → users.id)
- `todos`: FK `todos_owner_id_fkey`(owner_id → users.id), FK `todos_category_id_fkey`
  (category_id → categories.id), CHECK `chk_todos_date_range`
- `users`: UNIQUE `users_email_key`

NOT NULL 확인(정보성 조회, 컬럼 단위):

```sql
SELECT table_name, column_name, is_nullable, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('users', 'categories', 'todos')
ORDER BY table_name, ordinal_position;
```

기대 결과: `email`, `password_hash`, `nickname`(users), `owner_id`, `name`(categories),
`owner_id`, `category_id`, `title`, `start_date`, `end_date`, `is_completed`(todos)의
`is_nullable`이 모두 `NO`.

### TC-DB2-3: `end_date < start_date` INSERT 거부 확인

도구: `pg_execute_mutation`.

```sql
-- 선행: 테스트 전용 유저/카테고리 생성
INSERT INTO users (id, email, password_hash, nickname)
VALUES ('a0000000-0000-4000-8000-00000000db23', 'tc-db2-3@example.com', '$2b$10$abcdefghijklmnopqrstuvABCDEFGHIJKLMNOPQ', 'DB2-3테스트');

INSERT INTO categories (id, owner_id, name)
VALUES ('b0000000-0000-4000-8000-00000000db23', 'a0000000-0000-4000-8000-00000000db23', '업무');

-- 검증: end_date < start_date 인 INSERT는 거부되어야 한다
INSERT INTO todos (owner_id, category_id, title, start_date, end_date)
VALUES (
  'a0000000-0000-4000-8000-00000000db23',
  'b0000000-0000-4000-8000-00000000db23',
  '기간 역전 테스트',
  '2026-08-10',
  '2026-08-01'
);
```

기대 결과: 마지막 INSERT가 SQLSTATE `23514`(check_violation, 제약명 `chk_todos_date_range`)로 실패한다.
(참고: 같은 날짜인 `start_date = end_date`는 허용되어야 하므로, 필요 시 아래 보조 확인도 함께 수행)

```sql
-- 보조 확인: 시작일=종료일은 정상 저장되어야 한다
INSERT INTO todos (owner_id, category_id, title, start_date, end_date)
VALUES (
  'a0000000-0000-4000-8000-00000000db23',
  'b0000000-0000-4000-8000-00000000db23',
  '경계값(동일 날짜) 테스트',
  '2026-08-10',
  '2026-08-10'
);
```

기대 결과: 성공적으로 1행 INSERT.

cleanup:

```sql
DELETE FROM todos WHERE owner_id = 'a0000000-0000-4000-8000-00000000db23';
DELETE FROM categories WHERE id = 'b0000000-0000-4000-8000-00000000db23';
DELETE FROM users WHERE id = 'a0000000-0000-4000-8000-00000000db23';
```

### TC-DB2-4: 동일 `owner_id`+`name` 카테고리 중복 INSERT 거부 확인

도구: `pg_execute_mutation`.

```sql
INSERT INTO users (id, email, password_hash, nickname)
VALUES ('a0000000-0000-4000-8000-00000000db24', 'tc-db2-4@example.com', '$2b$10$abcdefghijklmnopqrstuvABCDEFGHIJKLMNOPQ', 'DB2-4테스트');

INSERT INTO categories (owner_id, name)
VALUES ('a0000000-0000-4000-8000-00000000db24', '업무');

-- 검증: 동일 owner_id + 동일 name 재삽입은 unique 위반이어야 한다
INSERT INTO categories (owner_id, name)
VALUES ('a0000000-0000-4000-8000-00000000db24', '업무');
```

기대 결과: 두 번째 INSERT가 SQLSTATE `23505`(unique_violation, 인덱스 `idx_categories_owner_name`)로 실패한다.

cleanup:

```sql
DELETE FROM categories WHERE owner_id = 'a0000000-0000-4000-8000-00000000db24';
DELETE FROM users WHERE id = 'a0000000-0000-4000-8000-00000000db24';
```

### TC-DB2-5: `users` 삭제 시 CASCADE, `categories` 삭제 시(소속 할일 있으면) RESTRICT 확인

도구: `pg_execute_mutation`.

**5-A) categories RESTRICT 확인** (소속 todo가 있는 카테고리 직접 DELETE 시도):

```sql
INSERT INTO users (id, email, password_hash, nickname)
VALUES ('a0000000-0000-4000-8000-00000000db25', 'tc-db2-5@example.com', '$2b$10$abcdefghijklmnopqrstuvABCDEFGHIJKLMNOPQ', 'DB2-5테스트');

INSERT INTO categories (id, owner_id, name)
VALUES ('b0000000-0000-4000-8000-00000000db25', 'a0000000-0000-4000-8000-00000000db25', '업무');

INSERT INTO todos (owner_id, category_id, title, start_date, end_date)
VALUES ('a0000000-0000-4000-8000-00000000db25', 'b0000000-0000-4000-8000-00000000db25', '소속 할일', '2026-08-01', '2026-08-05');

-- 검증: 소속 todo가 있는 categories 행 삭제는 RESTRICT로 거부되어야 한다
DELETE FROM categories WHERE id = 'b0000000-0000-4000-8000-00000000db25';
```

기대 결과: DELETE가 SQLSTATE `23503`(foreign_key_violation, `todos_category_id_fkey`)로 실패한다.

**5-B) users CASCADE 확인** (users 삭제 시 소속 categories/todos가 함께 삭제되는지):

```sql
-- 선행: todos가 category FK를 참조 중이므로 users 삭제 전 todos를 먼저 정리(테스트 목적상 CASCADE 경로만 검증)
DELETE FROM todos WHERE owner_id = 'a0000000-0000-4000-8000-00000000db25';

-- 검증: users 삭제 시 categories(owner_id CASCADE)가 함께 삭제되는지 확인
DELETE FROM users WHERE id = 'a0000000-0000-4000-8000-00000000db25';

SELECT COUNT(*) AS remaining_categories
FROM categories
WHERE owner_id = 'a0000000-0000-4000-8000-00000000db25';
```

기대 결과: `users` DELETE가 오류 없이 성공하고, 이어지는 SELECT의 `remaining_categories`가 `0`이다
(categories가 `ON DELETE CASCADE`로 함께 삭제됨을 의미).

cleanup: 5-B에서 이미 users/categories/todos가 모두 삭제되었으므로 잔여 데이터 없음(추가 정리 불필요).
단, 5-A 실패 검증 이후 세션이 abort 상태라면 `ROLLBACK;` 후 5-B를 별도 트랜잭션으로 이어서 실행한다.

---

## 3. DB-3 검증 케이스

> 완료조건(원문, DB-3절):
> - [ ] `001_init.sql`(전체 스키마)과 필요 시 `002_add_index.sql`로 분리되어 있다.
> - [ ] 각 파일 상단에 실행 순서/대상 버전을 주석으로 명시했다.
> - [ ] 마이그레이션 실행 명령이 백엔드가 그대로 사용할 수 있는 형태로 정리되어 있다.
> - [ ] 신규 환경에서 순차 실행 시 DB-2와 동일한 스키마가 재현됨을 확인했다.

### TC-DB3-1: 마이그레이션 파일 존재 및 상단 주석 확인 (파일시스템 확인, SQL 아님)

절차(Read/Glob 도구 사용, DB 접속 불필요):
1. `Glob` 패턴 `backend/src/migrations/*.sql`로 파일 목록을 조회한다.
2. `Read`로 `backend/src/migrations/001_init.sql`(및 존재 시 `002_add_index.sql`)의 최초 5~10줄을 확인한다.

기대 결과:
- `backend/src/migrations/001_init.sql` 파일이 존재한다.
- 파일 상단 주석에 실행 순서(예: "001번째로 실행") 및 대상 PostgreSQL 버전(예: "PostgreSQL 17")이
  명시되어 있다.
- (해당 시) `002_add_index.sql`도 동일한 형식의 상단 주석을 포함한다.

주의: 이 파일은 다른 에이전트가 작업 중이므로 본 TC는 **읽기만** 수행하고 절대 수정하지 않는다.

### TC-DB3-2: 별도 스키마에서 001_init.sql 재현 검증

목적: 신규 환경에서 001_init.sql을 순차 실행하면 DB-2와 동일한 3개 테이블/제약/인덱스가 재현되는지
확인한다. **운영 스키마(`public`)를 건드리지 않기 위해 임시 스키마 `db3_verify`를 사용하고,
검증 후 반드시 DROP한다.**

도구: `pg_manage_schema`(스키마 생성/삭제) + `pg_execute_sql`(001_init.sql 내용을 임시 스키마 컨텍스트로 실행).

절차:

```sql
-- 1) 임시 스키마 생성 및 검증용 search_path 지정
CREATE SCHEMA IF NOT EXISTS db3_verify;
SET search_path TO db3_verify;
```

```sql
-- 2) 001_init.sql의 전체 내용을 그대로 실행한다.
--    (실행 전 CREATE EXTENSION IF NOT EXISTS pgcrypto; 문장이 포함되어 있다면
--     확장은 DB 전역 객체이므로 스키마 무관하게 1회만 적용되고 오류 없이 통과해야 한다.
--     001_init.sql 원문 그대로를 pg_execute_sql로 실행)
```

```sql
-- 3) 재현 결과 확인: db3_verify 스키마에 3개 테이블이 생성되었는지 확인
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'db3_verify'
  AND table_name IN ('users', 'categories', 'todos')
ORDER BY table_name;
```

기대 결과: 정확히 3행(`categories`, `todos`, `users`) 반환.

```sql
-- 4) 제약조건도 public 스키마와 동일하게 재현되는지 확인
SELECT tc.table_name, tc.constraint_type, tc.constraint_name
FROM information_schema.table_constraints tc
WHERE tc.table_schema = 'db3_verify'
  AND tc.table_name IN ('users', 'categories', 'todos')
  AND tc.constraint_type IN ('FOREIGN KEY', 'CHECK', 'UNIQUE')
ORDER BY tc.table_name, tc.constraint_type;
```

기대 결과: TC-DB2-2에서 확인한 제약 목록(개수·종류)과 동일한 패턴(`chk_todos_date_range`,
`*_owner_id_fkey`, `*_category_id_fkey`, `users_email_key` 등)이 `db3_verify` 스키마에도 존재한다.

cleanup(반드시 실행, 운영 스키마 오염 방지의 핵심 단계):

```sql
RESET search_path;
DROP SCHEMA IF EXISTS db3_verify CASCADE;
```

---

## 4. DB-4 검증 케이스

> 완료조건(원문, DB-4절):
> - [ ] '기본' 카테고리는 회원가입 트랜잭션 내 실제 행 생성 방식임을 결정·문서화했다.
> - [ ] 이 방식이 `(owner_id, name)` unique 제약과 충돌하지 않음을 확인했다.
> - [ ] `category_id NOT NULL + ON DELETE RESTRICT`가 "기본 카테고리 항상 존재" 전제와 정합함을 확인했다.
> - [ ] "회원가입 시 기본 카테고리 1건 자동 INSERT 필요", "기본 카테고리 삭제 방지는 애플리케이션에서
>       처리 필요"를 BE에 인터페이스 요구사항으로 전달했다.

### TC-DB4-1: 정책 결정 문서 존재 확인 (파일시스템 확인)

절차: `Read` 또는 `Glob`으로 `docs/decisions/DB-4-default-category-policy.md` 존재 여부를 확인한다.

기대 결과: 해당 파일이 존재하며, 아래 4개 내용을 포함한다(문서 내용 검토, SQL 아님):
1. '기본' 카테고리 = 회원가입 트랜잭션 내 실제 행 생성 방식이라는 결정
2. `(owner_id, name)` unique 제약과의 무충돌 근거
3. `category_id NOT NULL + ON DELETE RESTRICT`와의 정합성 근거
4. BE에 전달할 인터페이스 요구사항(회원가입 시 기본 카테고리 자동 INSERT 필요, 기본 카테고리
   삭제 방지는 애플리케이션 처리 필요)

주의: 이 파일은 다른 에이전트가 작업 중이므로 본 TC는 **읽기만** 수행하고 절대 생성/수정하지 않는다.

### TC-DB4-2: 회원가입 트랜잭션 내 기본 카테고리 생성이 unique 제약과 충돌하지 않음을 SQL로 재확인

도구: `pg_execute_mutation` (단일 트랜잭션으로 실행).

```sql
BEGIN;

INSERT INTO users (id, email, password_hash, nickname)
VALUES ('a0000000-0000-4000-8000-00000000db42', 'tc-db4-2@example.com', '$2b$10$abcdefghijklmnopqrstuvABCDEFGHIJKLMNOPQ', 'DB4-2테스트');

-- 회원가입 트랜잭션 내 '기본' 카테고리 자동 생성(DB-4 정책)
INSERT INTO categories (owner_id, name)
VALUES ('a0000000-0000-4000-8000-00000000db42', '기본');

COMMIT;
```

기대 결과: `BEGIN`~`COMMIT`이 오류 없이 성공하고, 신규 유저 1건과 `name='기본'` 카테고리 1건이 함께
생성된다(트랜잭션 내에서 unique 제약(`idx_categories_owner_name`)과 충돌하지 않음을 확인).

검증 조회:

```sql
SELECT u.email, c.name
FROM users u
JOIN categories c ON c.owner_id = u.id
WHERE u.id = 'a0000000-0000-4000-8000-00000000db42';
```

기대 결과: 1행, `name = '기본'`.

cleanup:

```sql
DELETE FROM categories WHERE owner_id = 'a0000000-0000-4000-8000-00000000db42';
DELETE FROM users WHERE id = 'a0000000-0000-4000-8000-00000000db42';
```

---

## 5. DB-5 검증 케이스

> 완료조건(원문, DB-5절):
> - [ ] 소속 할일이 남은 카테고리 삭제 시도가 FK 위반으로 거부됨을 재확인했다.
> - [ ] "소속 todos.category_id를 '기본' id로 UPDATE 후 카테고리 DELETE" 트랜잭션 시나리오를 직접
>       실행해 검증했다.
> - [ ] 이관 대상 0건(빈 카테고리)인 경우도 오류 없이 동작함을 확인했다.
> - [ ] '기본' 카테고리 자체의 삭제 방지는 DB 제약만으로 불가능하므로 애플리케이션 처리 필요 항목으로
>       명시했다.
> - [ ] 위 트랜잭션 SQL을 BE-4의 `deleteCategory()` 구현 참고 자료로 정리했다.

### TC-DB5-1: 테스트 데이터 준비

도구: `pg_execute_mutation`.

```sql
-- 유저 1명
INSERT INTO users (id, email, password_hash, nickname)
VALUES ('a0000000-0000-4000-8000-00000000db50', 'tc-db5@example.com', '$2b$10$abcdefghijklmnopqrstuvABCDEFGHIJKLMNOPQ', 'DB5테스트');

-- 카테고리: '기본'
INSERT INTO categories (id, owner_id, name)
VALUES ('b0000000-0000-4000-8000-00000000db50', 'a0000000-0000-4000-8000-00000000db50', '기본');

-- 카테고리: '업무' (시나리오 A에서 삭제 대상, 소속 todo 1건 보유)
INSERT INTO categories (id, owner_id, name)
VALUES ('c0000000-0000-4000-8000-00000000db50', 'a0000000-0000-4000-8000-00000000db50', '업무');

-- 카테고리: '개인' (시나리오 B용, 소속 todo 1건 보유, UPDATE 없이 바로 DELETE 시도)
INSERT INTO categories (id, owner_id, name)
VALUES ('d0000000-0000-4000-8000-00000000db50', 'a0000000-0000-4000-8000-00000000db50', '개인');

-- 카테고리: '빈카테고리' (시나리오 C용, 소속 todo 0건)
INSERT INTO categories (id, owner_id, name)
VALUES ('e0000000-0000-4000-8000-00000000db50', 'a0000000-0000-4000-8000-00000000db50', '빈카테고리');

-- '업무' 카테고리 소속 todo 1건
INSERT INTO todos (id, owner_id, category_id, title, start_date, end_date)
VALUES ('f0000000-0000-4000-8000-00000000db50', 'a0000000-0000-4000-8000-00000000db50', 'c0000000-0000-4000-8000-00000000db50', '업무 할일 A', '2026-08-01', '2026-08-10');

-- '개인' 카테고리 소속 todo 1건 (시나리오 B: RESTRICT 재확인용)
INSERT INTO todos (id, owner_id, category_id, title, start_date, end_date)
VALUES ('a1000000-0000-4000-8000-00000000db50', 'a0000000-0000-4000-8000-00000000db50', 'd0000000-0000-4000-8000-00000000db50', '개인 할일 B', '2026-08-01', '2026-08-10');
```

기대 결과: 유저 1건, 카테고리 4건('기본'/'업무'/'개인'/'빈카테고리'), todo 2건이 오류 없이 생성된다.

### TC-DB5-2: 시나리오 A — 소속 할일이 있는 '업무' 카테고리 삭제 (선행 UPDATE 후 DELETE)

목적: "소속 todos.category_id를 '기본' id로 UPDATE 후 카테고리 DELETE" 트랜잭션 시나리오를 검증한다.
이 SQL 블록 자체가 BE-4 `deleteCategory()` 구현 참고 자료다.

도구: `pg_execute_mutation` (단일 트랜잭션).

```sql
BEGIN;

-- 1) '업무' 카테고리 소속 todos를 '기본' 카테고리로 선행 이관
UPDATE todos
SET category_id = 'b0000000-0000-4000-8000-00000000db50', updated_at = now()
WHERE owner_id = 'a0000000-0000-4000-8000-00000000db50'
  AND category_id = 'c0000000-0000-4000-8000-00000000db50';

-- 2) 이관 완료 후 '업무' 카테고리 삭제
DELETE FROM categories
WHERE id = 'c0000000-0000-4000-8000-00000000db50'
  AND owner_id = 'a0000000-0000-4000-8000-00000000db50';

COMMIT;
```

검증 SQL:

```sql
-- todo의 category_id가 '기본'으로 바뀌었는지 확인
SELECT id, category_id
FROM todos
WHERE id = 'f0000000-0000-4000-8000-00000000db50';

-- '업무' 카테고리 행이 사라졌는지 확인
SELECT COUNT(*) AS remaining
FROM categories
WHERE id = 'c0000000-0000-4000-8000-00000000db50';
```

기대 결과: 첫 SELECT의 `category_id`가 `'b0000000-0000-4000-8000-00000000db50'`('기본')로 변경되어
있고, 두 번째 SELECT의 `remaining`이 `0`이다. 트랜잭션 전체가 오류 없이 COMMIT된다.

### TC-DB5-3: 시나리오 B — 선행 UPDATE 없이 바로 DELETE 시도 (FK 위반 재확인)

목적: "소속 할일이 남은 카테고리 삭제 시도가 FK 위반으로 거부됨"을 재확인한다. 대상은 TC-DB5-1에서
생성한, 소속 todo가 남아있는 '개인' 카테고리다.

도구: `pg_execute_mutation`.

```sql
DELETE FROM categories
WHERE id = 'd0000000-0000-4000-8000-00000000db50'
  AND owner_id = 'a0000000-0000-4000-8000-00000000db50';
```

기대 결과: SQLSTATE `23503`(foreign_key_violation, `todos_category_id_fkey`)로 거부된다. '개인'
카테고리와 소속 todo(`a1000000-0000-4000-8000-00000000db50`)는 그대로 남아 있어야 한다(아래 확인).

```sql
SELECT COUNT(*) AS category_exists
FROM categories
WHERE id = 'd0000000-0000-4000-8000-00000000db50';

SELECT category_id
FROM todos
WHERE id = 'a1000000-0000-4000-8000-00000000db50';
```

기대 결과: `category_exists = 1`, `todos.category_id`는 여전히 `'d0000000-0000-4000-8000-00000000db50'`
('개인').

### TC-DB5-4: 시나리오 C — 이관 대상 0건(빈 카테고리) UPDATE+DELETE가 오류 없이 커밋되는지 확인

도구: `pg_execute_mutation` (단일 트랜잭션).

```sql
BEGIN;

-- 1) '빈카테고리' 소속 todos를 '기본'으로 이관 시도 (대상 0건이어야 함)
UPDATE todos
SET category_id = 'b0000000-0000-4000-8000-00000000db50', updated_at = now()
WHERE owner_id = 'a0000000-0000-4000-8000-00000000db50'
  AND category_id = 'e0000000-0000-4000-8000-00000000db50';

-- 2) '빈카테고리' 삭제
DELETE FROM categories
WHERE id = 'e0000000-0000-4000-8000-00000000db50'
  AND owner_id = 'a0000000-0000-4000-8000-00000000db50';

COMMIT;
```

기대 결과: 1)의 UPDATE는 영향 행 0건(rowcount=0)이지만 오류 없이 성공하고, 2)의 DELETE도 1건
삭제되며 트랜잭션 전체가 오류 없이 COMMIT된다(이관 대상이 0건이어도 UPDATE 문장 자체는 정상
동작함을 확인).

검증 SQL:

```sql
SELECT COUNT(*) AS remaining
FROM categories
WHERE id = 'e0000000-0000-4000-8000-00000000db50';
```

기대 결과: `remaining = 0`.

**참고(문서화 항목, SQL 검증 대상 아님)**: '기본' 카테고리(`name='기본'`) 자체는 `category_id NOT NULL
+ ON DELETE RESTRICT`나 다른 DB 제약만으로는 삭제를 원천 차단할 수 없다(DB는 이름으로 특정 카테고리를
구분해 삭제를 막는 기능을 제공하지 않는다). 따라서 "기본 카테고리 자체의 삭제 방지"는 애플리케이션
(BE-4 `deleteCategory()`)에서 `name === '기본'`(또는 회원가입 시 생성된 기본 카테고리 id) 여부를
확인해 삭제 요청을 거부하는 방식으로 처리해야 한다.

### TC-DB5-5: 테스트 데이터 정리

도구: `pg_execute_mutation`. TC-DB5-2~4 실행 후 남아있는 데이터를 정리한다.

```sql
DELETE FROM todos WHERE owner_id = 'a0000000-0000-4000-8000-00000000db50';
DELETE FROM categories WHERE owner_id = 'a0000000-0000-4000-8000-00000000db50';
DELETE FROM users WHERE id = 'a0000000-0000-4000-8000-00000000db50';
```

기대 결과: 위 3개 DELETE 실행 후, 아래 확인 쿼리가 모두 0을 반환한다.

```sql
SELECT
  (SELECT COUNT(*) FROM users WHERE id = 'a0000000-0000-4000-8000-00000000db50') AS users_left,
  (SELECT COUNT(*) FROM categories WHERE owner_id = 'a0000000-0000-4000-8000-00000000db50') AS categories_left,
  (SELECT COUNT(*) FROM todos WHERE owner_id = 'a0000000-0000-4000-8000-00000000db50') AS todos_left;
```

---

## 6. 테스트 케이스 커버리지 매핑

### DB-2

| 완료조건 (원문) | 커버 TC |
|---|---|
| `psql -f database/schema.sql` 실행이 오류 없이 완료되고 3개 테이블 생성을 확인했다. | TC-DB2-1 |
| FK/CHECK/NOT NULL 제약이 스키마와 일치함을 `\d` 명령으로 확인했다. | TC-DB2-2 |
| `end_date < start_date` INSERT가 거부됨(도메인 규칙 3)을 확인했다. | TC-DB2-3 |
| 동일 `owner_id`+동일 `name` 카테고리 중복 INSERT가 unique 위반으로 거부됨을 확인했다. | TC-DB2-4 |
| `users` 삭제 시 CASCADE, `categories` 삭제 시(소속 할일 있으면) RESTRICT 동작을 확인했다. | TC-DB2-5 (5-A: RESTRICT, 5-B: CASCADE) |

### DB-3

| 완료조건 (원문) | 커버 TC |
|---|---|
| `001_init.sql`(전체 스키마)과 필요 시 `002_add_index.sql`로 분리되어 있다. | TC-DB3-1 |
| 각 파일 상단에 실행 순서/대상 버전을 주석으로 명시했다. | TC-DB3-1 |
| 마이그레이션 실행 명령이 백엔드가 그대로 사용할 수 있는 형태로 정리되어 있다. | TC-DB3-1 (파일 헤더 주석 내 실행 명령 확인) |
| 신규 환경에서 순차 실행 시 DB-2와 동일한 스키마가 재현됨을 확인했다. | TC-DB3-2 |

### DB-4

| 완료조건 (원문) | 커버 TC |
|---|---|
| '기본' 카테고리는 회원가입 트랜잭션 내 실제 행 생성 방식임을 결정·문서화했다. | TC-DB4-1 |
| 이 방식이 `(owner_id, name)` unique 제약과 충돌하지 않음을 확인했다. | TC-DB4-2 |
| `category_id NOT NULL + ON DELETE RESTRICT`가 "기본 카테고리 항상 존재" 전제와 정합함을 확인했다. | TC-DB4-1 (문서 검토) + TC-DB5-4 참고 항목(애플리케이션 처리 필요성 근거) |
| "회원가입 시 기본 카테고리 1건 자동 INSERT 필요", "기본 카테고리 삭제 방지는 애플리케이션에서 처리 필요"를 BE에 인터페이스 요구사항으로 전달했다. | TC-DB4-1 |

### DB-5

| 완료조건 (원문) | 커버 TC |
|---|---|
| 소속 할일이 남은 카테고리 삭제 시도가 FK 위반으로 거부됨을 재확인했다. | TC-DB5-3 |
| "소속 todos.category_id를 '기본' id로 UPDATE 후 카테고리 DELETE" 트랜잭션 시나리오를 직접 실행해 검증했다. | TC-DB5-2 |
| 이관 대상 0건(빈 카테고리)인 경우도 오류 없이 동작함을 확인했다. | TC-DB5-4 |
| '기본' 카테고리 자체의 삭제 방지는 DB 제약만으로 불가능하므로 애플리케이션 처리 필요 항목으로 명시했다. | TC-DB5-4 (참고 항목) |
| 위 트랜잭션 SQL을 BE-4의 `deleteCategory()` 구현 참고 자료로 정리했다. | TC-DB5-2 (BEGIN~COMMIT 블록 자체가 참고 자료) |

모든 DB-2~DB-5 완료조건 체크박스가 최소 1개 이상의 TC로 매핑되어 커버리지 100%를 만족한다.
