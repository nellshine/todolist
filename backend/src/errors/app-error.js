/**
 * 애플리케이션 공통 에러 베이스 클래스 (BE-2)
 */
class AppError extends Error {
  constructor(code, message, statusCode) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

module.exports = AppError;
