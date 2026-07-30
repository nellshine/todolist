/**
 * category-service 통합 테스트 (BE-4)
 *
 * 실제 DB(todolist_dev)에 직접 접속해 카테고리 CRUD 및 기본 카테고리 이관 로직을 검증한다.
 * ORM/모킹 없이 pg.Pool을 그대로 사용한다(project-structure.md 5장 원칙, auth-service.test.js 패턴 재사용).
 */
const test = require('node:test');
const { describe, after } = test;
const assert = require('node:assert');

const { pool } = require('../db/pool');
const authService = require('./auth-service');
const categoryService = require('./category-service');
const { ConflictError, NotFoundError, ValidationError } = require('../errors');

const TEST_EMAIL_PREFIX = 'be4-test-svc-';
const DEFAULT_CATEGORY_NAME = '기본';

function uniqueEmail(suffix) {
  return `${TEST_EMAIL_PREFIX}${suffix}-${Date.now()}-${Math.floor(Math.random() * 100000)}@example.com`;
}

async function createOwner(suffix) {
  const email = uniqueEmail(suffix);
  const user = await authService.signup({
    email,
    password: 'Password123!',
    nickname: 'BE4테스트',
  });
  return user.id;
}

async function insertTodo({ ownerId, categoryId }) {
  const { rows } = await pool.query(
    `INSERT INTO todos (owner_id, category_id, title, start_date, end_date)
     VALUES ($1, $2, $3, CURRENT_DATE, CURRENT_DATE)
     RETURNING id`,
    [ownerId, categoryId, 'BE-4 테스트 할일']
  );
  return rows[0].id;
}

describe('category-service (BE-4)', () => {
  after(async () => {
    await pool.query("DELETE FROM users WHERE email LIKE $1", [`${TEST_EMAIL_PREFIX}%`]);
    await pool.end();
  });

  test('listCategories()는 가입 직후 "기본" 카테고리 1건을 isDefault=true로 포함한다', async () => {
    const ownerId = await createOwner('list');

    const categories = await categoryService.listCategories(ownerId);

    const defaultCategories = categories.filter((c) => c.name === DEFAULT_CATEGORY_NAME);
    assert.strictEqual(defaultCategories.length, 1);
    assert.strictEqual(defaultCategories[0].isDefault, true);
    assert.strictEqual(defaultCategories[0].ownerId, ownerId);
  });

  test('createCategory()로 생성한 카테고리는 즉시 listCategories()에 노출된다(FR-5)', async () => {
    const ownerId = await createOwner('create');

    const created = await categoryService.createCategory({ ownerId, name: '업무' });
    assert.ok(created.id);
    assert.strictEqual(created.name, '업무');
    assert.strictEqual(created.isDefault, false);

    const categories = await categoryService.listCategories(ownerId);
    assert.ok(categories.some((c) => c.id === created.id && c.name === '업무'));
  });

  test('createCategory()는 동일 owner+동일 name 중복 시 ConflictError(409)를 던진다', async () => {
    const ownerId = await createOwner('duplicate');
    await categoryService.createCategory({ ownerId, name: '중복카테고리' });

    await assert.rejects(
      async () => {
        await categoryService.createCategory({ ownerId, name: '중복카테고리' });
      },
      (error) => {
        assert.ok(error instanceof ConflictError);
        assert.strictEqual(error.statusCode, 409);
        assert.strictEqual(error.code, 'CATEGORY_NAME_ALREADY_EXISTS');
        return true;
      }
    );
  });

  test('updateCategory()는 성공 시 갱신된 name을 반환한다', async () => {
    const ownerId = await createOwner('update');
    const created = await categoryService.createCategory({ ownerId, name: '이전이름' });

    const updated = await categoryService.updateCategory({
      id: created.id,
      ownerId,
      name: '새이름',
    });

    assert.strictEqual(updated.id, created.id);
    assert.strictEqual(updated.name, '새이름');
  });

  test('타 소유자의 카테고리 id로 updateCategory()/deleteCategory() 호출 시 NotFoundError(404)를 던진다(도메인 규칙 4)', async () => {
    const owner1Id = await createOwner('owner1');
    const owner2Id = await createOwner('owner2');
    const created = await categoryService.createCategory({ ownerId: owner1Id, name: '소유자1카테고리' });

    await assert.rejects(
      async () => {
        await categoryService.updateCategory({ id: created.id, ownerId: owner2Id, name: '침해시도' });
      },
      (error) => {
        assert.ok(error instanceof NotFoundError);
        assert.strictEqual(error.statusCode, 404);
        return true;
      }
    );

    await assert.rejects(
      async () => {
        await categoryService.deleteCategory({ id: created.id, ownerId: owner2Id });
      },
      (error) => {
        assert.ok(error instanceof NotFoundError);
        assert.strictEqual(error.statusCode, 404);
        return true;
      }
    );
  });

  test('deleteCategory()는 소속 할일을 삭제하지 않고 "기본" 카테고리로 재할당한다(도메인 규칙 7, FR-6)', async () => {
    const ownerId = await createOwner('reassign');
    const created = await categoryService.createCategory({ ownerId, name: '프로젝트A' });
    const todoId = await insertTodo({ ownerId, categoryId: created.id });

    const categories = await categoryService.listCategories(ownerId);
    const defaultCategory = categories.find((c) => c.isDefault);

    await categoryService.deleteCategory({ id: created.id, ownerId });

    const { rows: todoRows } = await pool.query('SELECT category_id FROM todos WHERE id = $1', [todoId]);
    assert.strictEqual(todoRows.length, 1);
    assert.strictEqual(todoRows[0].category_id, defaultCategory.id);

    const { rows: categoryRows } = await pool.query('SELECT id FROM categories WHERE id = $1', [created.id]);
    assert.strictEqual(categoryRows.length, 0);
  });

  test('deleteCategory()는 소속 할일이 없는(이관 대상 0건) 카테고리도 오류 없이 삭제한다', async () => {
    const ownerId = await createOwner('empty-delete');
    const created = await categoryService.createCategory({ ownerId, name: '빈카테고리' });

    await assert.doesNotReject(async () => {
      await categoryService.deleteCategory({ id: created.id, ownerId });
    });

    const { rows } = await pool.query('SELECT id FROM categories WHERE id = $1', [created.id]);
    assert.strictEqual(rows.length, 0);
  });

  test('deleteCategory()는 "기본" 카테고리 삭제 시 ValidationError(400, DEFAULT_CATEGORY_DELETE_FORBIDDEN)를 던진다', async () => {
    const ownerId = await createOwner('default-forbidden');
    const categories = await categoryService.listCategories(ownerId);
    const defaultCategory = categories.find((c) => c.isDefault);

    await assert.rejects(
      async () => {
        await categoryService.deleteCategory({ id: defaultCategory.id, ownerId });
      },
      (error) => {
        assert.ok(error instanceof ValidationError);
        assert.strictEqual(error.statusCode, 400);
        assert.strictEqual(error.code, 'DEFAULT_CATEGORY_DELETE_FORBIDDEN');
        return true;
      }
    );
  });

  test('resolveCategoryId()는 categoryId 지정 시 소유권 검증 후 그 id를 반환하고, 타 소유자 id면 404를 던진다', async () => {
    const owner1Id = await createOwner('resolve-owner1');
    const owner2Id = await createOwner('resolve-owner2');
    const created = await categoryService.createCategory({ ownerId: owner1Id, name: '지정카테고리' });

    const resolvedId = await categoryService.resolveCategoryId({ categoryId: created.id, ownerId: owner1Id });
    assert.strictEqual(resolvedId, created.id);

    await assert.rejects(
      async () => {
        await categoryService.resolveCategoryId({ categoryId: created.id, ownerId: owner2Id });
      },
      (error) => {
        assert.ok(error instanceof NotFoundError);
        assert.strictEqual(error.statusCode, 404);
        return true;
      }
    );
  });

  test('resolveCategoryId()는 categoryId 미지정 시 해당 owner의 "기본" 카테고리 id를 반환한다(도메인 규칙 2)', async () => {
    const ownerId = await createOwner('resolve-default');
    const categories = await categoryService.listCategories(ownerId);
    const defaultCategory = categories.find((c) => c.isDefault);

    const resolvedId = await categoryService.resolveCategoryId({ categoryId: undefined, ownerId });

    assert.strictEqual(resolvedId, defaultCategory.id);
  });
});
