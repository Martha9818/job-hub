const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { run, get, query } = require('../common/database');
const { generateToken } = require('./middleware');
const { validate, registerSchema, loginSchema } = require('../common/validation');

const router = express.Router();

// 注册
router.post('/register', validate(registerSchema), async (req, res, next) => {
  try {
    const { username, password, email, phone } = req.validated;

    const existing = get('SELECT id FROM users WHERE username = ?', [username]);
    if (existing) {
      return res.status(409).json({ code: 'CONFLICT', message: '用户名已存在' });
    }

    const id = uuidv4();
    const passwordHash = await bcrypt.hash(password, 12);

    run('INSERT INTO users (id, username, password_hash, email, phone) VALUES (?, ?, ?, ?, ?)',
      [id, username, passwordHash, email || null, phone || null]);

    const token = generateToken({ id, username });
    res.status(201).json({
      message: '注册成功',
      data: { id, username, token },
    });
  } catch (err) { next(err); }
});

// 登录
router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { username, password } = req.validated;

    const user = get('SELECT id, username, password_hash FROM users WHERE username = ?', [username]);
    if (!user) {
      return res.status(401).json({ code: 'UNAUTHORIZED', message: '用户名或密码错误' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ code: 'UNAUTHORIZED', message: '用户名或密码错误' });
    }

    const token = generateToken({ id: user.id, username: user.username });
    res.json({
      message: '登录成功',
      data: { id: user.id, username: user.username, token },
    });
  } catch (err) { next(err); }
});

module.exports = router;
