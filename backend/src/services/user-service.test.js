/**
 * user-service 통합 테스트 (BE-7)
 *
 * 실제 DB(todolist_dev)에 직접 접속해 계정 정보 조회/수정 로직을 검증한다.
 * ORM/모킹 없이 pg.Pool을 그대로 사용한다(project-structure.md 5장 원칙, auth-service.test.js/category-service.test.js 패턴 재사용).
 */
const test = require('node:test');
const { describe, after } = test;
const assert = require('node:assert');

const { pool } = require('../db/pool');
const authService = require('./auth-service');
const userService = require('./user-service');
const { ValidationError, UnauthorizedError } = require('../errors');

const TEST_EMAIL_PREFIX = 'be7-test-svc-';

function uniqueEmail(suffix) {
  return `${TEST_EMAIL_PREFIX}${suffix}-${Date.now()}-${Math.floor(Math.random() * 100000)}@example.com`;
}

async function createUser(suffix) {
  const email = uniqueEmail(suffix);
  const password = 'Password123!';
  const user = await authService.signup({
    email,
    password,
    nickname: 'BE7테스트',
  });
  return { user, email, password };
}

describe('user-service (BE-7)', () => {
  after(async () => {
    await pool.query("DELETE FROM users WHERE email LIKE $1", [`${TEST_EMAIL_PREFIX}%`]);
    await pool.end();
  });

  test('getMe()는 id/email/nickname을 반환하고 password_hash를 노출하지 않는다', async () => {
    const { user, email } = await createUser('get');

    const result = await userService.getMe(user.id);

    assert.strictEqual(result.id, user.id);
    assert.strictEqual(result.email, email);
    assert.strictEqual(result.nickname, 'BE7테스트');
    assert.strictEqual(result.passwordHash, undefined);
    assert.strictEqual(result.password_hash, undefined);
  });

  test('updateMe()로 닉네임 변경 시 반환값과 이후 getMe() 재조회 결과 모두 새 닉네임을 반영한다(FR-4)', async () => {
    const { user } = await createUser('nickname');

    const updated = await userService.updateMe({ userId: user.id, nickname: '새닉네임' });
    assert.strictEqual(updated.nickname, '새닉네임');

    const refetched = await userService.getMe(user.id);
    assert.strictEqual(refetched.nickname, '새닉네임');
  });

  test('updateMe()로 비밀번호 변경 후 기존 비밀번호로는 로그인 실패, 새 비밀번호로만 로그인 성공한다', async () => {
    const { user, email } = await createUser('password');

    await userService.updateMe({ userId: user.id, password: 'NewPassword456!' });

    await assert.rejects(
      async () => {
        await authService.login({ email, password: 'Password123!' });
      },
      (error) => {
        assert.ok(error instanceof UnauthorizedError);
        assert.strictEqual(error.statusCode, 401);
        return true;
      }
    );

    const result = await authService.login({ email, password: 'NewPassword456!' });
    assert.strictEqual(typeof result.token, 'string');
  });

  test('updateMe()는 nickname/password 둘 다 미지정 시 ValidationError(400)를 던진다', async () => {
    const { user } = await createUser('empty');

    await assert.rejects(
      async () => {
        await userService.updateMe({ userId: user.id });
      },
      (error) => {
        assert.ok(error instanceof ValidationError);
        assert.strictEqual(error.statusCode, 400);
        return true;
      }
    );
  });
});
