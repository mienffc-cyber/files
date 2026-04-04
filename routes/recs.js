const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const db = require('../db');
const { authenticate, requireStaff } = require('../middleware/auth');

// ── GET /api/rec-types ────────────────────────
router.get('/', authenticate, async (req, res) => {
  const [rows] = await db.query(
    'SELECT * FROM rec_types WHERE is_active = 1 ORDER BY id'
  );
  res.json(rows);
});

// ── POST /api/rec-types (staff以上) ──────────
router.post('/', authenticate, requireStaff,
  body('name').notEmpty(),
  body('icon').notEmpty(),
  body('points').isInt({ min: 1 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, icon, points } = req.body;
    const [result] = await db.query(
      'INSERT INTO rec_types (name, icon, points) VALUES (?,?,?)', [name, icon, points]
    );
    res.status(201).json({ id: result.insertId, name, icon, points });
  }
);

// ── PUT /api/rec-types/:id (staff以上) ───────
router.put('/:id', authenticate, requireStaff, async (req, res) => {
  const { name, icon, points } = req.body;
  await db.query(
    'UPDATE rec_types SET name=?, icon=?, points=? WHERE id=?',
    [name, icon, points, req.params.id]
  );
  res.json({ id: parseInt(req.params.id), name, icon, points });
});

// ── DELETE /api/rec-types/:id (staff以上) ────
router.delete('/:id', authenticate, requireStaff, async (req, res) => {
  await db.query('UPDATE rec_types SET is_active = 0 WHERE id = ?', [req.params.id]);
  res.status(204).end();
});

// ─────────────────────────────────────────────
// 参加ログ
// ─────────────────────────────────────────────

// ── POST /api/rec-logs ────────────────────────
router.post('/logs', authenticate,
  body('user_id').isInt(),
  body('rec_type_id').isInt(),
  body('participated_on').isDate(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { user_id, rec_type_id, participated_on, note } = req.body;

    // 自分自身 or スタッフのみ記録可能
    if (req.user.id !== user_id && !['admin','staff'].includes(req.user.role)) {
      return res.status(403).json({ error: '権限がありません' });
    }

    const [users] = await db.query('SELECT id FROM users WHERE id = ? AND is_active = 1', [user_id]);
    if (!users[0]) return res.status(404).json({ error: 'ユーザーが見つかりません' });

    const [types] = await db.query('SELECT * FROM rec_types WHERE id = ? AND is_active = 1', [rec_type_id]);
    if (!types[0]) return res.status(404).json({ error: 'レクタイプが見つかりません' });

    const pts = types[0].points;
    const conn = await require('../db').getConnection();
    try {
      await conn.beginTransaction();

      const [result] = await conn.query(
        'INSERT INTO rec_logs (user_id, rec_type_id, participated_on, note, points_earned, created_by) VALUES (?,?,?,?,?,?)',
        [user_id, rec_type_id, participated_on, note || null, pts, req.user.id]
      );
      await conn.query('UPDATE users SET points = points + ? WHERE id = ?', [pts, user_id]);
      await conn.commit();

      const [updated] = await conn.query('SELECT points FROM users WHERE id = ?', [user_id]);
      res.status(201).json({
        id: result.insertId,
        points_earned: pts,
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

// ── DELETE /api/rec-logs/:id (staff以上) ─────
router.delete('/logs/:id', authenticate, requireStaff, async (req, res) => {
  const [logs] = await db.query('SELECT * FROM rec_logs WHERE id = ?', [req.params.id]);
  if (!logs[0]) return res.status(404).json({ error: 'ログが見つかりません' });

  const conn = await require('../db').getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('UPDATE users SET points = points - ? WHERE id = ?', [logs[0].points_earned, logs[0].user_id]);
    await conn.query('DELETE FROM rec_logs WHERE id = ?', [req.params.id]);
    await conn.commit();
    res.status(204).end();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
});

module.exports = router;
