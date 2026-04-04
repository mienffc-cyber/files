const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const db = require('../db');
const { authenticate, requireStaff } = require('../middleware/auth');

// ── GET /api/rewards ──────────────────────────
router.get('/', authenticate, async (req, res) => {
  const [rows] = await db.query(
    'SELECT * FROM rewards WHERE is_active = 1 ORDER BY cost_points'
  );
  res.json(rows);
});

// ── POST /api/rewards (staff以上) ─────────────
router.post('/', authenticate, requireStaff,
  body('name').notEmpty(),
  body('cost_points').isInt({ min: 1 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, icon = '🎁', description, cost_points, stock = 99 } = req.body;
    const [result] = await db.query(
      'INSERT INTO rewards (name, icon, description, cost_points, stock) VALUES (?,?,?,?,?)',
      [name, icon, description || null, cost_points, stock]
    );
    res.status(201).json({ id: result.insertId, name, icon, description, cost_points, stock });
  }
);

// ── PUT /api/rewards/:id (staff以上) ──────────
router.put('/:id', authenticate, requireStaff, async (req, res) => {
  const { name, icon, description, cost_points, stock } = req.body;
  await db.query(
    'UPDATE rewards SET name=?, icon=?, description=?, cost_points=?, stock=? WHERE id=?',
    [name, icon, description, cost_points, stock, req.params.id]
  );
  res.json({ id: parseInt(req.params.id), name, icon, description, cost_points, stock });
});

// ── DELETE /api/rewards/:id (staff以上) ───────
router.delete('/:id', authenticate, requireStaff, async (req, res) => {
  await db.query('UPDATE rewards SET is_active = 0 WHERE id = ?', [req.params.id]);
  res.status(204).end();
});

// ── POST /api/rewards/exchange ─────────────────
router.post('/exchange',
  authenticate,
  body('user_id').isInt(),
  body('reward_id').isInt(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { user_id, reward_id } = req.body;

    // 自分自身 or スタッフのみ
    if (req.user.id !== user_id && !['admin','staff'].includes(req.user.role)) {
      return res.status(403).json({ error: '権限がありません' });
    }

    const [users]   = await db.query('SELECT * FROM users   WHERE id = ? AND is_active = 1', [user_id]);
    const [rewards] = await db.query('SELECT * FROM rewards WHERE id = ? AND is_active = 1', [reward_id]);

    if (!users[0])   return res.status(404).json({ error: 'ユーザーが見つかりません' });
    if (!rewards[0]) return res.status(404).json({ error: 'リワードが見つかりません' });

    const user   = users[0];
    const reward = rewards[0];

    if (user.points < reward.cost_points) {
      return res.status(400).json({
        error: `ポイントが不足しています（必要: ${reward.cost_points}pt / 現在: ${user.points}pt）`
      });
    }
    if (reward.stock <= 0) {
      return res.status(400).json({ error: '在庫がありません' });
    }

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query('UPDATE users   SET points = points - ?    WHERE id = ?', [reward.cost_points, user_id]);
      await conn.query('UPDATE rewards SET stock  = stock  - 1    WHERE id = ?', [reward_id]);
      await conn.query(
        'INSERT INTO reward_logs (user_id, reward_id, points_used) VALUES (?,?,?)',
        [user_id, reward_id, reward.cost_points]
      );
      await conn.commit();

      const [updated] = await conn.query('SELECT points FROM users WHERE id = ?', [user_id]);
      res.json({
        message:      `「${reward.name}」と交換しました`,
        points_used:  reward.cost_points,
        total_points: updated[0].points,
      });
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }
);

module.exports = router;
