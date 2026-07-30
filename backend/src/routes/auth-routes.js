/**
 * 인증 라우트 (BE-2)
 */
const express = require('express');
const { signup, login } = require('../controllers/auth-controller');

const router = express.Router();

router.post('/auth/signup', signup);
router.post('/auth/login', login);

module.exports = router;
