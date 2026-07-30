/**
 * 전역 에러 처리 미들웨어 유닛 테스트 (BE-8)
 *
 * error-handler.js는 (err, req, res, next) 4개 인자를 받는 Express 에러 핸들러이며,
 * 항상 res.status().json()으로 응답을 종료하므로(next 미호출) 실제 서버 없이
 * mock res 객체만으로 검증한다.
 */
const { describe, test } = require('node:test');
const assert = require('node:assert');

const errorHandler = require('./error-handler');
const {
  NotFoundError,
  ValidationError,
  ConflictError,
  UnauthorizedError,
} = require('../errors');

function mockRes() {
  const res = {
    statusCode: null,
    body: null,
    status(code) {
      res.statusCode = code;
      return res;
    },
    json(body) {
      res.body = body;
      return res;
    },
  };
  return res;
}

function mockNext() {
  let called = false;
  const next = () => {
    called = true;
  };
  return {
    next,
    get called() {
      return called;
    },
  };
}

describe('errorHandler (BE-8)', () => {
  test('NotFoundError 전달 시 404와 {code, message}를 응답한다', () => {
    const err = new NotFoundError('TODO_NOT_FOUND', '메시지');
    const res = mockRes();
    const { next, called } = mockNext();

    errorHandler(err, {}, res, next);

    assert.strictEqual(res.statusCode, 404);
    assert.deepStrictEqual(res.body, { code: 'TODO_NOT_FOUND', message: '메시지' });
    assert.strictEqual(called, false);
  });

  test('ValidationError 전달 시 400과 {code, message}를 응답한다', () => {
    const err = new ValidationError('INVALID_INPUT', '입력값이 올바르지 않습니다.');
    const res = mockRes();
    const { next, called } = mockNext();

    errorHandler(err, {}, res, next);

    assert.strictEqual(res.statusCode, 400);
    assert.deepStrictEqual(res.body, {
      code: 'INVALID_INPUT',
      message: '입력값이 올바르지 않습니다.',
    });
    assert.strictEqual(called, false);
  });

  test('ConflictError 전달 시 409와 {code, message}를 응답한다', () => {
    const err = new ConflictError('EMAIL_ALREADY_EXISTS', '이미 가입된 이메일입니다.');
    const res = mockRes();
    const { next, called } = mockNext();

    errorHandler(err, {}, res, next);

    assert.strictEqual(res.statusCode, 409);
    assert.deepStrictEqual(res.body, {
      code: 'EMAIL_ALREADY_EXISTS',
      message: '이미 가입된 이메일입니다.',
    });
    assert.strictEqual(called, false);
  });

  test('UnauthorizedError 전달 시 401과 {code, message}를 응답한다', () => {
    const err = new UnauthorizedError('INVALID_CREDENTIALS', '자격증명이 올바르지 않습니다.');
    const res = mockRes();
    const { next, called } = mockNext();

    errorHandler(err, {}, res, next);

    assert.strictEqual(res.statusCode, 401);
    assert.deepStrictEqual(res.body, {
      code: 'INVALID_CREDENTIALS',
      message: '자격증명이 올바르지 않습니다.',
    });
    assert.strictEqual(called, false);
  });

  test('AppError가 아닌 일반 Error는 500과 고정 메시지로 응답하고 원본 메시지를 노출하지 않는다', () => {
    const err = new Error('예상치 못한 에러');
    const res = mockRes();
    const { next, called } = mockNext();

    const originalConsoleError = console.error;
    let consoleErrorCalled = false;
    console.error = () => {
      consoleErrorCalled = true;
    };

    try {
      errorHandler(err, {}, res, next);
    } finally {
      console.error = originalConsoleError;
    }

    assert.strictEqual(res.statusCode, 500);
    assert.deepStrictEqual(res.body, {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal Server Error',
    });
    assert.strictEqual(JSON.stringify(res.body).includes('예상치 못한 에러'), false);
    assert.strictEqual(called, false);
    assert.strictEqual(consoleErrorCalled, true);
  });

  test('body-parser JSON 파싱 실패(SyntaxError, entity.parse.failed)는 400 INVALID_JSON_BODY로 응답한다', () => {
    const err = new SyntaxError('Unexpected token');
    err.type = 'entity.parse.failed';
    err.status = 400;
    const res = mockRes();
    const { next, called } = mockNext();

    errorHandler(err, {}, res, next);

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.code, 'INVALID_JSON_BODY');
    assert.strictEqual(typeof res.body.message, 'string');
    assert.ok(res.body.message.length > 0);
    assert.strictEqual(called, false);
  });
});
