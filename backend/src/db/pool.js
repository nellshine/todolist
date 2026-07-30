/**
 * PostgreSQL 연결 풀 (BE-1)
 *
 * pg.Pool을 환경변수 기반으로 생성하고, 기동 시 연결 확인용 verifyConnection()을 제공한다.
 */
const { Pool, types } = require('pg');
const config = require('../config/config');

// DATE 컬럼(OID 1082)은 시각/타임존 정보가 없으므로, pg가 기본으로 변환하는
// "로컬 자정 Date 객체" 대신 원본 문자열('YYYY-MM-DD')을 그대로 반환하도록 한다.
// (로컬 자정 Date로 변환하면 UTC 대비 타임존 오프셋만큼 날짜가 하루 밀려 보이는
// 문제가 있어, start_date/end_date 비교·직렬화 전반에 영향을 준다.)
types.setTypeParser(1082, (value) => value);

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
