/**
 * 404 Not Found 에러 (예: 존재하지 않거나 본인 소유가 아닌 리소스)
 */
const AppError = require('./app-error');

class NotFoundError extends AppError {
  constructor(code, message) {
    super(code, message, 404);
  }
}

module.exports = NotFoundError;
