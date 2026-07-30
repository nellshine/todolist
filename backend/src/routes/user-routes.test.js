/**
 * /users/me 라우트 HTTP 레벨 통합 테스트 (BE-7)
 *
 * auth-routes.test.js/category-routes.test.js의 패턴(Node 내장 http 모듈로 임시 포트에 앱 기동)을 그대로 재사용한다.
 */
const test = require('node:test');
const { describe, after } = test;
const assert = require('node:assert');
const http = require('node:http');
const { createApp } = require('../app');
const { pool } = require('../db/pool');

const TEST_EMAIL_PREFIX = 'be7-test-route-';

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

async function signupAndLogin(server, suffix, password = 'Password123!') {
  const email = uniqueEmail(suffix);
  await request(server, {
    method: 'POST',
    path: '/auth/signup',
    body: { email, password, nickname: 'BE7라우트테스트' },
  });

  const { body } = await request(server, {
    method: 'POST',
    path: '/auth/login',
    body: { email, password },
  });

  return { token: body.token, email };
}

describe('GET/PATCH /users/me (BE-7)', () => {
  after(async () => {
    await pool.query("DELETE FROM users WHERE email LIKE $1", [`${TEST_EMAIL_PREFIX}%`]);
    await pool.end();
  });

  test('Authorization 헤더 없이 GET /users/me 호출 시 401을 반환한다', async () => {
    const app = createApp();
    const server = app.listen(0);
    try {
      await signupAndLogin(server, 'no-token');

      const { statusCode } = await request(server, {
        method: 'GET',
        path: '/users/me',
      });

      assert.strictEqual(statusCode, 401);
    } finally {
      server.close();
    }
  });

  test('토큰으로 GET /users/me 호출 시 200과 nickname을 반환한다', async () => {
    const app = createApp();
    const server = app.listen(0);
    try {
      const { token } = await signupAndLogin(server, 'get');

      const { statusCode, body } = await request(server, {
        method: 'GET',
        path: '/users/me',
        token,
      });

      assert.strictEqual(statusCode, 200);
      assert.strictEqual(body.nickname, 'BE7라우트테스트');
    } finally {
      server.close();
    }
  });

  test('PATCH /users/me로 nickname 변경 시 200과 갱신된 nickname을 반환한다(FR-4)', async () => {
    const app = createApp();
    const server = app.listen(0);
    try {
      const { token } = await signupAndLogin(server, 'nickname');

      const { statusCode, body } = await request(server, {
        method: 'PATCH',
        path: '/users/me',
        token,
        body: { nickname: '새닉네임' },
      });

      assert.strictEqual(statusCode, 200);
      assert.strictEqual(body.nickname, '새닉네임');
    } finally {
      server.close();
    }
  });

  test('PATCH /users/me로 비밀번호 변경 후 기존 비밀번호 로그인은 401, 새 비밀번호 로그인은 200을 반환한다', async () => {
    const app = createApp();
    const server = app.listen(0);
    try {
      const { token, email } = await signupAndLogin(server, 'password');

      const { statusCode } = await request(server, {
        method: 'PATCH',
        path: '/users/me',
        token,
        body: { password: 'NewPassword456!' },
      });

      assert.strictEqual(statusCode, 200);

      const oldLogin = await request(server, {
        method: 'POST',
        path: '/auth/login',
        body: { email, password: 'Password123!' },
      });
      assert.strictEqual(oldLogin.statusCode, 401);

      const newLogin = await request(server, {
        method: 'POST',
        path: '/auth/login',
        body: { email, password: 'NewPassword456!' },
      });
      assert.strictEqual(newLogin.statusCode, 200);
      assert.strictEqual(typeof newLogin.body.token, 'string');
    } finally {
      server.close();
    }
  });

  test('PATCH /users/me에 빈 body를 보내면 400(MISSING_REQUIRED_FIELD)을 반환한다', async () => {
    const app = createApp();
    const server = app.listen(0);
    try {
      const { token } = await signupAndLogin(server, 'empty-body');

      const { statusCode, body } = await request(server, {
        method: 'PATCH',
        path: '/users/me',
        token,
        body: {},
      });

      assert.strictEqual(statusCode, 400);
      assert.strictEqual(body.code, 'MISSING_REQUIRED_FIELD');
    } finally {
      server.close();
    }
  });

  test('PATCH /users/me에 공백 nickname을 보내면 400(INVALID_NICKNAME)을 반환한다', async () => {
    const app = createApp();
    const server = app.listen(0);
    try {
      const { token } = await signupAndLogin(server, 'blank-nickname');

      const { statusCode, body } = await request(server, {
        method: 'PATCH',
        path: '/users/me',
        token,
        body: { nickname: '   ' },
      });

      assert.strictEqual(statusCode, 400);
      assert.strictEqual(body.code, 'INVALID_NICKNAME');
    } finally {
      server.close();
    }
  });

  test('PATCH /users/me에 8자 미만 password를 보내면 400(INVALID_PASSWORD)을 반환한다', async () => {
    const app = createApp();
    const server = app.listen(0);
    try {
      const { token } = await signupAndLogin(server, 'short-password');

      const { statusCode, body } = await request(server, {
        method: 'PATCH',
        path: '/users/me',
        token,
        body: { password: 'short' },
      });

      assert.strictEqual(statusCode, 400);
      assert.strictEqual(body.code, 'INVALID_PASSWORD');
    } finally {
      server.close();
    }
  });
});
