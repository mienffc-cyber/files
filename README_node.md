# げんきポイント — Node.js + MySQL バックエンド

## 構成

```
genki_app/
├── backend/
│   ├── src/
│   │   ├── index.js              # Express サーバー
│   │   ├── db.js                 # MySQL 接続プール
│   │   ├── middleware/
│   │   │   └── auth.js           # JWT 認証ミドルウェア
│   │   └── routes/
│   │       ├── auth.js           # ログイン / me / パスワード変更
│   │       ├── users.js          # ユーザー CRUD + サマリー
│   │       ├── recs.js           # レクタイプ + 参加ログ
│   │       └── rewards.js        # リワード + 交換
│   ├── db/
│   │   └── schema.sql            # DB 初期化 SQL
│   ├── .env.example
│   └── package.json
└── frontend/
    └── index.html                # JWT 認証対応フロントエンド
```

---

## セットアップ手順

### 1. MySQL でデータベースを作成

```bash
mysql -u root -p < backend/db/schema.sql
```

### 2. 環境変数を設定

```bash
cp backend/.env.example backend/.env
# .env を編集して DB_PASSWORD などを設定
```

### 3. Node.js パッケージをインストール

```bash
cd backend
npm install
```

### 4. サーバーを起動

```bash
# 開発（ホットリロード）
npm run dev

# 本番
npm start
```

### 5. フロントエンドを開く

`frontend/index.html` をブラウザで開く。

---

## 初期アカウント

| ユーザー名 | パスワード | 権限 |
|-----------|-----------|------|
| admin     | admin1234 | 管理者 |
| hanako    | user1234  | 利用者 |
| jiro      | user1234  | 利用者 |
| miyo      | user1234  | 利用者 |

> ⚠️ 本番環境では必ずパスワードを変更してください

---

## API 一覧

### 認証
| Method | Path | 説明 |
|--------|------|------|
| POST | /api/auth/login | ログイン → JWT トークン取得 |
| GET  | /api/auth/me | ログインユーザー情報 |
| PUT  | /api/auth/change-password | パスワード変更 |

> 以下すべてのエンドポイントは `Authorization: Bearer <token>` ヘッダーが必要

### ユーザー
| Method | Path | 権限 | 説明 |
|--------|------|------|------|
| GET  | /api/users | staff以上 | ユーザー一覧 |
| POST | /api/users | admin | ユーザー作成 |
| GET  | /api/users/:id | 本人/staff | ユーザー詳細 |
| GET  | /api/users/:id/summary | 本人/staff | 月次サマリー |
| GET  | /api/users/:id/rec-logs | 本人/staff | 参加履歴 |
| GET  | /api/users/:id/reward-logs | 本人/staff | 交換履歴 |

### レク
| Method | Path | 権限 | 説明 |
|--------|------|------|------|
| GET    | /api/rec-types | 全員 | タイプ一覧 |
| POST   | /api/rec-types | staff | タイプ追加 |
| PUT    | /api/rec-types/:id | staff | タイプ編集 |
| DELETE | /api/rec-types/:id | staff | タイプ無効化 |
| POST   | /api/rec/logs | 本人/staff | 参加記録（ポイント加算） |
| DELETE | /api/rec/logs/:id | staff | 記録削除（ポイント取り消し） |

### リワード
| Method | Path | 権限 | 説明 |
|--------|------|------|------|
| GET    | /api/rewards | 全員 | リワード一覧 |
| POST   | /api/rewards | staff | リワード追加 |
| PUT    | /api/rewards/:id | staff | リワード編集 |
| DELETE | /api/rewards/:id | staff | リワード無効化 |
| POST   | /api/rewards/exchange | 本人/staff | 交換（ポイント減算） |

---

## DB 設計

```
users        id, username, password(bcrypt), name, room, role, points, is_active
rec_types    id, name, icon, points, is_active
rec_logs     id, user_id, rec_type_id, participated_on, note, points_earned, created_by
rewards      id, name, icon, description, cost_points, stock, is_active
reward_logs  id, user_id, reward_id, points_used, exchanged_at
```
