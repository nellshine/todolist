/**
 * 카테고리 라우트 (BE-4)
 */
const express = require('express');
const authMiddleware = require('../middlewares/auth-middleware');
const controller = require('../controllers/category-controller');

const router = express.Router();

router.get('/categories', authMiddleware, controller.listCategories);
router.post('/categories', authMiddleware, controller.createCategory);
router.patch('/categories/:categoryId', authMiddleware, controller.updateCategory);
router.delete('/categories/:categoryId', authMiddleware, controller.deleteCategory);

module.exports = router;
