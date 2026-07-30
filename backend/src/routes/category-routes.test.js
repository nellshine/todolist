/**
 * /categories 라우트 HTTP 레벨 통합 테스트 (BE-4)
 *
 * auth-routes.test.js의 패턴(Node 내장 http 모듈로 임시 포트에 앱 기동)을 그대로 재사용한다.
 */
const test = require('node:test');
const { describe, after } = test;
const assert = require('node:assert');
const http = require('node:http');
const { createApp } = require('../app');
const { pool } = require('../db/pool');

const TEST_EMAIL_PREFIX = 'be4-test-route-';

function uniqueEmail(suffix) {
  return `${TEST_EMAIL_PREFIX}${suffix}-${Date.now()}-${Math.floor(Math.random() * 100000)}@example.com`;
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
    body: { email, password, nickname: 'BE4라우트테스트' },
  });

  const { body } = await request(server, {
    method: 'POST',
    path: '/auth/login',
    body: { email, password },
  });

  return body.token;
}

describe('GET/POST /categories, PATCH/DELETE /categories/:categoryId (BE-4)', () => {
  after(async () => {
    await pool.query("DELETE FROM users WHERE email LIKE $1", [`${TEST_EMAIL_PREFIX}%`]);
    await pool.end();
  });

  test('회원가입+로그인 토큰으로 POST /categories 요청 시 201과 생성된 카테고리를 반환한다', async () => {
    const app = createApp();
    const server = app.listen(0);
    try {
      const token = await signupAndLogin(server, 'create');

      const { statusCode, body } = await request(server, {
        method: 'POST',
        path: '/categories',
        token,
        body: { name: '업무' },
      });

      assert.strictEqual(statusCode, 201);
      assert.ok(body.id);
      assert.strictEqual(body.name, '업무');
    } finally {
      server.close();
    }
  });

  test('GET /categories 호출 시 방금 생성한 카테고리가 목록에 포함된다', async () => {
    const app = createApp();
    const server = app.listen(0);
    try {
      const token = await signupAndLogin(server, 'list');

      const created = await request(server, {
        method: 'POST',
        path: '/categories',
        token,
        body: { name: '업무목록' },
      });

      const { statusCode, body } = await request(server, {
        method: 'GET',
        path: '/categories',
        token,
      });

      assert.strictEqual(statusCode, 200);
      assert.ok(Array.isArray(body));
      assert.ok(body.some((c) => c.id === created.body.id && c.name === '업무목록'));
    } finally {
      server.close();
    }
  });

  test('PATCH /categories/:categoryId로 이름 수정 시 200과 갱신된 name을 반환한다', async () => {
    const app = createApp();
    const server = app.listen(0);
    try {
      const token = await signupAndLogin(server, 'update');

      const created = await request(server, {
        method: 'POST',
        path: '/categories',
        token,
        body: { name: '이전이름' },
      });

      const { statusCode, body } = await request(server, {
        method: 'PATCH',
        path: `/categories/${created.body.id}`,
        token,
        body: { name: '새이름' },
      });

      assert.strictEqual(statusCode, 200);
      assert.strictEqual(body.name, '새이름');
    } finally {
      server.close();
    }
  });

  test('타 사용자 토큰으로 DELETE /categories/:categoryId 요청 시 404를 반환한다(도메인 규칙 4)', async () => {
    const app = createApp();
    const server = app.listen(0);
    try {
      const ownerToken = await signupAndLogin(server, 'owner1');
      const otherToken = await signupAndLogin(server, 'owner2');

      const created = await request(server, {
        method: 'POST',
        path: '/categories',
        token: ownerToken,
        body: { name: '소유자1카테고리' },
      });

      const { statusCode } = await request(server, {
        method: 'DELETE',
        path: `/categories/${created.body.id}`,
        token: otherToken,
      });

      assert.strictEqual(statusCode, 404);
    } finally {
      server.close();
    }
  });

  test('Authorization 헤더 없이 GET /categories 호출 시 401을 반환한다', async () => {
    const app = createApp();
    const server = app.listen(0);
    try {
      const { statusCode } = await request(server, {
        method: 'GET',
        path: '/categories',
      });

      assert.strictEqual(statusCode, 401);
    } finally {
      server.close();
    }
  });

  test('소속 할일이 없는 카테고리를 본인 토큰으로 DELETE 요청 시 204를 반환한다', async () => {
    const app = createApp();
    const server = app.listen(0);
    try {
      const token = await signupAndLogin(server, 'delete');

      const created = await request(server, {
        method: 'POST',
        path: '/categories',
        token,
        body: { name: '삭제대상카테고리' },
      });

      const { statusCode, body } = await request(server, {
        method: 'DELETE',
        path: `/categories/${created.body.id}`,
        token,
      });

      assert.strictEqual(statusCode, 204);
      assert.strictEqual(body, undefined);
    } finally {
      server.close();
    }
  });
});
