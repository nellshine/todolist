/**
 * Express 앱 초기화 (BE-1)
 *
 * 미들웨어/라우터 등록 순서: json 파싱 -> 요청 로깅 -> 라우트 -> 전역 에러 핸들러(최후단)
 */
const path = require('path');
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const config = require('./config/config');
const { verifyConnection } = require('./db/pool');
const requestLogger = require('./middlewares/request-logger');
const errorHandler = require('./middlewares/error-handler');
const healthRoutes = require('./routes/health-routes');
const authRoutes = require('./routes/auth-routes');
const userRoutes = require('./routes/user-routes');
const categoryRoutes = require('./routes/category-routes');
const todoRoutes = require('./routes/todo-routes');

const swaggerDocument = require(path.resolve(__dirname, '../../swagger/swagger.json'));

function createApp() {
  const app = express();

  app.use(cors({ origin: config.corsOrigins }));
  app.use(express.json());
  app.use(requestLogger);

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

  app.use(healthRoutes);
  app.use(authRoutes);
  app.use(userRoutes);
  app.use(categoryRoutes);
  app.use(todoRoutes);

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
