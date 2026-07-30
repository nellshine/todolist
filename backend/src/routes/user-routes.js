/**
 * 사용자(계정) 라우트 (BE-7)
 */
const express = require('express');
const authMiddleware = require('../middlewares/auth-middleware');
const controller = require('../controllers/user-controller');

const router = express.Router();

router.get('/users/me', authMiddleware, controller.getMe);
router.patch('/users/me', authMiddleware, controller.updateMe);

module.exports = router;
