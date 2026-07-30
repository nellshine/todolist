/**
 * users 테이블 접근 (BE-2)
 *
 * 트랜잭션 제어는 하지 않으며, 호출자(services)가 필요 시 client를 주입한다.
 */
const { pool } = require('../db/pool');

/**
 * 이메일로 사용자를 조회한다.
 * @param {string} email
 * @param {import('pg').PoolClient | typeof pool} client
 */
async function findByEmail(email, client = pool) {
  const result = await client.query('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0] || null;
}

/**
 * 사용자를 생성한다.
 * @param {{ email: string, passwordHash: string, nickname: string }} params
 * @param {import('pg').PoolClient | typeof pool} client
 */
async function createUser({ email, passwordHash, nickname }, client = pool) {
  const result = await client.query(
    `INSERT INTO users (email, password_hash, nickname)
     VALUES ($1, $2, $3)
     RETURNING id, email, nickname, created_at`,
    [email, passwordHash, nickname]
  );
  return result.rows[0];
}

/**
 * id로 사용자를 조회한다.
 * @param {string} id
 * @param {import('pg').PoolClient | typeof pool} client
 */
async function findById(id, client = pool) {
  const result = await client.query('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0] || null;
}

/**
 * 사용자 닉네임을 수정한다.
 * @param {{ id: string, nickname: string }} params
 * @param {import('pg').PoolClient | typeof pool} client
 */
async function updateNickname({ id, nickname }, client = pool) {
  const result = await client.query(
    `UPDATE users SET nickname = $1 WHERE id = $2 RETURNING *`,
    [nickname, id]
  );
  return result.rows[0];
}

/**
 * 사용자 비밀번호 해시를 수정한다.
 * @param {{ id: string, passwordHash: string }} params
 * @param {import('pg').PoolClient | typeof pool} client
 */
async function updatePasswordHash({ id, passwordHash }, client = pool) {
  const result = await client.query(
    `UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING *`,
    [passwordHash, id]
  );
  return result.rows[0];
}

module.exports = {
  findByEmail,
  createUser,
  findById,
  updateNickname,
  updatePasswordHash,
};
