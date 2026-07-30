/**
 * 카테고리 컨트롤러 (BE-4)
 */
const categoryService = require('../services/category-service');
const { ValidationError } = require('../errors');

function isBlankName(name) {
  return !name || typeof name !== 'string' || name.trim().length === 0;
}

async function listCategories(req, res, next) {
  try {
    const categories = await categoryService.listCategories(req.user.id);
    res.status(200).json(categories);
  } catch (error) {
    next(error);
  }
}

async function createCategory(req, res, next) {
  try {
    const { name } = req.body || {};

    if (isBlankName(name)) {
      throw new ValidationError('MISSING_REQUIRED_FIELD', 'name은 필수입니다.');
    }

    const category = await categoryService.createCategory({ ownerId: req.user.id, name });

    res.status(201).json(category);
  } catch (error) {
    next(error);
  }
}

async function updateCategory(req, res, next) {
  try {
    const { categoryId } = req.params;
    const { name } = req.body || {};

    if (isBlankName(name)) {
      throw new ValidationError('MISSING_REQUIRED_FIELD', 'name은 필수입니다.');
    }

    const category = await categoryService.updateCategory({
      id: categoryId,
      ownerId: req.user.id,
      name,
    });

    res.status(200).json(category);
  } catch (error) {
    next(error);
  }
}

async function deleteCategory(req, res, next) {
  try {
    const { categoryId } = req.params;

    await categoryService.deleteCategory({ id: categoryId, ownerId: req.user.id });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

module.exports = { listCategories, createCategory, updateCategory, deleteCategory };
