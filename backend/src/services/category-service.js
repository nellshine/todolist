/**
 * 카테고리 도메인 서비스 (BE-4)
 *
 * - 카테고리 CRUD 비즈니스 로직과 소유권 검증을 담당한다(도메인 규칙 4).
 * - 카테고리 삭제 시 소속 할일을 '기본' 카테고리로 이관하는 트랜잭션을 처리한다(도메인 규칙 7,
 *   database/scenarios/category-deletion-reassignment.sql 시나리오 A 참고).
 * - '기본' 카테고리 자체의 삭제는 금지한다(docs/decisions/DB-4-default-category-policy.md).
 */
const { pool } = require('../db/pool');
const categoryRepository = require('../repositories/category-repository');
const { DEFAULT_CATEGORY_NAME } = require('../constants/category');
const { ConflictError, NotFoundError, ValidationError } = require('../errors');

const UNIQUE_VIOLATION_CODE = '23505';

/**
 * DB row(snake_case)를 API 응답 규격(swagger Category 스키마, camelCase)으로 변환한다.
 */
function toCategoryResponse(category) {
  return {
    id: category.id,
    ownerId: category.owner_id,
    name: category.name,
    isDefault: category.name === DEFAULT_CATEGORY_NAME,
    createdAt: category.created_at,
  };
}

/**
 * 소유자의 카테고리 목록을 조회한다.
 * @param {string} ownerId
 */
async function listCategories(ownerId) {
  const categories = await categoryRepository.findByOwnerId(ownerId);
  return categories.map(toCategoryResponse);
}

/**
 * 카테고리를 생성한다. 이름 중복 시 409로 변환한다.
 * @param {{ ownerId: string, name: string }} params
 */
async function createCategory({ ownerId, name }) {
  try {
    const category = await categoryRepository.createCategory({ ownerId, name });
    console.log(`[category] 생성: ownerId=${ownerId} id=${category.id} name=${category.name}`);
    return toCategoryResponse(category);
  } catch (error) {
    if (error.code === UNIQUE_VIOLATION_CODE) {
      throw new ConflictError('CATEGORY_NAME_ALREADY_EXISTS', '이미 존재하는 카테고리 이름입니다.');
    }
    throw error;
  }
}

/**
 * 카테고리 이름을 수정한다. 본인 소유가 아니면 404, 이름 중복 시 409로 변환한다.
 * @param {{ id: string, ownerId: string, name: string }} params
 */
async function updateCategory({ id, ownerId, name }) {
  const existing = await categoryRepository.findByIdAndOwnerId(id, ownerId);
  if (!existing) {
    throw new NotFoundError('CATEGORY_NOT_FOUND', '카테고리를 찾을 수 없습니다.');
  }

  try {
    const updated = await categoryRepository.updateName({ id, ownerId, name });
    return toCategoryResponse(updated);
  } catch (error) {
    if (error.code === UNIQUE_VIOLATION_CODE) {
      throw new ConflictError('CATEGORY_NAME_ALREADY_EXISTS', '이미 존재하는 카테고리 이름입니다.');
    }
    throw error;
  }
}

/**
 * 카테고리를 삭제한다. 소속 할일은 '기본' 카테고리로 이관한 뒤 삭제한다(도메인 규칙 7).
 * 본인 소유가 아니면 404, '기본' 카테고리 자체는 삭제 불가(400)로 거부한다.
 * @param {{ id: string, ownerId: string }} params
 */
async function deleteCategory({ id, ownerId }) {
  const target = await categoryRepository.findByIdAndOwnerId(id, ownerId);
  if (!target) {
    throw new NotFoundError('CATEGORY_NOT_FOUND', '카테고리를 찾을 수 없습니다.');
  }

  if (target.name === DEFAULT_CATEGORY_NAME) {
    throw new ValidationError(
      'DEFAULT_CATEGORY_DELETE_FORBIDDEN',
      "'기본' 카테고리는 삭제할 수 없습니다."
    );
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const defaultCategory = await categoryRepository.findDefaultByOwnerId(
      ownerId,
      DEFAULT_CATEGORY_NAME,
      client
    );

    await categoryRepository.reassignTodosToCategory(
      { ownerId, fromCategoryId: id, toCategoryId: defaultCategory.id },
      client
    );

    await categoryRepository.deleteById({ id, ownerId }, client);

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * 할일 등록/수정 시 사용할 카테고리 id를 결정한다(BE-5에서 재사용).
 * categoryId가 주어지면 소유권을 검증하고, 없으면 '기본' 카테고리 id를 반환한다.
 * @param {{ categoryId?: string, ownerId: string }} params
 * @param {import('pg').PoolClient | typeof pool} client
 */
async function resolveCategoryId({ categoryId, ownerId }, client = pool) {
  if (categoryId) {
    const category = await categoryRepository.findByIdAndOwnerId(categoryId, ownerId, client);
    if (!category) {
      throw new NotFoundError('CATEGORY_NOT_FOUND', '카테고리를 찾을 수 없습니다.');
    }
    return category.id;
  }

  const defaultCategory = await categoryRepository.findDefaultByOwnerId(
    ownerId,
    DEFAULT_CATEGORY_NAME,
    client
  );
  return defaultCategory.id;
}

module.exports = {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  resolveCategoryId,
};
