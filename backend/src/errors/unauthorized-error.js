/**
 * 401 Unauthorized 에러 (예: 로그인 실패)
 */
const AppError = require('./app-error');

class UnauthorizedError extends AppError {
  constructor(code, message) {
    super(code, message, 401);
  }
}

module.exports = UnauthorizedError;
