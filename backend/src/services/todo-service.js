/**
 * 할일(Todo) 도메인 서비스 (BE-5)
 *
 * - 할일 CRUD 비즈니스 로직과 소유권 검증을 담당한다(도메인 규칙 4).
 * - 상태(NOT_STARTED/IN_PROGRESS/COMPLETED/OVERDUE)는 DB에 저장하지 않고 조회 시점에
 *   파생 계산한다(도메인 규칙 2, 6). 완료 처리된 할일은 기한 경과 여부와 무관하게 항상
 *   COMPLETED로 간주한다(도메인 규칙 6).
 * - 카테고리 지정/미지정 처리는 category-service.resolveCategoryId를 재사용한다(BE-4).
 */
const categoryService = require('./category-service');
const todoRepository = require('../repositories/todo-repository');
const { ValidationError, NotFoundError } = require('../errors');
const { TODO_STATUS } = require('../constants/status');

/**
 * Date를 UTC 자정 기준으로 정규화한다(시각/타임존 이슈 방지, pg DATE 컬럼과 동일한 기준).
 * @param {Date} date
 */
function toUtcMidnight(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/**
 * DB row의 완료 여부/기간을 기준으로 할일 상태를 파생 계산한다(도메인 규칙 2, 6).
 * @param {{ is_completed: boolean, start_date: Date, end_date: Date }} todo
 * @param {Date} today
 */
function deriveTodoStatus(todo, today = new Date()) {
  if (todo.is_completed === true) {
    return TODO_STATUS.COMPLETED;
  }

  const normalizedToday = toUtcMidnight(today);
  const startDate = toUtcMidnight(new Date(todo.start_date));
  const endDate = toUtcMidnight(new Date(todo.end_date));

  if (normalizedToday < startDate) {
    return TODO_STATUS.NOT_STARTED;
  }

  if (normalizedToday > endDate) {
    return TODO_STATUS.OVERDUE;
  }

  return TODO_STATUS.IN_PROGRESS;
}

/**
 * DB row(snake_case)를 API 응답 규격(swagger Todo 스키마, camelCase)으로 변환한다.
 */
function toTodoResponse(todo, today = new Date()) {
  return {
    id: todo.id,
    ownerId: todo.owner_id,
    categoryId: todo.category_id,
    title: todo.title,
    description: todo.description,
    startDate: todo.start_date,
    endDate: todo.end_date,
    isCompleted: todo.is_completed,
    completedAt: todo.completed_at,
    status: deriveTodoStatus(todo, today),
    createdAt: todo.created_at,
    updatedAt: todo.updated_at,
  };
}

/**
 * 종료일자가 시작일자보다 이전이면 400으로 거부한다(도메인 규칙 3).
 * @param {string|Date} startDate
 * @param {string|Date} endDate
 */
function assertValidDateRange(startDate, endDate) {
  if (new Date(startDate) > new Date(endDate)) {
    throw new ValidationError(
      'INVALID_DATE_RANGE',
      '종료일자는 시작일자보다 이전일 수 없습니다.'
    );
  }
}

/**
 * 소유권을 검증하며 할일을 조회한다. 본인 소유가 아니거나 없으면 404로 응답한다(도메인 규칙 4).
 * @param {string} id
 * @param {string} ownerId
 */
async function getTodoOwnedByUser(id, ownerId) {
  const todo = await todoRepository.findByIdAndOwnerId(id, ownerId);
  if (!todo) {
    throw new NotFoundError('TODO_NOT_FOUND', '할일을 찾을 수 없습니다.');
  }
  return todo;
}

/**
 * 할일을 생성한다. categoryId 미지정 시 '기본' 카테고리로 등록한다(도메인 규칙 5).
 * @param {{ ownerId: string, categoryId?: string, title: string, description?: string, startDate: string, endDate: string }} params
 */
async function createTodo({ ownerId, categoryId, title, description, startDate, endDate }) {
  assertValidDateRange(startDate, endDate);

  const resolvedCategoryId = await categoryService.resolveCategoryId({ categoryId, ownerId });

  const todo = await todoRepository.create({
    ownerId,
    categoryId: resolvedCategoryId,
    title,
    description,
    startDate,
    endDate,
  });

  return toTodoResponse(todo);
}

/**
 * 할일 단건을 조회한다.
 * @param {{ id: string, ownerId: string }} params
 */
async function getTodo({ id, ownerId }) {
  const todo = await getTodoOwnedByUser(id, ownerId);
  return toTodoResponse(todo);
}

/**
 * 할일을 부분 수정한다.
 * @param {{ id: string, ownerId: string, fields: object, hasCategoryIdKey: boolean }} params
 */
async function updateTodo({ id, ownerId, fields, hasCategoryIdKey }) {
  const existing = await getTodoOwnedByUser(id, ownerId);

  const setMap = {};

  if (hasCategoryIdKey) {
    const resolvedCategoryId = await categoryService.resolveCategoryId({
      categoryId: fields.categoryId,
      ownerId,
    });
    setMap.category_id = resolvedCategoryId;
  }

  const mergedStartDate = fields.startDate ?? existing.start_date;
  const mergedEndDate = fields.endDate ?? existing.end_date;
  assertValidDateRange(mergedStartDate, mergedEndDate);

  if (fields.title !== undefined) {
    setMap.title = fields.title;
  }
  if (fields.description !== undefined) {
    setMap.description = fields.description;
  }
  if (fields.startDate !== undefined) {
    setMap.start_date = fields.startDate;
  }
  if (fields.endDate !== undefined) {
    setMap.end_date = fields.endDate;
  }
  if (fields.isCompleted !== undefined) {
    setMap.is_completed = fields.isCompleted;
    setMap.completed_at = fields.isCompleted === true ? new Date() : null;
  }

  const updated = await todoRepository.update({ id, ownerId, fields: setMap });
  return toTodoResponse(updated);
}

/**
 * 할일을 삭제한다.
 * @param {{ id: string, ownerId: string }} params
 */
async function deleteTodo({ id, ownerId }) {
  await getTodoOwnedByUser(id, ownerId);
  await todoRepository.deleteById({ id, ownerId });
}

/**
 * 할일 목록을 조회한다. categoryId는 SQL WHERE에서, status는 파생 계산 후 애플리케이션
 * 레벨에서 필터링한다(도메인 규칙 2 — 상태 계산 로직은 서비스 레이어에만 위치).
 * categoryId가 타인 소유이더라도 owner_id 조건에 의해 자연히 빈 배열이 반환되므로 별도의
 * 소유권 검증(404)은 하지 않는다.
 * @param {{ ownerId: string, categoryId?: string, status?: string, today?: Date }} params
 */
async function listTodos({ ownerId, categoryId, status, today = new Date() }) {
  if (status !== undefined && status !== null && !Object.values(TODO_STATUS).includes(status)) {
    throw new ValidationError('INVALID_STATUS', 'status 값이 올바르지 않습니다.');
  }

  const todos = await todoRepository.findByOwnerId(ownerId, { categoryId });

  const withStatus = todos.map((todo) => ({ todo, status: deriveTodoStatus(todo, today) }));
  const filtered = status ? withStatus.filter((entry) => entry.status === status) : withStatus;

  return filtered.map((entry) => toTodoResponse(entry.todo, today));
}

module.exports = {
  deriveTodoStatus,
  toTodoResponse,
  assertValidDateRange,
  getTodoOwnedByUser,
  createTodo,
  getTodo,
  updateTodo,
  deleteTodo,
  listTodos,
};
