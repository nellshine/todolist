/**
 * 409 Conflict 에러 (예: 이메일 중복 가입)
 */
const AppError = require('./app-error');

class ConflictError extends AppError {
  constructor(code, message) {
    super(code, message, 409);
  }
}

module.exports = ConflictError;
