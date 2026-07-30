/**
 * 전역 에러 처리 미들웨어 (BE-1 최소 fallback, 세부 포맷 통일은 BE-8 소관)
 */
const { AppError } = require('../errors');

function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ code: err.code, message: err.message });
    return;
  }

  // express.json()의 body 파싱 실패(SyntaxError)는 클라이언트 입력 오류이므로 400으로 처리한다.
  if (err.type === 'entity.parse.failed' || (err instanceof SyntaxError && err.status === 400)) {
    res.status(400).json({ code: 'INVALID_JSON_BODY', message: '요청 본문(JSON) 형식이 올바르지 않습니다.' });
    return;
  }

  console.error(err);
  res.status(500).json({ code: 'INTERNAL_SERVER_ERROR', message: 'Internal Server Error' });
}

module.exports = errorHandler;
