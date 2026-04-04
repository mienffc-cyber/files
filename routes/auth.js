const router = require('express').Router();
const bcrypt = require('bcrypt');
const jwt    = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db     = require('../db');
const { authenticate } = require('../middleware/auth');

const SECRET  = process.env.JWT_SECRET    || 'genki_secret';
const EXPIRES = process.env.JWT_EXPIRES_IN || '24h';

// ── POST /api/auth/login ──────────────────────
router.post('/login',
  body('username').notEmpty().withMessage('ユーザー名を入力してください'),
  body('password').notEmpty().withMessage('パスワードを入力してください'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { username, password } = req.body;

    const [rows] = await db.query(
      'SELECT * FROM users WHERE username = ? AND is_active = 1', [username]
    );
    const user = rows[0];

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'ユーザー名またはパスワードが正しくありません' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, name: user.name, role: user.role },
      SECRET,
      { expiresIn: EXPIRES }
    );

    res.json({
      token,
      user: {
        id:       user.id,
        username: user.username,
        name:     user.name,
        room:     user.room,
        role:     user.role,
        points:   user.points,
      },
    });
  }
);

// ── GET /api/auth/me ──────────────────────────
router.get('/me', authenticate, async (req, res) => {
  const [rows] = await db.query(
    'SELECT id, username, name, room, role, points, created_at FROM users WHERE id = ?',
    [req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'ユーザーが見つかりません' });
  res.json(rows[0]);
});

// ── PUT /api/auth/change-password ─────────────
router.put('/change-password', authenticate,
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 }).withMessage('新パスワードは6文字以上'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const [rows] = await db.query('SELECT password FROM users WHERE id = ?', [req.user.id]);
    const user = rows[0];

    if (!(await bcrypt.compare(req.body.currentPassword, user.password))) {
      return res.status(400).json({ error: '現在のパスワードが正しくありません' });
    }

    const hash = await bcrypt.hash(req.body.newPassword, 10);
    await db.query('UPDATE users SET password = ? WHERE id = ?', [hash, req.user.id]);
    res.json({ message: 'パスワードを変更しました' });
  }
);

module.exports = router;
