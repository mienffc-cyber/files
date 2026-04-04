const router = require('express').Router();
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const { authenticate, requireStaff, requireAdmin, requireSelfOrStaff } = require('../middleware/auth');

// ── GET /api/users  (staff以上) ───────────────
router.get('/', authenticate, requireStaff, async (req, res) => {
  const [rows] = await db.query(
    'SELECT id, username, name, room, role, points, is_active, created_at FROM users ORDER BY id'
  );
  res.json(rows);
});

// ── POST /api/users (admin のみ) ──────────────
router.post('/', authenticate, requireAdmin,
  body('username').notEmpty(),
  body('password').isLength({ min: 6 }),
  body('name').notEmpty(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { username, password, name, room, role = 'user' } = req.body;
    const hash = await bcrypt.hash(password, 10);

    try {
      const [result] = await db.query(
        'INSERT INTO users (username, password, name, room, role) VALUES (?,?,?,?,?)',
        [username, hash, name, room || null, role]
      );
      res.status(201).json({ id: result.insertId, username, name, room, role, points: 0 });
    } catch (e) {
      if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'そのユーザー名は既に使われています' });
      throw e;
    }
  }
);

// ── GET /api/users/:userId ────────────────────
router.get('/:userId', authenticate, requireSelfOrStaff, async (req, res) => {
  const [rows] = await db.query(
    'SELECT id, username, name, room, role, points, created_at FROM users WHERE id = ?',
    [req.params.userId]
  );
  if (!rows[0]) return res.status(404).json({ error: 'ユーザーが見つかりません' });
  res.json(rows[0]);
});

// ── GET /api/users/:userId/summary ───────────
router.get('/:userId/summary', authenticate, requireSelfOrStaff, async (req, res) => {
  const uid = req.params.userId;
  const [users] = await db.query('SELECT * FROM users WHERE id = ?', [uid]);
  if (!users[0]) return res.status(404).json({ error: 'ユーザーが見つかりません' });

  // 今月の参加数・獲得ポイント
  const [monthly] = await db.query(`
    SELECT COUNT(*) AS cnt, COALESCE(SUM(points_earned),0) AS pts
    FROM rec_logs
    WHERE user_id = ?
      AND YEAR(participated_on)  = YEAR(CURDATE())
      AND MONTH(participated_on) = MONTH(CURDATE())
  `, [uid]);

  // 連続参加日数（直近から逆算）
  const [dates] = await db.query(`
    SELECT DISTINCT participated_on FROM rec_logs
    WHERE user_id = ? ORDER BY participated_on DESC
  `, [uid]);

  let streak = 0;
  let check = new Date(); check.setHours(0,0,0,0);
  for (const row of dates) {
    const d = new Date(row.participated_on);
    if (d.toDateString() === check.toDateString()) {
      streak++;
      check.setDate(check.getDate() - 1);
    } else if (d < check) break;
  }

  const u = users[0];
  res.json({
    user: { id: u.id, username: u.username, name: u.name, room: u.room, role: u.role, points: u.points },
    month_count:  monthly[0].cnt,
    month_points: monthly[0].pts,
    streak_days:  streak,
  });
});

// ── GET /api/users/:userId/rec-logs ──────────
router.get('/:userId/rec-logs', authenticate, requireSelfOrStaff, async (req, res) => {
  const [rows] = await db.query(`
    SELECT l.*, t.name AS type_name, t.icon AS type_icon
    FROM rec_logs l
    JOIN rec_types t ON l.rec_type_id = t.id
    WHERE l.user_id = ?
    ORDER BY l.participated_on DESC, l.id DESC
  `, [req.params.userId]);
  res.json(rows);
});

// ── GET /api/users/:userId/reward-logs ───────
router.get('/:userId/reward-logs', authenticate, requireSelfOrStaff, async (req, res) => {
  const [rows] = await db.query(`
    SELECT l.*, r.name AS reward_name, r.icon AS reward_icon
    FROM reward_logs l
    JOIN rewards r ON l.reward_id = r.id
    WHERE l.user_id = ?
    ORDER BY l.exchanged_at DESC
  `, [req.params.userId]);
  res.json(rows);
});

module.exports = router;
