/**
 * PostgreSQL 연결 풀 (BE-1)
 *
 * pg.Pool을 환경변수 기반으로 생성하고, 기동 시 연결 확인용 verifyConnection()을 제공한다.
 */
const { Pool } = require('pg');
const config = require('../config/config');

const pool = new Pool({
  connectionString: config.postgresConnectionString,
});

/**
 * DB 연결이 정상인지 SELECT 1로 확인하고 결과를 콘솔에 로그로 남긴다.
 * @returns {Promise<boolean>} 연결 성공 여부
 */
async function verifyConnection() {
  try {
    await pool.query('SELECT 1');
    console.log('[db] PostgreSQL 연결 확인 성공.');
    return true;
  } catch (error) {
    console.error('[db] PostgreSQL 연결 확인 실패:', error.message);
    return false;
  }
}

module.exports = { pool, verifyConnection };
