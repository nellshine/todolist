/**
 * 콘솔 기반 요청 로깅 미들웨어 (메서드/경로/상태코드/응답시간)
 *
 * 별도 로깅 라이브러리(morgan 등)를 사용하지 않고 console.log로만 기록한다.
 * 비밀번호/토큰 등 민감정보는 로그에 남기지 않는다.
 */
function requestLogger(req, res, next) {
  const startTime = process.hrtime.bigint();

  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const durationMs = Number(endTime - startTime) / 1e6;
    console.log(
      `[request] ${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs.toFixed(1)}ms`
    );
  });

  next();
}

module.exports = requestLogger;
