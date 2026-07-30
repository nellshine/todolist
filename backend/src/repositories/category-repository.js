/**
 * categories 테이블 접근 (BE-2, BE-4)
 */
const { pool } = require('../db/pool');

/**
 * 카테고리를 생성한다.
 * @param {{ ownerId: string, name: string }} params
 * @param {import('pg').PoolClient | typeof pool} client
 */
async function createCategory({ ownerId, name }, client = pool) {
  const result = await client.query(
    `INSERT INTO categories (owner_id, name)
     VALUES ($1, $2)
     RETURNING *`,
    [ownerId, name]
  );
  return result.rows[0];
}

/**
 * 소유자의 카테고리 목록을 생성일 오름차순으로 조회한다.
 * @param {string} ownerId
 * @param {import('pg').PoolClient | typeof pool} client
 */
async function findByOwnerId(ownerId, client = pool) {
  const result = await client.query(
    `SELECT * FROM categories WHERE owner_id = $1 ORDER BY created_at ASC`,
    [ownerId]
  );
  return result.rows;
}

/**
 * 소유권을 포함해 단건 카테고리를 조회한다. 없으면 undefined를 반환한다.
 * @param {string} id
 * @param {string} ownerId
 * @param {import('pg').PoolClient | typeof pool} client
 */
async function findByIdAndOwnerId(id, ownerId, client = pool) {
  const result = await client.query(
    `SELECT * FROM categories WHERE id = $1 AND owner_id = $2`,
    [id, ownerId]
  );
  return result.rows[0];
}

/**
 * 소유자의 '기본' 카테고리를 조회한다. 이름은 인자로 받아 하드코딩하지 않는다.
 * @param {string} ownerId
 * @param {string} defaultName
 * @param {import('pg').PoolClient | typeof pool} client
 */
async function findDefaultByOwnerId(ownerId, defaultName, client = pool) {
  const result = await client.query(
    `SELECT * FROM categories WHERE owner_id = $1 AND name = $2`,
    [ownerId, defaultName]
  );
  return result.rows[0];
}

/**
 * 카테고리 이름을 수정한다.
 * @param {{ id: string, ownerId: string, name: string }} params
 * @param {import('pg').PoolClient | typeof pool} client
 */
async function updateName({ id, ownerId, name }, client = pool) {
  const result = await client.query(
    `UPDATE categories SET name = $1 WHERE id = $2 AND owner_id = $3 RETURNING *`,
    [name, id, ownerId]
  );
  return result.rows[0];
}

/**
 * 카테고리를 삭제한다. 트랜잭션 내에서만 호출되어야 하므로 client를 필수로 받는다.
 * @param {{ id: string, ownerId: string }} params
 * @param {import('pg').PoolClient} client
 */
async function deleteById({ id, ownerId }, client) {
  await client.query(`DELETE FROM categories WHERE id = $1 AND owner_id = $2`, [id, ownerId]);
}

/**
 * 특정 카테고리에 속한 할일들을 다른 카테고리로 재할당한다.
 * 트랜잭션 내에서만 호출되어야 하므로 client를 필수로 받는다.
 * @param {{ ownerId: string, fromCategoryId: string, toCategoryId: string }} params
 * @param {import('pg').PoolClient} client
 */
async function reassignTodosToCategory({ ownerId, fromCategoryId, toCategoryId }, client) {
  await client.query(
    `UPDATE todos SET category_id = $1 WHERE owner_id = $2 AND category_id = $3`,
    [toCategoryId, ownerId, fromCategoryId]
  );
}

module.exports = {
  createCategory,
  findByOwnerId,
  findByIdAndOwnerId,
  findDefaultByOwnerId,
  updateName,
  deleteById,
  reassignTodosToCategory,
};
