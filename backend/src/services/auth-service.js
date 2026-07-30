/**
 * 인증 도메인 서비스 (BE-2)
 *
 * 회원가입/로그인 비즈니스 로직과 트랜잭션 제어를 담당한다.
 * - 회원가입: 이메일 중복 검증 -> 비밀번호 해싱 -> 사용자 생성 -> '기본' 카테고리 자동 생성
 *   (도메인 규칙 2, docs/decisions/DB-4-default-category-policy.md)
 * - 로그인: 이메일/비밀번호 검증 -> JWT 발급
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db/pool');
const config = require('../config/config');
const userRepository = require('../repositories/user-repository');
const categoryRepository = require('../repositories/category-repository');
const { DEFAULT_CATEGORY_NAME } = require('../constants/category');
const { ConflictError, UnauthorizedError } = require('../errors');

const PASSWORD_SALT_ROUNDS = 10;
const UNIQUE_VIOLATION_CODE = '23505';

/**
 * password_hash를 제외하고, API 응답 규격(swagger User 스키마)에 맞춰
 * camelCase 필드로 변환한 사용자 정보를 반환한다.
 */
function toSafeUser(user) {
  return {
    id: user.id,
    email: user.email,
    nickname: user.nickname,
    createdAt: user.created_at,
  };
}

/**
 * 회원가입: 사용자 생성 + '기본' 카테고리 자동 생성을 하나의 트랜잭션으로 처리한다.
 * @param {{ email: string, password: string, nickname: string }} params
 */
async function signup({ email, password, nickname }) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const existingUser = await userRepository.findByEmail(email, client);
    if (existingUser) {
      throw new ConflictError('EMAIL_ALREADY_EXISTS', '이미 가입된 이메일입니다.');
    }

    const passwordHash = await bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
    const user = await userRepository.createUser(
      { email, passwordHash, nickname },
      client
    );

    await categoryRepository.createCategory(
      { ownerId: user.id, name: DEFAULT_CATEGORY_NAME },
      client
    );

    await client.query('COMMIT');

    return toSafeUser(user);
  } catch (error) {
    await client.query('ROLLBACK');

    if (error.code === UNIQUE_VIOLATION_CODE) {
      throw new ConflictError('EMAIL_ALREADY_EXISTS', '이미 가입된 이메일입니다.');
    }

    throw error;
  } finally {
    client.release();
  }
}

/**
 * 로그인: 이메일/비밀번호를 검증하고 JWT를 발급한다.
 * @param {{ email: string, password: string }} params
 */
async function login({ email, password }) {
  const user = await userRepository.findByEmail(email);

  if (!user) {
    throw new UnauthorizedError('INVALID_CREDENTIALS', '이메일 또는 비밀번호가 일치하지 않습니다.');
  }

  const isPasswordMatch = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordMatch) {
    throw new UnauthorizedError('INVALID_CREDENTIALS', '이메일 또는 비밀번호가 일치하지 않습니다.');
  }

  const token = jwt.sign({ userId: user.id }, config.jwtSecret, { expiresIn: '2h' });

  return { token, user: toSafeUser(user) };
}

module.exports = { signup, login, toSafeUser, PASSWORD_SALT_ROUNDS };
