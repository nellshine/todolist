/**
 * 사용자(계정) 컨트롤러 (BE-7)
 */
const userService = require('../services/user-service');
const { ValidationError } = require('../errors');

const MIN_PASSWORD_LENGTH = 8;

async function getMe(req, res, next) {
  try {
    const user = await userService.getMe(req.user.id);
    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
}

async function updateMe(req, res, next) {
  try {
    const { nickname, password } = req.body || {};

    if (nickname === undefined && password === undefined) {
      throw new ValidationError('MISSING_REQUIRED_FIELD', 'nickname 또는 password 중 하나 이상 입력해야 합니다.');
    }
    if (nickname !== undefined && nickname.trim().length === 0) {
      throw new ValidationError('INVALID_NICKNAME', '닉네임은 공백일 수 없습니다.');
    }
    if (password !== undefined && password.length < MIN_PASSWORD_LENGTH) {
      throw new ValidationError('INVALID_PASSWORD', `비밀번호는 최소 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`);
    }

    const user = await userService.updateMe({ userId: req.user.id, nickname, password });
    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
}

module.exports = { getMe, updateMe };
