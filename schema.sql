-- =============================================
-- げんきポイント データベース初期化
-- =============================================

CREATE DATABASE IF NOT EXISTS genki_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE genki_db;

-- ── ユーザーテーブル ──────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  username   VARCHAR(50)  NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,           -- bcrypt ハッシュ
  name       VARCHAR(100) NOT NULL,
  room       VARCHAR(50),
  role       ENUM('admin','staff','user') NOT NULL DEFAULT 'user',
  points     INT          NOT NULL DEFAULT 0,
  is_active  TINYINT(1)   NOT NULL DEFAULT 1,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ── レクリエーション種類マスター ─────────────
CREATE TABLE IF NOT EXISTS rec_types (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100) NOT NULL UNIQUE,
  icon       VARCHAR(10)  NOT NULL,
  points     INT          NOT NULL DEFAULT 20,
  is_active  TINYINT(1)   NOT NULL DEFAULT 1,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ── 参加ログ ──────────────────────────────────
CREATE TABLE IF NOT EXISTS rec_logs (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  user_id         INT  NOT NULL,
  rec_type_id     INT  NOT NULL,
  participated_on DATE NOT NULL,
  note            TEXT,
  points_earned   INT  NOT NULL,
  created_by      INT,                          -- 記録したスタッフID
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)     REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (rec_type_id) REFERENCES rec_types(id),
  FOREIGN KEY (created_by)  REFERENCES users(id) ON DELETE SET NULL
);

-- ── リワードマスター ──────────────────────────
CREATE TABLE IF NOT EXISTS rewards (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  icon        VARCHAR(10)  NOT NULL,
  description TEXT,
  cost_points INT          NOT NULL,
  stock       INT          NOT NULL DEFAULT 99,
  is_active   TINYINT(1)   NOT NULL DEFAULT 1,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ── リワード交換ログ ──────────────────────────
CREATE TABLE IF NOT EXISTS reward_logs (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT  NOT NULL,
  reward_id   INT  NOT NULL,
  points_used INT  NOT NULL,
  exchanged_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)  REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reward_id) REFERENCES rewards(id)
);

-- =============================================
-- 初期データ
-- =============================================

-- レクタイプ
INSERT IGNORE INTO rec_types (name, icon, points) VALUES
  ('体操・運動',    '🤸', 30),
  ('音楽・歌',     '🎵', 25),
  ('手芸・工作',   '✂️', 25),
  ('脳トレ・ゲーム','🧩', 20),
  ('園芸・自然',   '🌸', 20),
  ('料理・食事会', '🍱', 30),
  ('外出・散歩',   '🚶', 20),
  ('書道・絵画',   '🎨', 25),
  ('その他',       '⭐', 15);

-- リワード
INSERT IGNORE INTO rewards (name, icon, description, cost_points, stock) VALUES
  ('コーヒー券',        '☕', '施設内カフェで使える1杯無料券',   300, 99),
  ('マッサージサービス','💆', '15分の肩・背中マッサージ',        500, 20),
  ('お花プレゼント',    '🌸', '季節のお花を一輪プレゼント',      400, 30),
  ('お好み雑誌',        '📚', 'お好きな雑誌1冊プレゼント',       700, 15),
  ('スイーツセット',    '🍰', '特製スイーツセットをお届け',      600, 25),
  ('特別イベント参加',  '🎭', '特別ゲストイベントへの優先参加', 1000, 10);

-- 管理者アカウント（パスワード: admin1234）
-- ※ 本番では必ず変更してください
-- bcrypt hash of "admin1234" (rounds=10)
INSERT IGNORE INTO users (username, password, name, role) VALUES
  ('admin', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '管理者', 'admin');

-- サンプル利用者（パスワード: user1234）
INSERT IGNORE INTO users (username, password, name, room, role, points) VALUES
  ('hanako', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '田中 花子', '101号室', 'user', 680),
  ('jiro',   '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '山田 次郎', '203号室', 'user', 320),
  ('miyo',   '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '佐藤 美代', '305号室', 'user', 950);
