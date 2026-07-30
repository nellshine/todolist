/**
 * todo-service 테스트 (BE-5)
 *
 * (A) deriveTodoStatus()는 순수 함수 단위 테스트(DB 불필요, today를 명시적으로 주입해 결정적으로 검증).
 * (B) 나머지 CRUD는 실제 DB(todolist_dev)에 직접 접속하는 통합 테스트다.
 * ORM/모킹 없이 pg.Pool을 그대로 사용한다(project-structure.md 5장 원칙, category-service.test.js 패턴 재사용).
 */
const test = require('node:test');
const { describe, after } = test;
const assert = require('node:assert');

const { pool } = require('../db/pool');
const authService = require('../services/auth-service');
const categoryService = require('../services/category-service');
const todoService = require('./todo-service');
const { TODO_STATUS } = require('../constants/status');
const { NotFoundError, ValidationError } = require('../errors');

const TEST_EMAIL_PREFIX = 'be5-test-svc-';
const BE6_TEST_EMAIL_PREFIX = 'be6-test-svc-';

function uniqueEmail(suffix) {
  return `${TEST_EMAIL_PREFIX}${suffix}-${Date.now()}-${Math.floor(Math.random() * 100000)}@example.com`;
}

async function createOwner(suffix) {
  const email = uniqueEmail(suffix);
  const user = await authService.signup({
    email,
    password: 'Password123!',
    nickname: 'BE5테스트',
  });
  return user.id;
}

function be6UniqueEmail(suffix) {
  return `${BE6_TEST_EMAIL_PREFIX}${suffix}-${Date.now()}-${Math.floor(Math.random() * 100000)}@example.com`;
}

async function be6CreateOwner(suffix) {
  const email = be6UniqueEmail(suffix);
  const user = await authService.signup({
    email,
    password: 'Password123!',
    nickname: 'BE6테스트',
  });
  return user.id;
}

/** today 기준 상대 일수(offset)만큼 이동한 YYYY-MM-DD 문자열을 반환한다. */
function daysFromToday(offset) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

describe('deriveTodoStatus() (BE-5, 도메인 정의서 4장/규칙6)', () => {
  const today = new Date(Date.UTC(2026, 6, 15)); // 2026-07-15

  test('완료되지 않았고 오늘 < 시작일이면 NOT_STARTED를 반환한다', () => {
    const status = todoService.deriveTodoStatus(
      { is_completed: false, start_date: '2026-07-20', end_date: '2026-07-25' },
      today
    );
    assert.strictEqual(status, TODO_STATUS.NOT_STARTED);
  });

  test('완료되지 않았고 시작일 = 오늘(경계값)이면 IN_PROGRESS를 반환한다', () => {
    const status = todoService.deriveTodoStatus(
      { is_completed: false, start_date: '2026-07-15', end_date: '2026-07-25' },
      today
    );
    assert.strictEqual(status, TODO_STATUS.IN_PROGRESS);
  });

  test('완료되지 않았고 오늘 = 종료일(경계값)이면 IN_PROGRESS를 반환한다', () => {
    const status = todoService.deriveTodoStatus(
      { is_completed: false, start_date: '2026-07-10', end_date: '2026-07-15' },
      today
    );
    assert.strictEqual(status, TODO_STATUS.IN_PROGRESS);
  });

  test('완료되지 않았고 오늘 > 종료일이면 OVERDUE를 반환한다', () => {
    const status = todoService.deriveTodoStatus(
      { is_completed: false, start_date: '2026-07-01', end_date: '2026-07-10' },
      today
    );
    assert.strictEqual(status, TODO_STATUS.OVERDUE);
  });

  test('완료 처리된 할일은 종료일이 지났어도 항상 COMPLETED를 반환한다(도메인 규칙 6)', () => {
    const status = todoService.deriveTodoStatus(
      { is_completed: true, start_date: '2026-07-01', end_date: '2026-07-10' },
      today
    );
    assert.strictEqual(status, TODO_STATUS.COMPLETED);
  });
});

describe('listTodos() (BE-6, 카테고리+상태 AND 필터링)', () => {
  /**
   * 한 owner 아래에 4가지 파생 상태를 갖는 todo를 각각 하나씩 생성한다.
   * - notStarted: start/end 둘 다 미래 → NOT_STARTED
   * - inProgress: start=오늘, end=미래 → IN_PROGRESS
   * - overdue: start/end 둘 다 과거 + 미완료 → OVERDUE
   * - completed: start/end 둘 다 과거 + isCompleted:true → COMPLETED(도메인 규칙 6: 기한초과여도 COMPLETED 우선)
   */
  async function seedFourStatusTodos(ownerId, categoryId) {
    const base = { ownerId, ...(categoryId ? { categoryId } : {}) };

    const notStarted = await todoService.createTodo({
      ...base,
      title: 'NOT_STARTED 테스트',
      startDate: daysFromToday(10),
      endDate: daysFromToday(20),
    });

    const inProgress = await todoService.createTodo({
      ...base,
      title: 'IN_PROGRESS 테스트',
      startDate: daysFromToday(0),
      endDate: daysFromToday(10),
    });

    const overdue = await todoService.createTodo({
      ...base,
      title: 'OVERDUE 테스트',
      startDate: daysFromToday(-20),
      endDate: daysFromToday(-10),
    });

    const completedRaw = await todoService.createTodo({
      ...base,
      title: 'COMPLETED 테스트(기한초과 상태였던 것)',
      startDate: daysFromToday(-30),
      endDate: daysFromToday(-20),
    });
    const completed = await todoService.updateTodo({
      id: completedRaw.id,
      ownerId,
      fields: { isCompleted: true },
      hasCategoryIdKey: false,
    });

    return { notStarted, inProgress, overdue, completed };
  }

  test('필터 없이 listTodos({ownerId}) 호출 시 4가지 상태의 todo가 모두 반환된다', async () => {
    const ownerId = await be6CreateOwner('no-filter');
    const seeded = await seedFourStatusTodos(ownerId);

    const result = await todoService.listTodos({ ownerId });

    assert.strictEqual(result.length, 4);
    const ids = result.map((t) => t.id).sort();
    const expectedIds = [seeded.notStarted.id, seeded.inProgress.id, seeded.overdue.id, seeded.completed.id].sort();
    assert.deepStrictEqual(ids, expectedIds);
  });

  test('categoryId만 필터링하면 해당 카테고리 소속 todo만 반환된다', async () => {
    const ownerId = await be6CreateOwner('category-only');
    const otherCategory = await categoryService.createCategory({ ownerId, name: '다른카테고리' });

    await todoService.createTodo({
      ownerId,
      title: '기본 카테고리 할일',
      startDate: daysFromToday(0),
      endDate: daysFromToday(5),
    });
    const otherCategoryTodo = await todoService.createTodo({
      ownerId,
      categoryId: otherCategory.id,
      title: '다른 카테고리 할일',
      startDate: daysFromToday(0),
      endDate: daysFromToday(5),
    });

    const result = await todoService.listTodos({ ownerId, categoryId: otherCategory.id });

    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].id, otherCategoryTodo.id);
    assert.strictEqual(result[0].categoryId, otherCategory.id);
  });

  test('status만 필터링하면 파생 상태가 일치하는 todo만 반환된다(4종 개별, 도메인 규칙 6 재확인)', async () => {
    const ownerId = await be6CreateOwner('status-only');
    const seeded = await seedFourStatusTodos(ownerId);

    const notStartedResult = await todoService.listTodos({ ownerId, status: TODO_STATUS.NOT_STARTED });
    assert.strictEqual(notStartedResult.length, 1);
    assert.strictEqual(notStartedResult[0].id, seeded.notStarted.id);

    const inProgressResult = await todoService.listTodos({ ownerId, status: TODO_STATUS.IN_PROGRESS });
    assert.strictEqual(inProgressResult.length, 1);
    assert.strictEqual(inProgressResult[0].id, seeded.inProgress.id);

    const overdueResult = await todoService.listTodos({ ownerId, status: TODO_STATUS.OVERDUE });
    assert.strictEqual(overdueResult.length, 1);
    assert.strictEqual(overdueResult[0].id, seeded.overdue.id);
    assert.notStrictEqual(overdueResult[0].id, seeded.completed.id);

    const completedResult = await todoService.listTodos({ ownerId, status: TODO_STATUS.COMPLETED });
    assert.strictEqual(completedResult.length, 1);
    assert.strictEqual(completedResult[0].id, seeded.completed.id);
    assert.strictEqual(completedResult[0].status, TODO_STATUS.COMPLETED);
  });

  test('categoryId+status를 함께 지정하면 AND 조건(교집합)만 반환된다', async () => {
    const ownerId = await be6CreateOwner('category-and-status');
    const categoryA = await categoryService.createCategory({ ownerId, name: '카테고리A' });
    const categoryB = await categoryService.createCategory({ ownerId, name: '카테고리B' });

    const inProgressInA = await todoService.createTodo({
      ownerId,
      categoryId: categoryA.id,
      title: 'A - IN_PROGRESS',
      startDate: daysFromToday(0),
      endDate: daysFromToday(5),
    });
    await todoService.createTodo({
      ownerId,
      categoryId: categoryA.id,
      title: 'A - NOT_STARTED',
      startDate: daysFromToday(10),
      endDate: daysFromToday(20),
    });
    await todoService.createTodo({
      ownerId,
      categoryId: categoryB.id,
      title: 'B - IN_PROGRESS',
      startDate: daysFromToday(0),
      endDate: daysFromToday(5),
    });

    const result = await todoService.listTodos({
      ownerId,
      categoryId: categoryA.id,
      status: TODO_STATUS.IN_PROGRESS,
    });

    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].id, inProgressInA.id);
  });

  test('status에 TODO_STATUS 값이 아닌 문자열을 넘기면 ValidationError(400)를 던진다', async () => {
    const ownerId = await be6CreateOwner('invalid-status');

    await assert.rejects(
      async () => {
        await todoService.listTodos({ ownerId, status: 'INVALID' });
      },
      (error) => {
        assert.ok(error instanceof ValidationError);
        assert.strictEqual(error.statusCode, 400);
        return true;
      }
    );
  });

  test('타 소유자의 categoryId로 필터링하면 에러 없이 빈 배열을 반환한다(소유권 검증 없이 WHERE절로 자연히 걸러짐)', async () => {
    const owner1Id = await be6CreateOwner('owner1');
    const owner2Id = await be6CreateOwner('owner2');

    const owner2Categories = await categoryService.listCategories(owner2Id);
    const owner2DefaultCategoryId = owner2Categories.find((c) => c.isDefault).id;

    await todoService.createTodo({
      ownerId: owner1Id,
      title: '소유자1 할일',
      startDate: daysFromToday(0),
      endDate: daysFromToday(5),
    });

    const result = await todoService.listTodos({ ownerId: owner1Id, categoryId: owner2DefaultCategoryId });

    assert.deepStrictEqual(result, []);
  });
});

describe('todo-service CRUD 및 소유권 검증 (BE-5)', () => {
  after(async () => {
    await pool.query("DELETE FROM users WHERE email LIKE $1", [`${TEST_EMAIL_PREFIX}%`]);
    await pool.query("DELETE FROM users WHERE email LIKE $1", [`${BE6_TEST_EMAIL_PREFIX}%`]);
    await pool.end();
  });

  test('categoryId 미지정으로 createTodo() 호출 시 owner의 "기본" 카테고리 id가 자동 적용된다(BE-4 이월 조건 재확인)', async () => {
    const ownerId = await createOwner('default-category');
    const categories = await categoryService.listCategories(ownerId);
    const defaultCategory = categories.find((c) => c.isDefault);

    const created = await todoService.createTodo({
      ownerId,
      title: '기본 카테고리 테스트',
      startDate: '2026-08-01',
      endDate: '2026-08-05',
    });

    assert.strictEqual(created.categoryId, defaultCategory.id);
  });

  test('startDate > endDate로 createTodo() 호출 시 ValidationError(400)를 던진다', async () => {
    const ownerId = await createOwner('invalid-range');

    await assert.rejects(
      async () => {
        await todoService.createTodo({
          ownerId,
          title: '기간 역전 테스트',
          startDate: '2026-08-10',
          endDate: '2026-08-05',
        });
      },
      (error) => {
        assert.ok(error instanceof ValidationError);
        assert.strictEqual(error.statusCode, 400);
        return true;
      }
    );
  });

  test('startDate === endDate로 createTodo() 호출 시 정상 생성된다', async () => {
    const ownerId = await createOwner('same-date');

    const created = await todoService.createTodo({
      ownerId,
      title: '당일 할일',
      startDate: '2026-08-01',
      endDate: '2026-08-01',
    });

    assert.ok(created.id);
    assert.strictEqual(created.startDate instanceof Date ? created.startDate.toISOString().slice(0, 10) : String(created.startDate).slice(0, 10), '2026-08-01');
  });

  test('getTodo()로 방금 생성한 todo를 조회하면 필드가 일치한다', async () => {
    const ownerId = await createOwner('get');

    const created = await todoService.createTodo({
      ownerId,
      title: '조회 테스트',
      description: '설명입니다',
      startDate: '2026-08-01',
      endDate: '2026-08-05',
    });

    const found = await todoService.getTodo({ id: created.id, ownerId });

    assert.strictEqual(found.id, created.id);
    assert.strictEqual(found.ownerId, ownerId);
    assert.strictEqual(found.title, '조회 테스트');
    assert.strictEqual(found.description, '설명입니다');
    assert.strictEqual(found.categoryId, created.categoryId);
  });

  test('타 소유자 id로 getTodo()/updateTodo()/deleteTodo() 호출 시 각각 NotFoundError(404)를 던진다(도메인 규칙 4)', async () => {
    const owner1Id = await createOwner('owner1');
    const owner2Id = await createOwner('owner2');

    const created = await todoService.createTodo({
      ownerId: owner1Id,
      title: '소유자1 할일',
      startDate: '2026-08-01',
      endDate: '2026-08-05',
    });

    await assert.rejects(
      async () => {
        await todoService.getTodo({ id: created.id, ownerId: owner2Id });
      },
      (error) => {
        assert.ok(error instanceof NotFoundError);
        assert.strictEqual(error.statusCode, 404);
        return true;
      }
    );

    await assert.rejects(
      async () => {
        await todoService.updateTodo({
          id: created.id,
          ownerId: owner2Id,
          fields: { title: '침해시도' },
          hasCategoryIdKey: false,
        });
      },
      (error) => {
        assert.ok(error instanceof NotFoundError);
        assert.strictEqual(error.statusCode, 404);
        return true;
      }
    );

    await assert.rejects(
      async () => {
        await todoService.deleteTodo({ id: created.id, ownerId: owner2Id });
      },
      (error) => {
        assert.ok(error instanceof NotFoundError);
        assert.strictEqual(error.statusCode, 404);
        return true;
      }
    );
  });

  test('updateTodo()로 isCompleted:true 수정 시 completedAt이 채워지고, false로 되돌리면 다시 null이 된다', async () => {
    const ownerId = await createOwner('complete-toggle');
    const created = await todoService.createTodo({
      ownerId,
      title: '완료 토글 테스트',
      startDate: '2026-08-01',
      endDate: '2026-08-05',
    });

    const completed = await todoService.updateTodo({
      id: created.id,
      ownerId,
      fields: { isCompleted: true },
      hasCategoryIdKey: false,
    });

    assert.strictEqual(completed.isCompleted, true);
    assert.notStrictEqual(completed.completedAt, null);
    assert.ok(completed.completedAt);

    const reverted = await todoService.updateTodo({
      id: created.id,
      ownerId,
      fields: { isCompleted: false },
      hasCategoryIdKey: false,
    });

    assert.strictEqual(reverted.isCompleted, false);
    assert.strictEqual(reverted.completedAt, null);
  });

  test('updateTodo()로 기존 종료일보다 늦은 시작일만 변경하면 병합 검증으로 400을 던진다', async () => {
    const ownerId = await createOwner('merge-validation');
    const created = await todoService.createTodo({
      ownerId,
      title: '병합 검증 테스트',
      startDate: '2026-08-01',
      endDate: '2026-08-05',
    });

    await assert.rejects(
      async () => {
        await todoService.updateTodo({
          id: created.id,
          ownerId,
          fields: { startDate: '2026-08-10' },
          hasCategoryIdKey: false,
        });
      },
      (error) => {
        assert.ok(error instanceof ValidationError);
        assert.strictEqual(error.statusCode, 400);
        return true;
      }
    );
  });

  test('deleteTodo() 이후 같은 id로 getTodo() 호출 시 NotFoundError(404)를 던진다', async () => {
    const ownerId = await createOwner('delete');
    const created = await todoService.createTodo({
      ownerId,
      title: '삭제 테스트',
      startDate: '2026-08-01',
      endDate: '2026-08-05',
    });

    await todoService.deleteTodo({ id: created.id, ownerId });

    await assert.rejects(
      async () => {
        await todoService.getTodo({ id: created.id, ownerId });
      },
      (error) => {
        assert.ok(error instanceof NotFoundError);
        assert.strictEqual(error.statusCode, 404);
        return true;
      }
    );
  });
});
