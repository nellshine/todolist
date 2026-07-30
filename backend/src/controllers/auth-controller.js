/**
 * 인증 컨트롤러 (BE-2, FR-1/FR-2, UC-1/UC-2)
 */
const authService = require('../services/auth-service');
const { ValidationError } = require('../errors');

const MIN_PASSWORD_LENGTH = 8;

async function signup(req, res, next) {
  try {
    const { email, password, nickname } = req.body || {};

    if (!email || !password || !nickname) {
      throw new ValidationError('MISSING_REQUIRED_FIELD', 'email, password, nickname은 필수입니다.');
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      throw new ValidationError(
        'INVALID_PASSWORD',
        `비밀번호는 최소 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`
      );
    }

    const user = await authService.signup({ email, password, nickname });

    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      throw new ValidationError('MISSING_REQUIRED_FIELD', 'email, password는 필수입니다.');
    }

    const { token, user } = await authService.login({ email, password });

    res.status(200).json({ token, user });
  } catch (error) {
    next(error);
  }
}

module.exports = { signup, login };
