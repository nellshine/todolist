/**
 * todos 테이블 접근 (BE-5)
 */
const { pool } = require('../db/pool');

/**
 * 할일을 생성한다.
 * @param {{ ownerId: string, categoryId: string, title: string, description?: string, startDate: string|Date, endDate: string|Date }} params
 * @param {import('pg').PoolClient | typeof pool} client
 */
async function create(
  { ownerId, categoryId, title, description, startDate, endDate },
  client = pool
) {
  const result = await client.query(
    `INSERT INTO todos (owner_id, category_id, title, description, start_date, end_date)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [ownerId, categoryId, title, description, startDate, endDate]
  );
  return result.rows[0];
}

/**
 * 소유권을 포함해 단건 할일을 조회한다. 없으면 undefined를 반환한다.
 * @param {string} id
 * @param {string} ownerId
 * @param {import('pg').PoolClient | typeof pool} client
 */
async function findByIdAndOwnerId(id, ownerId, client = pool) {
  const result = await client.query(`SELECT * FROM todos WHERE id = $1 AND owner_id = $2`, [
    id,
    ownerId,
  ]);
  return result.rows[0];
}

/**
 * 할일을 부분 수정한다. fields는 이미 결정된 snake_case 컬럼->값 맵이다.
 * @param {{ id: string, ownerId: string, fields: Record<string, unknown> }} params
 * @param {import('pg').PoolClient | typeof pool} client
 */
async function update({ id, ownerId, fields }, client = pool) {
  const columns = Object.keys(fields);
  const values = columns.map((column) => fields[column]);

  const setClauses = columns.map((column, index) => `${column} = $${index + 1}`);
  setClauses.push('updated_at = now()');

  const idParamIndex = values.length + 1;
  const ownerIdParamIndex = values.length + 2;

  const result = await client.query(
    `UPDATE todos SET ${setClauses.join(', ')}
     WHERE id = $${idParamIndex} AND owner_id = $${ownerIdParamIndex}
     RETURNING *`,
    [...values, id, ownerId]
  );
  return result.rows[0];
}

/**
 * 할일을 삭제한다.
 * @param {{ id: string, ownerId: string }} params
 * @param {import('pg').PoolClient | typeof pool} client
 */
async function deleteById({ id, ownerId }, client = pool) {
  await client.query(`DELETE FROM todos WHERE id = $1 AND owner_id = $2`, [id, ownerId]);
}

/**
 * 소유자의 할일 목록을 조회한다. categoryId가 있으면 AND 조건으로 필터링한다.
 * owner_id 조건을 항상 최우선에 두어 idx_todos_owner_id/idx_todos_category_id 인덱스를 활용한다.
 * @param {string} ownerId
 * @param {{ categoryId?: string }} filters
 * @param {import('pg').PoolClient | typeof pool} client
 */
async function findByOwnerId(ownerId, { categoryId } = {}, client = pool) {
  const conditions = ['owner_id = $1'];
  const params = [ownerId];
  if (categoryId) {
    params.push(categoryId);
    conditions.push(`category_id = $${params.length}`);
  }
  const result = await client.query(
    `SELECT * FROM todos WHERE ${conditions.join(' AND ')} ORDER BY created_at ASC`,
    params
  );
  return result.rows;
}

module.exports = {
  create,
  findByIdAndOwnerId,
  update,
  deleteById,
  findByOwnerId,
};
