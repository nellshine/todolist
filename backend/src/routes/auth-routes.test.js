/**
 * /auth 라우트 HTTP 레벨 통합 테스트 (BE-2)
 *
 * BE-1의 health.test.js 패턴을 따라 별도 HTTP 클라이언트 라이브러리 없이
 * Node 내장 http 모듈로 임시 포트에 기동한 앱에 직접 요청한다.
 */
const test = require('node:test');
const { describe, after } = test;
const assert = require('node:assert');
const http = require('node:http');
const { createApp } = require('../app');
const { pool } = require('../db/pool');

const TEST_EMAIL_PREFIX = 'be2-test-route-';

function uniqueEmail(suffix) {
  return `${TEST_EMAIL_PREFIX}${suffix}-${Date.now()}-${Math.floor(Math.random() * 100000)}@example.com`;
}

function request(server, { method, path, body }) {
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

describe('POST /auth/signup, /auth/login (BE-2)', () => {
  after(async () => {
    await pool.query("DELETE FROM users WHERE email LIKE $1", [`${TEST_EMAIL_PREFIX}%`]);
    await pool.end();
  });

  test('POST /auth/signup에 유효한 요청을 보내면 201과 id/email을 반환한다', async () => {
    const app = createApp();
    const server = app.listen(0);
    try {
      const email = uniqueEmail('signup');
      const { statusCode, body } = await request(server, {
        method: 'POST',
        path: '/auth/signup',
        body: { email, password: 'Password123!', nickname: '테스트유저' },
      });

      assert.strictEqual(statusCode, 201);
      assert.ok(body.id);
      assert.strictEqual(body.email, email);
    } finally {
      server.close();
    }
  });

  test('POST /auth/signup에 이미 가입된 이메일로 재요청하면 409와 EMAIL_ALREADY_EXISTS를 반환한다', async () => {
    const app = createApp();
    const server = app.listen(0);
    try {
      const email = uniqueEmail('duplicate');
      await request(server, {
        method: 'POST',
        path: '/auth/signup',
        body: { email, password: 'Password123!', nickname: '테스트유저' },
      });

      const { statusCode, body } = await request(server, {
        method: 'POST',
        path: '/auth/signup',
        body: { email, password: 'Password123!', nickname: '테스트유저' },
      });

      assert.strictEqual(statusCode, 409);
      assert.strictEqual(body.code, 'EMAIL_ALREADY_EXISTS');
    } finally {
      server.close();
    }
  });

  test('POST /auth/login에 정상 자격증명을 보내면 200과 token을 반환한다', async () => {
    const app = createApp();
    const server = app.listen(0);
    try {
      const email = uniqueEmail('login');
      const password = 'Password123!';
      await request(server, {
        method: 'POST',
        path: '/auth/signup',
        body: { email, password, nickname: '테스트유저' },
      });

      const { statusCode, body } = await request(server, {
        method: 'POST',
        path: '/auth/login',
        body: { email, password },
      });

      assert.strictEqual(statusCode, 200);
      assert.strictEqual(typeof body.token, 'string');
    } finally {
      server.close();
    }
  });

  test('POST /auth/login에 틀린 비밀번호를 보내면 401을 반환한다', async () => {
    const app = createApp();
    const server = app.listen(0);
    try {
      const email = uniqueEmail('wrong-password');
      await request(server, {
        method: 'POST',
        path: '/auth/signup',
        body: { email, password: 'Password123!', nickname: '테스트유저' },
      });

      const { statusCode, body } = await request(server, {
        method: 'POST',
        path: '/auth/login',
        body: { email, password: 'WrongPassword!' },
      });

      assert.strictEqual(statusCode, 401);
      assert.strictEqual(body.code, 'INVALID_CREDENTIALS');
    } finally {
      server.close();
    }
  });

  test('POST /auth/signup에 email이 없으면 400을 반환한다', async () => {
    const app = createApp();
    const server = app.listen(0);
    try {
      const { statusCode } = await request(server, {
        method: 'POST',
        path: '/auth/signup',
        body: { password: 'Password123!', nickname: '테스트유저' },
      });

      assert.strictEqual(statusCode, 400);
    } finally {
      server.close();
    }
  });

  test('POST /auth/signup에 깨진 JSON body를 보내면 400과 INVALID_JSON_BODY를 반환한다 (BE-8)', async () => {
    const app = createApp();
    const server = app.listen(0);
    try {
      const brokenJson = '{"email": "broken@example.com", "password":';
      const { statusCode, body } = await new Promise((resolve, reject) => {
        const { port } = server.address();
        const req = http.request(
          {
            hostname: '127.0.0.1',
            port,
            path: '/auth/signup',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(brokenJson),
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
        req.write(brokenJson);
        req.end();
      });

      assert.strictEqual(statusCode, 400);
      assert.strictEqual(body.code, 'INVALID_JSON_BODY');
    } finally {
      server.close();
    }
  });
});
