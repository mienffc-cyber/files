const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'genki_secret';

// JWT 検証
function authenticate(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: '認証が必要です' });
  }
  try {
    req.user = jwt.verify(auth.slice(7), SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'トークンが無効または期限切れです' });
  }
}

// ロール制限（admin / staff のみ）
function requireStaff(req, res, next) {
  if (!['admin', 'staff'].includes(req.user?.role)) {
    return res.status(403).json({ error: '権限がありません' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: '管理者権限が必要です' });
  }
  next();
}

// 自分自身 or スタッフ以上のみアクセス可
function requireSelfOrStaff(req, res, next) {
  const targetId = parseInt(req.params.userId || req.params.id);
  if (req.user.id === targetId || ['admin', 'staff'].includes(req.user.role)) {
    return next();
  }
  return res.status(403).json({ error: '権限がありません' });
}

module.exports = { authenticate, requireStaff, requireAdmin, requireSelfOrStaff };
