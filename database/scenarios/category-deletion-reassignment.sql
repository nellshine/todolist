-- =========================================================
-- 카테고리 삭제 재할당 검증 시나리오 (DB-5)
--
-- 목적: 도메인 규칙 7("카테고리 삭제 시 소속 할일은 삭제되지 않고 '기본' 카테고리로
--       이관되어야 한다")이 현재 스키마(todos.category_id NOT NULL + ON DELETE RESTRICT)와
--       애플리케이션 트랜잭션 조합으로 정확히 구현 가능한지 검증하기 위한 시나리오 모음이다.
--
-- 전제: DB-4 정책(docs/decisions/DB-4-default-category-policy.md)에 따라 모든 사용자는
--       회원가입 시점에 실제 '기본' 카테고리 행을 이미 보유하고 있으며, 삭제 대상이 될 수 없는
--       '기본' 카테고리가 항상 최소 1건 존재한다고 전제한다.
--
-- 참고 대상: 이 파일의 트랜잭션 SQL은 BE-4 `category-service.js`의 `deleteCategory(categoryId, userId)`
--            구현 시 그대로 참고할 수 있도록 작성되었다. 실제 구현에서는 아래 :placeholder를
--            파라미터 바인딩(prepared statement)으로 치환한다.
-- =========================================================


-- ---------------------------------------------------------
-- 시나리오 A: 소속 할일이 있는 카테고리 삭제
--   - 삭제 대상 카테고리(:target_category_id)에 속한 할일을 먼저 '기본' 카테고리
--     (:default_category_id)로 UPDATE한 뒤, 카테고리 행을 DELETE한다.
--   - 두 문장은 반드시 하나의 트랜잭션으로 묶여야 한다(원자성 보장, 도메인 규칙 7).
--   - :user_id 조건으로 소유권을 검증하여 타 사용자 데이터에 영향을 주지 않는다(도메인 규칙 4).
-- ---------------------------------------------------------
BEGIN;

UPDATE todos
SET category_id = :default_category_id
WHERE owner_id = :user_id
  AND category_id = :target_category_id;

DELETE FROM categories
WHERE id = :target_category_id
  AND owner_id = :user_id;

COMMIT;


-- ---------------------------------------------------------
-- 시나리오 B: 선행 UPDATE 없이 바로 DELETE를 시도하는 경우 (실패해야 정상)
--   - 소속 할일이 남아있는 상태에서 UPDATE 없이 카테고리를 DELETE하면
--     todos.category_id → categories.id의 FK 제약(ON DELETE RESTRICT)에 의해
--     "update or delete on table categories violates foreign key constraint" 오류로 거부된다.
--   - 즉 애플리케이션이 선행 UPDATE를 누락하더라도 데이터 무결성(할일이 고아 참조가 되는 상황)은
--     DB 레벨에서 보호되지만, 사용자 입장에서는 삭제 자체가 실패하는 것으로 나타나므로
--     BE-4는 반드시 시나리오 A의 순서(UPDATE 선행 → DELETE)를 지켜야 한다.
--
-- BEGIN;
-- DELETE FROM categories
-- WHERE id = :target_category_id
--   AND owner_id = :user_id;
-- -- 기대 결과: ERROR: update or delete on table "categories" violates foreign key
-- --           constraint "todos_category_id_fkey" on table "todos"
-- ROLLBACK;
-- ---------------------------------------------------------


-- ---------------------------------------------------------
-- 시나리오 C: 이관 대상이 0건(빈 카테고리)인 경우
--   - 삭제 대상 카테고리에 소속된 할일이 하나도 없는 경우에도 동일한 트랜잭션 구조(UPDATE 후 DELETE)를
--     그대로 사용할 수 있다. UPDATE 문이 매칭되는 행이 없어 0 rows affected로 끝나더라도 오류가 발생하지
--     않으며, 이어지는 DELETE는 정상적으로 수행되고 COMMIT까지 문제 없이 완료된다.
--   - 즉 BE-4는 "소속 할일 존재 여부"를 사전에 분기 처리할 필요 없이 항상 동일한 코드 경로
--     (UPDATE → DELETE)를 사용하면 된다.
-- ---------------------------------------------------------
BEGIN;

UPDATE todos
SET category_id = :default_category_id
WHERE owner_id = :user_id
  AND category_id = :target_category_id;
-- 소속 할일이 없다면 0 rows affected (오류 아님)

DELETE FROM categories
WHERE id = :target_category_id
  AND owner_id = :user_id;

COMMIT;


-- ---------------------------------------------------------
-- 시나리오 D: '기본' 카테고리 자체를 삭제 대상으로 지정하는 경우
--   - :target_category_id가 사용자의 '기본' 카테고리 id와 동일한 경우, 위 트랜잭션 구조만으로는
--     삭제를 막을 수 없다. '기본' 카테고리에 소속된 할일이 없다면 UPDATE는 0 rows affected로
--     끝나고, 뒤이은 DELETE도 FK 위반 없이 그대로 성공해버려 '기본' 카테고리 자체가 삭제될 수 있다.
--   - 즉 "기본 카테고리는 삭제할 수 없다"는 제약은 DB 스키마(FK/CHECK/UNIQUE)만으로는 표현할 수 없다.
--   - 따라서 애플리케이션(category-service.js)의 deleteCategory()에서 DELETE를 실행하기 전에
--     "삭제 대상 category.name === '기본'"(또는 사용자의 기본 카테고리 id와 동일한지) 여부를 반드시
--     확인하여 거부해야 한다.
--   - 상세 근거: docs/decisions/DB-4-default-category-policy.md
-- ---------------------------------------------------------


-- =========================================================
-- BE-4 deleteCategory() 구현 참고사항 요약
--   1. 트랜잭션 경계: UPDATE(재할당) → DELETE(카테고리 삭제)를 반드시 하나의 트랜잭션
--      (BEGIN ~ COMMIT)으로 묶는다. 실패 시 ROLLBACK하여 부분 반영을 방지한다.
--   2. 파라미터 바인딩: userId(:user_id), categoryId(:target_category_id),
--      defaultCategoryId(:default_category_id) 3개 값을 prepared statement 파라미터로
--      바인딩해야 한다(문자열 조합 금지, SQL Injection 방지).
--   3. 소유권 검증 필수: UPDATE/DELETE 양쪽 모두 WHERE owner_id = :user_id 조건을 포함하여
--      타 사용자 소유 데이터에 영향을 주지 않도록 한다(도메인 규칙 4).
--   4. '기본' 카테고리 자체 삭제 방지: DELETE 실행 전 애플리케이션 레벨에서 대상이 '기본'
--      카테고리인지 확인하여 거부 처리한다(시나리오 D 참고).
-- =========================================================
