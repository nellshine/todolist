/**
 * 환경변수 로드 및 노출 (BE-1)
 *
 * .env 파일을 로드하여 애플리케이션 전역에서 사용할 설정 객체를 만든다.
 * DB 접속정보/시크릿/포트 등은 코드에 하드코딩하지 않고 여기서만 참조한다.
 */
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  port: process.env.PORT || 3000,
  postgresConnectionString: process.env.POSTGRES_CONNECTION_STRING,
  jwtSecret: process.env.JWT_SECRET,
  // 콤마로 구분된 허용 오리진 목록 (예: "http://localhost:5173,https://todolist.example.com").
  // 프론트엔드 도메인만 명시적으로 허용한다 (project-structure.md 5장 보안 원칙).
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
};

module.exports = config;
