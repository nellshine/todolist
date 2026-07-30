/**
 * auth-service 통합 테스트 (BE-2)
 *
 * 실제 DB(todolist_dev)에 직접 접속해 회원가입/로그인 기능을 검증한다.
 * ORM/모킹 없이 pg.Pool을 그대로 사용한다(project-structure.md 5장 원칙).
 */
const test = require('node:test');
const { describe, after } = test;
const assert = require('node:assert');
const jwt = require('jsonwebtoken');

const { pool } = require('../db/pool');
const config = require('../config/config');
const authService = require('./auth-service');
const { ConflictError, UnauthorizedError } = require('../errors');

const TEST_EMAIL_PREFIX = 'be2-test-';
const DEFAULT_CATEGORY_NAME = '기본';

function uniqueEmail(suffix) {
  return `${TEST_EMAIL_PREFIX}${suffix}-${Date.now()}-${Math.floor(Math.random() * 100000)}@example.com`;
}

describe('auth-service (BE-2)', () => {
  after(async () => {
    await pool.query("DELETE FROM users WHERE email LIKE $1", [`${TEST_EMAIL_PREFIX}%`]);
    await pool.end();
  });

  test('signup()은 성공 시 id/email/nickname을 반환하고 password_hash를 노출하지 않는다', async () => {
    const email = uniqueEmail('signup');
    const result = await authService.signup({
      email,
      password: 'Password123!',
      nickname: '테스트유저',
    });

    assert.ok(result.id);
    assert.strictEqual(result.email, email);
    assert.strictEqual(result.nickname, '테스트유저');
    assert.strictEqual(result.passwordHash, undefined);
    assert.strictEqual(result.password_hash, undefined);
  });

  test('signup() 성공 시 owner_id=user.id, name="기본"인 카테고리가 자동 생성된다', async () => {
    const email = uniqueEmail('default-category');
    const user = await authService.signup({
      email,
      password: 'Password123!',
      nickname: '테스트유저',
    });

    const { rows } = await pool.query(
      'SELECT * FROM categories WHERE owner_id = $1 AND name = $2',
      [user.id, DEFAULT_CATEGORY_NAME]
    );

    assert.strictEqual(rows.length, 1);
  });

  test('signup() 성공 시 password_hash는 평문이 아니라 bcrypt 해시(prefix "$2")로 저장된다', async () => {
    const email = uniqueEmail('hash');
    const password = 'Password123!';
    const user = await authService.signup({
      email,
      password,
      nickname: '테스트유저',
    });

    const { rows } = await pool.query('SELECT password_hash FROM users WHERE id = $1', [user.id]);

    assert.strictEqual(rows.length, 1);
    const storedHash = rows[0].password_hash;
    assert.notStrictEqual(storedHash, password);
    assert.ok(storedHash.startsWith('$2'), `password_hash가 bcrypt 포맷이 아님: ${storedHash}`);
  });

  test('signup()은 이메일 중복 시 ConflictError(EMAIL_ALREADY_EXISTS, 409)를 던진다', async () => {
    const email = uniqueEmail('duplicate');
    await authService.signup({
      email,
      password: 'Password123!',
      nickname: '첫가입',
    });

    await assert.rejects(
      async () => {
        await authService.signup({
          email,
          password: 'Password123!',
          nickname: '중복가입',
        });
      },
      (error) => {
        assert.ok(error instanceof ConflictError);
        assert.strictEqual(error.code, 'EMAIL_ALREADY_EXISTS');
        assert.strictEqual(error.statusCode, 409);
        return true;
      }
    );
  });

  test('login()은 정상 자격증명에 대해 JWT token과 user를 반환한다', async () => {
    const email = uniqueEmail('login');
    const password = 'Password123!';
    const signedUpUser = await authService.signup({
      email,
      password,
      nickname: '로그인유저',
    });

    const result = await authService.login({ email, password });

    assert.strictEqual(typeof result.token, 'string');
    assert.ok(result.user);

    const decoded = jwt.verify(result.token, config.jwtSecret);
    assert.strictEqual(decoded.userId, signedUpUser.id);
  });

  test('login()은 비밀번호가 틀리면 UnauthorizedError(INVALID_CREDENTIALS, 401)를 던진다', async () => {
    const email = uniqueEmail('wrong-password');
    await authService.signup({
      email,
      password: 'Password123!',
      nickname: '로그인유저',
    });

    await assert.rejects(
      async () => {
        await authService.login({ email, password: 'WrongPassword!' });
      },
      (error) => {
        assert.ok(error instanceof UnauthorizedError);
        assert.strictEqual(error.code, 'INVALID_CREDENTIALS');
        assert.strictEqual(error.statusCode, 401);
        return true;
      }
    );
  });

  test('login()은 존재하지 않는 이메일에 대해서도 동일하게 UnauthorizedError(401)를 던진다', async () => {
    const email = uniqueEmail('nonexistent');

    await assert.rejects(
      async () => {
        await authService.login({ email, password: 'Password123!' });
      },
      (error) => {
        assert.ok(error instanceof UnauthorizedError);
        assert.strictEqual(error.code, 'INVALID_CREDENTIALS');
        assert.strictEqual(error.statusCode, 401);
        return true;
      }
    );
  });
});
