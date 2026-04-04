require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const authRoutes   = require('./routes/auth');
const userRoutes   = require('./routes/users');
const recRoutes    = require('./routes/recs');
const rewardRoutes = require('./routes/rewards');

const app  = express();
const PORT = process.env.PORT || 8000;

// ── ミドルウェア ──────────────────────────────
const origins = (process.env.CORS_ORIGINS || 'http://localhost:3000')
  .split(',').map(s => s.trim());

app.use(cors({ origin: origins, credentials: true }));
app.use(express.json());

// リクエストログ（開発用）
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()}  ${req.method} ${req.path}`);
  next();
});

// ── ルート ────────────────────────────────────
app.use('/api/auth',    authRoutes);
app.use('/api/users',   userRoutes);
app.use('/api/rec-types', recRoutes);   // GET/POST/PUT/DELETE rec-types
app.use('/api/rec',     recRoutes);     // POST/DELETE rec/logs
app.use('/api/rewards', rewardRoutes);

// ── ヘルスチェック ────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', app: 'げんきポイント API', version: '1.0.0' });
});

// ── エラーハンドラ ────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'サーバーエラーが発生しました' });
});

app.listen(PORT, () => {
  console.log(`\n🌿 げんきポイント API 起動中 → http://localhost:${PORT}`);
  console.log(`   ヘルスチェック: http://localhost:${PORT}/api/health\n`);
});
