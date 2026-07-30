/**
 * /todos 라우트 HTTP 레벨 통합 테스트 (BE-5)
 *
 * auth-routes.test.js/category-routes.test.js의 패턴(Node 내장 http 모듈로 임시 포트에 앱 기동)을
 * 그대로 재사용한다. GET /todos(목록)는 BE-6 범위이므로 이 파일에서는 다루지 않는다.
 */
const test = require('node:test');
const { describe, after } = test;
const assert = require('node:assert');
const http = require('node:http');
const { createApp } = require('../app');
const { pool } = require('../db/pool');

const TEST_EMAIL_PREFIX = 'be5-test-route-';
const BE6_TEST_EMAIL_PREFIX = 'be6-test-route-';

function uniqueEmail(suffix) {
  return `${TEST_EMAIL_PREFIX}${suffix}-${Date.now()}-${Math.floor(Math.random() * 100000)}@example.com`;
}

function be6UniqueEmail(suffix) {
  return `${BE6_TEST_EMAIL_PREFIX}${suffix}-${Date.now()}-${Math.floor(Math.random() * 100000)}@example.com`;
}

/** today 기준 상대 일수(offset)만큼 이동한 YYYY-MM-DD 문자열을 반환한다. */
function daysFromToday(offset) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

function request(server, { method, path, body, token }) {
  return new Promise((resolve, reject) => {
    const { port } = server.address();
    const payload = body ? JSON.stringify(body) : undefined;

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          let parsedBody;
          try {
            parsedBody = data ? JSON.parse(data) : undefined;
          } catch (err) {
            parsedBody = data;
          }
          resolve({ statusCode: res.statusCode, body: parsedBody });
        });
      }
    );

    req.on('error', reject);
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

async function signupAndLogin(server, suffix) {
  const email = uniqueEmail(suffix);
  const password = 'Password123!';
  await request(server, {
    method: 'POST',
    path: '/auth/signup',
    body: { email, password, nickname: 'BE5라우트테스트' },
  });

  const { body } = await request(server, {
    method: 'POST',
    path: '/auth/login',
    body: { email, password },
  });

  return body.token;
}

async function getDefaultCategoryId(server, token) {
  const { body } = await request(server, {
    method: 'GET',
    path: '/categories',
    token,
  });
  const defaultCategory = body.find((c) => c.isDefault);
  return defaultCategory.id;
}

async function be6SignupAndLogin(server, suffix) {
  const email = be6UniqueEmail(suffix);
  const password = 'Password123!';
  await request(server, {
    method: 'POST',
    path: '/auth/signup',
    body: { email, password, nickname: 'BE6라우트테스트' },
  });

  const { body } = await request(server, {
    method: 'POST',
    path: '/auth/login',
    body: { email, password },
  });

  return body.token;
}

async function createCategory(server, token, name) {
  const { body } = await request(server, {
    method: 'POST',
    path: '/categories',
    token,
    body: { name },
  });
  return body;
}

describe('GET /todos (BE-6)', () => {
  test('필터 없이 GET /todos 요청 시 200과 생성한 개수만큼의 배열을 반환한다', async () => {
    const app = createApp();
    const server = app.listen(0);
    try {
      const token = await be6SignupAndLogin(server, 'no-filter');

      await request(server, {
        method: 'POST',
        path: '/todos',
        token,
        body: { title: '할일1', startDate: daysFromToday(0), endDate: daysFromToday(5) },
      });
      await request(server, {
        method: 'POST',
        path: '/todos',
        token,
        body: { title: '할일2', startDate: daysFromToday(10), endDate: daysFromToday(20) },
      });

      const { statusCode, body } = await request(server, {
        method: 'GET',
        path: '/todos',
        token,
      });

      assert.strictEqual(statusCode, 200);
      assert.ok(Array.isArray(body));
      assert.strictEqual(body.length, 2);
    } finally {
      server.close();
    }
  });

  test('GET /todos?categoryId=...로 요청 시 해당 카테고리 소속 todo만 반환한다', async () => {
    const app = createApp();
    const server = app.listen(0);
    try {
      const token = await be6SignupAndLogin(server, 'category-filter');
      const otherCategory = await createCategory(server, token, '다른카테고리');

      await request(server, {
        method: 'POST',
        path: '/todos',
        token,
        body: { title: '기본 카테고리 할일', startDate: daysFromToday(0), endDate: daysFromToday(5) },
      });
      const otherCategoryTodo = await request(server, {
        method: 'POST',
        path: '/todos',
        token,
        body: {
          title: '다른 카테고리 할일',
          categoryId: otherCategory.id,
          startDate: daysFromToday(0),
          endDate: daysFromToday(5),
        },
      });

      const { statusCode, body } = await request(server, {
        method: 'GET',
        path: `/todos?categoryId=${otherCategory.id}`,
        token,
      });

      assert.strictEqual(statusCode, 200);
      assert.strictEqual(body.length, 1);
      assert.strictEqual(body[0].id, otherCategoryTodo.body.id);
    } finally {
      server.close();
    }
  });

  test('GET /todos?status=OVERDUE로 요청 시 기한이 지난 미완료 todo만 반환하고, 완료 처리한 todo는 제외한다(도메인 규칙 6)', async () => {
    const app = createApp();
    const server = app.listen(0);
    try {
      const token = await be6SignupAndLogin(server, 'status-overdue');

      const overdueTodo = await request(server, {
        method: 'POST',
        path: '/todos',
        token,
        body: { title: '기한초과 할일', startDate: daysFromToday(-20), endDate: daysFromToday(-10) },
      });

      const completedRaw = await request(server, {
        method: 'POST',
        path: '/todos',
        token,
        body: { title: '완료 처리된 기한초과 할일', startDate: daysFromToday(-20), endDate: daysFromToday(-10) },
      });
      await request(server, {
        method: 'PATCH',
        path: `/todos/${completedRaw.body.id}`,
        token,
        body: { isCompleted: true },
      });

      const { statusCode, body } = await request(server, {
        method: 'GET',
        path: '/todos?status=OVERDUE',
        token,
      });

      assert.strictEqual(statusCode, 200);
      assert.strictEqual(body.length, 1);
      assert.strictEqual(body[0].id, overdueTodo.body.id);
    } finally {
      server.close();
    }
  });

  test('GET /todos?status=INVALID_VALUE로 요청 시 400을 반환한다', async () => {
    const app = createApp();
    const server = app.listen(0);
    try {
      const token = await be6SignupAndLogin(server, 'status-invalid');

      const { statusCode } = await request(server, {
        method: 'GET',
        path: '/todos?status=INVALID_VALUE',
        token,
      });

      assert.strictEqual(statusCode, 400);
    } finally {
      server.close();
    }
  });

  test('인증 없이 GET /todos 호출 시 401을 반환한다', async () => {
    const app = createApp();
    const server = app.listen(0);
    try {
      const { statusCode } = await request(server, {
        method: 'GET',
        path: '/todos',
      });

      assert.strictEqual(statusCode, 401);
    } finally {
      server.close();
    }
  });
});

describe('POST /todos, GET/PATCH/DELETE /todos/:todoId (BE-5)', () => {
  after(async () => {
    await pool.query("DELETE FROM users WHERE email LIKE $1", [`${TEST_EMAIL_PREFIX}%`]);
    await pool.query("DELETE FROM users WHERE email LIKE $1", [`${BE6_TEST_EMAIL_PREFIX}%`]);
    await pool.end();
  });

  test('회원가입+로그인 토큰으로 POST /todos 요청 시(categoryId 생략) 201과 "기본" 카테고리 id를 반환한다', async () => {
    const app = createApp();
    const server = app.listen(0);
    try {
      const token = await signupAndLogin(server, 'create');
      const defaultCategoryId = await getDefaultCategoryId(server, token);

      const { statusCode, body } = await request(server, {
        method: 'POST',
        path: '/todos',
        token,
        body: { title: '라우트 테스트 할일', startDate: '2026-08-01', endDate: '2026-08-05' },
      });

      assert.strictEqual(statusCode, 201);
      assert.ok(body.id);
      assert.strictEqual(body.categoryId, defaultCategoryId);
    } finally {
      server.close();
    }
  });

  test('endDate < startDate로 POST /todos 요청 시 400을 반환한다', async () => {
    const app = createApp();
    const server = app.listen(0);
    try {
      const token = await signupAndLogin(server, 'invalid-range');

      const { statusCode } = await request(server, {
        method: 'POST',
        path: '/todos',
        token,
        body: { title: '기간 역전 테스트', startDate: '2026-08-10', endDate: '2026-08-05' },
      });

      assert.strictEqual(statusCode, 400);
    } finally {
      server.close();
    }
  });

  test('GET /todos/:todoId로 방금 생성한 todo를 조회하면 200과 status 필드를 반환한다', async () => {
    const app = createApp();
    const server = app.listen(0);
    try {
      const token = await signupAndLogin(server, 'get');

      const created = await request(server, {
        method: 'POST',
        path: '/todos',
        token,
        body: { title: '조회 테스트', startDate: '2026-08-01', endDate: '2026-08-05' },
      });

      const { statusCode, body } = await request(server, {
        method: 'GET',
        path: `/todos/${created.body.id}`,
        token,
      });

      assert.strictEqual(statusCode, 200);
      assert.strictEqual(body.id, created.body.id);
      assert.ok(body.status);
    } finally {
      server.close();
    }
  });

  test('PATCH /todos/:todoId로 isCompleted:true 수정 시 200과 isCompleted:true를 반환한다', async () => {
    const app = createApp();
    const server = app.listen(0);
    try {
      const token = await signupAndLogin(server, 'update');

      const created = await request(server, {
        method: 'POST',
        path: '/todos',
        token,
        body: { title: '완료 처리 테스트', startDate: '2026-08-01', endDate: '2026-08-05' },
      });

      const { statusCode, body } = await request(server, {
        method: 'PATCH',
        path: `/todos/${created.body.id}`,
        token,
        body: { isCompleted: true },
      });

      assert.strictEqual(statusCode, 200);
      assert.strictEqual(body.isCompleted, true);
    } finally {
      server.close();
    }
  });

  test('타 사용자 토큰으로 DELETE /todos/:todoId 요청 시 404를 반환한다(도메인 규칙 4)', async () => {
    const app = createApp();
    const server = app.listen(0);
    try {
      const ownerToken = await signupAndLogin(server, 'owner1');
      const otherToken = await signupAndLogin(server, 'owner2');

      const created = await request(server, {
        method: 'POST',
        path: '/todos',
        token: ownerToken,
        body: { title: '소유자1 할일', startDate: '2026-08-01', endDate: '2026-08-05' },
      });

      const { statusCode } = await request(server, {
        method: 'DELETE',
        path: `/todos/${created.body.id}`,
        token: otherToken,
      });

      assert.strictEqual(statusCode, 404);
    } finally {
      server.close();
    }
  });

  test('인증 없이 POST /todos 호출 시 401을 반환한다', async () => {
    const app = createApp();
    const server = app.listen(0);
    try {
      const { statusCode } = await request(server, {
        method: 'POST',
        path: '/todos',
        body: { title: '인증 없는 요청', startDate: '2026-08-01', endDate: '2026-08-05' },
      });

      assert.strictEqual(statusCode, 401);
    } finally {
      server.close();
    }
  });

  test('본인 토큰으로 DELETE /todos/:todoId 요청 시 204를 반환하고, 이어서 같은 id로 GET 요청 시 404를 반환한다', async () => {
    const app = createApp();
    const server = app.listen(0);
    try {
      const token = await signupAndLogin(server, 'delete');

      const created = await request(server, {
        method: 'POST',
        path: '/todos',
        token,
        body: { title: '삭제 테스트', startDate: '2026-08-01', endDate: '2026-08-05' },
      });

      const { statusCode: deleteStatus, body: deleteBody } = await request(server, {
        method: 'DELETE',
        path: `/todos/${created.body.id}`,
        token,
      });

      assert.strictEqual(deleteStatus, 204);
      assert.strictEqual(deleteBody, undefined);

      const { statusCode: getStatus } = await request(server, {
        method: 'GET',
        path: `/todos/${created.body.id}`,
        token,
      });

      assert.strictEqual(getStatus, 404);
    } finally {
      server.close();
    }
  });
});
