// LỚP API – AuthController: đăng nhập (giao diện) và xem người dùng hiện tại.
const express = require('express');
const { AppError } = require('../errors');
const { authenticate } = require('../middleware/auth');
const authService = require('../services/auth.service');

const router = express.Router();
router.post('/login', (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    if (typeof username !== 'string' || typeof password !== 'string' || !username || !password)
      throw new AppError(400, 'VALIDATION_ERROR', 'username và password là bắt buộc.', { details: ['username', 'password'] });
    res.status(200).json(authService.login(username, password));
  } catch (e) { next(e); }
});
router.get('/me', authenticate, (req, res) => res.status(200).json({ user: req.user }));
module.exports = router;
