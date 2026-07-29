/**
 * 전역 에러 처리 미들웨어 (BE-1 최소 fallback, 세부 포맷 통일은 BE-8 소관)
 */
function errorHandler(err, req, res, next) {
  console.error(err);
  res.status(500).json({ message: 'Internal Server Error' });
}

module.exports = errorHandler;
