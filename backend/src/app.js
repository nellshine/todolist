/**
 * Express 앱 초기화 (BE-1)
 *
 * 미들웨어/라우터 등록 순서: json 파싱 -> 요청 로깅 -> 라우트 -> 전역 에러 핸들러(최후단)
 */
const express = require('express');
const config = require('./config/config');
const { verifyConnection } = require('./db/pool');
const requestLogger = require('./middlewares/request-logger');
const errorHandler = require('./middlewares/error-handler');
const healthRoutes = require('./routes/health-routes');

function createApp() {
  const app = express();

  app.use(express.json());
  app.use(requestLogger);

  app.use(healthRoutes);

  app.use(errorHandler);

  return app;
}

function startServer() {
  const app = createApp();

  verifyConnection();

  app.listen(config.port, () => {
    console.log(`[app] 서버가 포트 ${config.port}에서 기동되었습니다.`);
  });

  return app;
}

if (require.main === module) {
  startServer();
}

module.exports = { createApp, startServer };
