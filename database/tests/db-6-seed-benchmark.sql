-- =========================================================
-- DB-6 벤치마크 전용 임시 시드 데이터
-- =========================================================
-- 목적:
--   목록 조회(FR-8) 인덱스(idx_todos_owner_id, idx_todos_category_id,
--   idx_todos_owner_completed_end_date)가 실제로 옵티마이저에게 선택되는지
--   EXPLAIN ANALYZE로 확인하기 위해, 옵티마이저가 인덱스 스캔을 고려할 만큼
--   충분한 규모(수만 건)의 todos 데이터를 생성한다.
--
-- 주의:
--   - 이 스크립트가 생성하는 데이터는 DB-6 성능 벤치마크 전용 "임시" 데이터이며,
--     DB-7에서 별도로 준비되는 정식 시드 데이터(seed data)와는 무관하다.
--   - 검증(EXPLAIN ANALYZE 확인)이 끝나면 반드시 본 파일 하단의
--     "정리(cleanup) SQL" 섹션을 실행하여 이 스크립트가 만든 데이터를 모두
--     삭제해야 한다. bench-user-% 패턴 사용자 및 그에 연결된 categories/todos만
--     대상으로 하므로, 운영/개발용 실데이터가 이미 존재하더라도 영향을 주지 않는다.
--   - 실행은 오케스트레이터(postgresql-mcp 도구)가 수행하며, 본 파일은 SQL 내용만 제공한다.
--
-- 타겟 유저 (EXPLAIN 쿼리에서 owner_id 필터 조건으로 사용할 사용자):
--   email = 'bench-user-1@example.com'
--   이 사용자는 20명 중 유일하게 todos가 집중적으로 몰리도록 설계되어 있다(약 3,000~5,000건).
--   EXPLAIN 실행 전, 아래 쿼리로 실제 UUID를 조회해서 사용할 것:
--     SELECT id FROM users WHERE email = 'bench-user-1@example.com';
--
-- =========================================================
-- 1) users 20명 생성
-- =========================================================
INSERT INTO users (email, password_hash, nickname)
SELECT
    'bench-user-' || g || '@example.com',
    '$2b$10$abcdefghijklmnopqrstuvABCDEFGHIJKLMNOPQ',
    'bench' || g
FROM generate_series(1, 20) AS g;

-- =========================================================
-- 2) categories: 유저당 3개 ('기본', '업무', '개인')
-- =========================================================
INSERT INTO categories (owner_id, name)
SELECT u.id, c.name
FROM users u
CROSS JOIN (VALUES ('기본'), ('업무'), ('개인')) AS c(name)
WHERE u.email LIKE 'bench-user-%@example.com';

-- =========================================================
-- 3) todos 5만 건 이상 생성
-- =========================================================
-- 분포 설계:
--   - 타겟 유저(bench-user-1@example.com)에게 todos의 상당 비율(약 4,000건)을 집중시켜
--     "특정 사용자의 목록 조회" 시나리오에서 인덱스 효과를 뚜렷하게 관찰할 수 있게 한다.
--   - 나머지 46,000건은 나머지 19명의 유저에게 고르게 분산시킨다.
--   - 총 50,000건.
--
-- 상태(도메인 정의서 4장: 시작전/진행중/완료/기한초과) 조합은 생성 순번(g)에 대한
-- modulo 4 연산으로 4가지 케이스에 고르게 분배한다. 각 케이스에서
-- start_date <= end_date (CHECK 제약 chk_todos_date_range)를 항상 만족하도록
-- 날짜를 계산한다. 오늘 날짜는 CURRENT_DATE 기준으로 상대 계산한다.
--
--   case 0 (시작전)   : start_date, end_date 모두 미래.       is_completed = false
--   case 1 (진행중)   : start_date 과거~오늘, end_date 미래.  is_completed = false
--   case 2 (완료)     : start_date, end_date 모두 과거~오늘.  is_completed = true, completed_at 존재
--   case 3 (기한초과) : start_date, end_date 모두 과거.       is_completed = false (오늘 기준 초과)

-- 3-1) 타겟 유저(bench-user-1) 전용 4,000건
WITH target_user AS (
    SELECT id AS owner_id
    FROM users
    WHERE email = 'bench-user-1@example.com'
),
target_categories AS (
    SELECT c.id AS category_id, row_number() OVER (ORDER BY c.id) AS rn
    FROM categories c
    JOIN target_user tu ON tu.owner_id = c.owner_id
)
INSERT INTO todos (owner_id, category_id, title, description, start_date, end_date, is_completed, completed_at)
SELECT
    tu.owner_id,
    tc.category_id,
    'bench todo target ' || g,
    'DB-6 벤치마크용 임시 데이터 (타겟 유저)',
    CASE (g % 4)
        WHEN 0 THEN CURRENT_DATE + ((g % 30) + 1)
        WHEN 1 THEN CURRENT_DATE - ((g % 30) + 1)
        WHEN 2 THEN CURRENT_DATE - ((g % 60) + 30)
        ELSE CURRENT_DATE - ((g % 60) + 60)
    END AS start_date,
    CASE (g % 4)
        WHEN 0 THEN CURRENT_DATE + ((g % 30) + 31)
        WHEN 1 THEN CURRENT_DATE + ((g % 30) + 1)
        WHEN 2 THEN CURRENT_DATE - ((g % 30))
        ELSE CURRENT_DATE - ((g % 30) + 1)
    END AS end_date,
    CASE (g % 4) WHEN 2 THEN true ELSE false END AS is_completed,
    CASE (g % 4) WHEN 2 THEN now() ELSE NULL END AS completed_at
FROM generate_series(1, 4000) AS g
CROSS JOIN target_user tu
JOIN target_categories tc ON tc.rn = ((g % 3) + 1);

-- 3-2) 나머지 19명 유저에게 46,000건 분산
WITH other_users AS (
    SELECT id AS owner_id, row_number() OVER (ORDER BY id) AS rn
    FROM users
    WHERE email LIKE 'bench-user-%@example.com'
      AND email <> 'bench-user-1@example.com'
),
other_user_count AS (
    SELECT count(*) AS cnt FROM other_users
),
other_categories AS (
    SELECT c.id AS category_id, c.owner_id, row_number() OVER (PARTITION BY c.owner_id ORDER BY c.id) AS rn
    FROM categories c
    JOIN other_users ou ON ou.owner_id = c.owner_id
)
INSERT INTO todos (owner_id, category_id, title, description, start_date, end_date, is_completed, completed_at)
SELECT
    ou.owner_id,
    oc.category_id,
    'bench todo other ' || g,
    'DB-6 벤치마크용 임시 데이터 (분산 유저)',
    CASE (g % 4)
        WHEN 0 THEN CURRENT_DATE + ((g % 30) + 1)
        WHEN 1 THEN CURRENT_DATE - ((g % 30) + 1)
        WHEN 2 THEN CURRENT_DATE - ((g % 60) + 30)
        ELSE CURRENT_DATE - ((g % 60) + 60)
    END AS start_date,
    CASE (g % 4)
        WHEN 0 THEN CURRENT_DATE + ((g % 30) + 31)
        WHEN 1 THEN CURRENT_DATE + ((g % 30) + 1)
        WHEN 2 THEN CURRENT_DATE - ((g % 30))
        ELSE CURRENT_DATE - ((g % 30) + 1)
    END AS end_date,
    CASE (g % 4) WHEN 2 THEN true ELSE false END AS is_completed,
    CASE (g % 4) WHEN 2 THEN now() ELSE NULL END AS completed_at
FROM generate_series(1, 46000) AS g
CROSS JOIN other_user_count
JOIN other_users ou ON ou.rn = ((g % (SELECT cnt FROM other_user_count)) + 1)
JOIN other_categories oc ON oc.owner_id = ou.owner_id AND oc.rn = ((g % 3) + 1);

-- =========================================================
-- 4) 통계 갱신 (옵티마이저가 최신 통계 기반으로 계획을 세우도록)
-- =========================================================
ANALYZE todos;
ANALYZE categories;
ANALYZE users;


-- =========================================================
-- 정리(cleanup) SQL — 벤치마크 검증 완료 후 반드시 실행할 것
-- =========================================================
-- 실행 순서: todos -> categories -> users (FK 의존 관계 역순)
-- bench-user-%@example.com 패턴의 사용자 및 그에 연결된 데이터만 삭제한다.

-- DELETE FROM todos
-- WHERE owner_id IN (
--     SELECT id FROM users WHERE email LIKE 'bench-user-%@example.com'
-- );

-- DELETE FROM categories
-- WHERE owner_id IN (
--     SELECT id FROM users WHERE email LIKE 'bench-user-%@example.com'
-- );

-- DELETE FROM users
-- WHERE email LIKE 'bench-user-%@example.com';

-- 정리 후에는 통계도 다시 갱신해 둔다.
-- ANALYZE todos;
-- ANALYZE categories;
-- ANALYZE users;
