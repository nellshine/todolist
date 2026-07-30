/**
 * 사용자(계정) 도메인 서비스 (BE-7)
 *
 * 계정 정보 조회/수정(닉네임, 비밀번호) 비즈니스 로직을 담당한다.
 */
const bcrypt = require('bcryptjs');
const userRepository = require('../repositories/user-repository');
const { toSafeUser, PASSWORD_SALT_ROUNDS } = require('./auth-service');
const { NotFoundError, ValidationError } = require('../errors');

/**
 * 내 계정 정보를 조회한다.
 * @param {string} userId
 */
async function getMe(userId) {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw new NotFoundError('USER_NOT_FOUND', '사용자를 찾을 수 없습니다.');
  }
  return toSafeUser(user);
}

/**
 * 내 계정 정보(닉네임/비밀번호)를 수정한다. 최소 하나의 필드가 필요하다.
 * @param {{ userId: string, nickname?: string, password?: string }} params
 */
async function updateMe({ userId, nickname, password }) {
  if (nickname === undefined && password === undefined) {
    throw new ValidationError('MISSING_REQUIRED_FIELD', 'nickname 또는 password 중 하나 이상 필요합니다.');
  }

  if (nickname !== undefined) {
    await userRepository.updateNickname({ id: userId, nickname });
  }

  if (password !== undefined) {
    const passwordHash = await bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
    await userRepository.updatePasswordHash({ id: userId, passwordHash });
  }

  const updated = await userRepository.findById(userId);
  return toSafeUser(updated);
}

module.exports = { getMe, updateMe };
