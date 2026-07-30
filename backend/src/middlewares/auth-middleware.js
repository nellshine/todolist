/**
 * JWT 인증 미들웨어 (BE-3)
 *
 * Authorization: Bearer <token> 헤더를 검증하고, 성공 시 req.user = { id }를 설정한다.
 * 토큰 부재/형식 오류/서명 불일치/만료 등은 모두 UnauthorizedError(401)로 통일해
 * next()에 위임한다(응답 생성은 error-handler.js가 일괄 처리).
 * 아직 이 미들웨어를 사용하는 라우트는 없다(BE-4에서 개별 라우트에 연결 예정).
 */
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const { UnauthorizedError } = require('../errors');

function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedError('UNAUTHORIZED', '인증 토큰이 필요합니다.');
    }

    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = { id: decoded.userId };

    next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return next(error);
    }
    return next(new UnauthorizedError('UNAUTHORIZED', '유효하지 않은 토큰입니다.'));
  }
}

module.exports = authMiddleware;
