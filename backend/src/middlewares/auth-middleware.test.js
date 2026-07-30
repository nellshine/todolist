const { describe, test } = require('node:test');
const assert = require('node:assert');
const jwt = require('jsonwebtoken');

const config = require('../config/config');
const authMiddleware = require('./auth-middleware');

function mockReq(headers = {}) {
  return { headers };
}

function mockNext() {
  const calls = [];
  const next = (err) => calls.push(err);
  next.calls = calls;
  return next;
}

describe('authMiddleware', () => {
  test('Authorization 헤더가 없으면 401 UnauthorizedError로 next를 호출한다', () => {
    const req = mockReq({});
    const next = mockNext();

    authMiddleware(req, {}, next);

    assert.strictEqual(next.calls.length, 1);
    assert.ok(next.calls[0]);
    assert.strictEqual(next.calls[0].statusCode, 401);
  });

  test('Authorization 헤더가 Bearer 형식이 아니면 401 UnauthorizedError로 next를 호출한다', () => {
    const req = mockReq({ authorization: 'Basic abcdef' });
    const next = mockNext();

    authMiddleware(req, {}, next);

    assert.strictEqual(next.calls.length, 1);
    assert.ok(next.calls[0]);
    assert.strictEqual(next.calls[0].statusCode, 401);
  });

  test('다른 secret으로 서명된(위조) 토큰이면 401 UnauthorizedError로 next를 호출한다', () => {
    const forgedToken = jwt.sign({ userId: 'x' }, 'wrong-secret');
    const req = mockReq({ authorization: `Bearer ${forgedToken}` });
    const next = mockNext();

    authMiddleware(req, {}, next);

    assert.strictEqual(next.calls.length, 1);
    assert.ok(next.calls[0]);
    assert.strictEqual(next.calls[0].statusCode, 401);
  });

  test('만료된 토큰이면 401 UnauthorizedError로 next를 호출한다', () => {
    const expiredToken = jwt.sign({ userId: 'test-user-id' }, config.jwtSecret, {
      expiresIn: -1,
    });
    const req = mockReq({ authorization: `Bearer ${expiredToken}` });
    const next = mockNext();

    authMiddleware(req, {}, next);

    assert.strictEqual(next.calls.length, 1);
    assert.ok(next.calls[0]);
    assert.strictEqual(next.calls[0].statusCode, 401);
  });

  test('유효한 토큰이면 에러 없이 next를 호출하고 req.user.id를 설정한다', () => {
    const validToken = jwt.sign({ userId: 'test-user-id' }, config.jwtSecret);
    const req = mockReq({ authorization: `Bearer ${validToken}` });
    const next = mockNext();

    authMiddleware(req, {}, next);

    assert.strictEqual(next.calls.length, 1);
    assert.strictEqual(next.calls[0], undefined);
    assert.strictEqual(req.user.id, 'test-user-id');
  });
});
