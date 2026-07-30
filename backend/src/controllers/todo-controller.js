/**
 * 할일(Todo) 컨트롤러 (BE-5)
 */
const todoService = require('../services/todo-service');
const { ValidationError } = require('../errors');

function isBlank(value) {
  return !value || typeof value !== 'string' || value.trim().length === 0;
}

async function createTodo(req, res, next) {
  try {
    const { categoryId, title, description, startDate, endDate } = req.body || {};

    if (isBlank(title)) {
      throw new ValidationError('MISSING_REQUIRED_FIELD', 'title은 필수입니다.');
    }
    if (!startDate) {
      throw new ValidationError('MISSING_REQUIRED_FIELD', 'startDate는 필수입니다.');
    }
    if (!endDate) {
      throw new ValidationError('MISSING_REQUIRED_FIELD', 'endDate는 필수입니다.');
    }

    const todo = await todoService.createTodo({
      ownerId: req.user.id,
      categoryId,
      title,
      description,
      startDate,
      endDate,
    });

    res.status(201).json(todo);
  } catch (error) {
    next(error);
  }
}

async function listTodos(req, res, next) {
  try {
    const { categoryId, status } = req.query;
    const todos = await todoService.listTodos({ ownerId: req.user.id, categoryId, status });
    res.status(200).json(todos);
  } catch (error) {
    next(error);
  }
}

async function getTodo(req, res, next) {
  try {
    const { todoId } = req.params;

    const todo = await todoService.getTodo({ id: todoId, ownerId: req.user.id });

    res.status(200).json(todo);
  } catch (error) {
    next(error);
  }
}

async function updateTodo(req, res, next) {
  try {
    const { todoId } = req.params;
    const body = req.body || {};

    if (Object.keys(body).length === 0) {
      throw new ValidationError(
        'EMPTY_UPDATE_PAYLOAD',
        '수정할 필드가 최소 1개 필요합니다.'
      );
    }

    const todo = await todoService.updateTodo({
      id: todoId,
      ownerId: req.user.id,
      fields: body,
      hasCategoryIdKey: 'categoryId' in body,
    });

    res.status(200).json(todo);
  } catch (error) {
    next(error);
  }
}

async function deleteTodo(req, res, next) {
  try {
    const { todoId } = req.params;

    await todoService.deleteTodo({ id: todoId, ownerId: req.user.id });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

module.exports = { createTodo, listTodos, getTodo, updateTodo, deleteTodo };
