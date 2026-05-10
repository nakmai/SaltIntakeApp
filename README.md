# 塩分管理アプリ (Salt Intake App)

栄養成分表示の写真から食塩相当量を読み取り、1日の合計を可視化する Web アプリ。

- **Stack**: Next.js (App Router) + TypeScript + Tailwind CSS
- **DB**: MySQL 8 (Prisma)。本番は **Azure Database for MySQL Flexible Server**、ローカルは Docker
- **Auth**: NextAuth (Auth.js v5) + Google OAuth
- **OCR**: Azure OpenAI (vision-capable chat completion)
- **配信形態**: 通常の Web アプリ。スマホ・タブレット・PC のレスポンシブ対応

## セットアップ

### 1. 依存インストール

```bash
npm install
```

### 2. 環境変数

`.env.example` をコピーして `.env` を作成し、各値を埋める:

```bash
cp .env.example .env
```

最低限必要な値:

| 変数 | 用途 |
|---|---|
| `DATABASE_URL` | MySQL 接続文字列 |
| `AUTH_SECRET` | `openssl rand -base64 32` で生成 |
| `AUTH_URL` | 例 `http://localhost:3000` |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google OAuth クレデンシャル |
| `AZURE_OPENAI_ENDPOINT` | 例 `https://xxx.openai.azure.com` |
| `AZURE_OPENAI_API_KEY` | Azure OpenAI のキー |
| `AZURE_OPENAI_DEPLOYMENT` | 作成した vision 対応デプロイ名 |

### 3. 開発 (ローカル)

DB だけ Docker で立ててアプリは npm run dev で動かすのがおすすめ:

```bash
docker compose up -d db
npx prisma migrate dev
npm run dev
```

http://localhost:3000 でアクセス。

### 4. すべて Docker で起動

```bash
docker compose up --build
```

## 主な画面

- `/` ホーム: 当日の合計と進捗バー、当日の記録一覧
- `/capture` 撮影: カメラ起動 → Azure OpenAI で食塩相当量を抽出 → 編集画面へ
- `/intake/new` 手入力: 醤油などラベルが無い・1回量が分からない食品の手動登録
- `/intake/[id]/edit` 編集 / 削除
- `/history` 履歴: 直近 14 日の日次合計

## アーキテクチャメモ

### Intake モデル

1 行 = 1 回の摂取。「実際に食べた分の食塩相当量(g)」を `saltGrams` に保存しているので、合計は単純な SUM。

OCR の生応答は `ocrRawText` に残してあり、編集画面の details で確認できます。

### Azure DB の選定

最初は Azure Blob Storage も検討しましたが、Blob はオブジェクトストレージで、SUM や期間絞り込みのようなクエリに向きません。
本アプリでは `Azure Database for MySQL Flexible Server` を採用。Prisma がスキーマ管理・型生成・マイグレーションをまとめて担当します。

### OCR 戦略

`src/lib/azure-openai.ts` で Azure OpenAI のチャット補完 API (vision) を呼び、JSON モードで以下を返させます:

```json
{
  "name": "...",
  "saltGrams": 2.5,
  "basis": "1袋 (75g) あたり",
  "sodiumMg": 985,
  "rawText": "...",
  "confidence": "high"
}
```

ナトリウム(mg)しか取れなかった場合は `Na × 2.54 / 1000` で食塩相当量(g)を換算します。

`AZURE_OPENAI_DEPLOYMENT` はあなたが Azure に作成したデプロイ名をそのまま使います (`gpt-5.2`, `gpt-4o` 等)。コードはモデル名に依存しません。
