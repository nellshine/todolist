/**
 * 할일(Todo) 라우트 (BE-5, BE-6)
 */
const express = require('express');
const authMiddleware = require('../middlewares/auth-middleware');
const controller = require('../controllers/todo-controller');

const router = express.Router();

router.get('/todos', authMiddleware, controller.listTodos);
router.post('/todos', authMiddleware, controller.createTodo);
router.get('/todos/:todoId', authMiddleware, controller.getTodo);
router.patch('/todos/:todoId', authMiddleware, controller.updateTodo);
router.delete('/todos/:todoId', authMiddleware, controller.deleteTodo);

module.exports = router;
