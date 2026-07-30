/**
 * 400 Validation 에러 (예: 필수값 누락, 형식 오류)
 */
const AppError = require('./app-error');

class ValidationError extends AppError {
  constructor(code, message) {
    super(code, message, 400);
  }
}

module.exports = ValidationError;
