# 결정: 기본 카테고리 자동 생성 정책

버전: 1.0 / 작성일: 2026-07-29

## 결정 사항

회원가입(FR-1) 트랜잭션 내에서 `categories` 테이블에 `name = '기본'`인 **실제 행을 INSERT하는 방식**을
채택한다. 애플리케이션 레벨에서 "카테고리가 없으면 암묵적으로 기본 카테고리인 것처럼 처리"하는 암묵적 처리
방식은 채택하지 않는다.

## 근거

- 도메인 정의서(`docs/1-domain-definition.md`) 규칙 2: 모든 할일은 카테고리를 가지며, 카테고리 미지정 시
  '기본' 카테고리가 적용되어야 한다.
- `docs/6-erd.md` 보충설명("'기본' 카테고리의 존재 방식" 항목): 회원가입(FR-1) 트랜잭션 안에서 실제 '기본'
  행을 자동 생성해두는 방식이 이관 로직(도메인 규칙 7)을 별도 분기 없이 일반 카테고리와 동일한 `UPDATE`
  문으로 처리할 수 있게 한다.
- `todos.category_id`가 `NOT NULL` + `ON DELETE RESTRICT` 제약을 가지므로, 할일은 항상 유효하게 존재하는
  카테고리를 참조해야 한다. 실제 행이 없는 암묵적 '기본' 카테고리로는 이 FK 제약을 만족시킬 수 없다.

## `(owner_id, name)` unique 제약과의 정합성

`idx_categories_owner_name`(UNIQUE, `owner_id`+`name`)과 충돌하지 않는다. 신규 가입 사용자는 회원가입
시점에 아직 어떤 카테고리도 보유하지 않은 상태이며, 트랜잭션 내에서 해당 사용자 소유의 '기본' 카테고리
1건만 최초로 생성하므로 동일 사용자 내 이름 중복이 발생하지 않는다.

## 백엔드(BE) 전달 인터페이스 요구사항

1. **회원가입 시 기본 카테고리 1건 자동 INSERT 필요 (BE-2)**: `auth-service.js`의 회원가입 처리 트랜잭션
   내에서 `users` 행 생성과 함께 `owner_id`를 해당 사용자로 하는 `name='기본'` 카테고리 행을 함께
   INSERT해야 한다.
2. **기본 카테고리 자체의 삭제 방지는 DB 제약만으로 불가능하므로 애플리케이션(category-service.js)에서
   방지 로직 필요 (BE-4)**: DB 스키마는 특정 카테고리 행을 "삭제 불가"로 표시하는 제약을 제공하지 않으므로,
   `category-service.js`의 `deleteCategory(categoryId, userId)`가 삭제 대상이 '기본' 카테고리인지 여부를
   애플리케이션 레벨에서 판별하여 거부해야 한다.

## 관련 문서

- [`docs/6-erd.md`](../6-erd.md)
- [`docs/7-execution-plan.md`](../7-execution-plan.md)
- [`database/scenarios/category-deletion-reassignment.sql`](../../database/scenarios/category-deletion-reassignment.sql)
