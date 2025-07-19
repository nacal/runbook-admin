# Runbook Admin - ローカル専用npxツール

## 🎯 プロジェクト概要
**npx runbook-admin** - カレントディレクトリのrunbookファイルを自動検出し、ブラウザでGUI実行できるローカル専用ツール。HonoXベースの軽量アーキテクチャで、開発者の日常的なrunbook実行を劇的に効率化。

**使用シーン**: 
- プロジェクトでのAPIテスト実行
- 開発環境の初期化・リセット
- デバッグ用スクリプトの管理・実行

## 🚀 使用体験

```bash
# プロジェクトディレクトリで実行
cd my-awesome-project

# ワンライナーで起動
npx runbook-admin

# ✨ ブラウザが自動で開く
# 🔍 runbookファイルを自動検出
# 🎨 美しいUIで実行・監視
# 💾 実行履歴を自動保存
```

## 🏠 ローカル専用の設計思想

### **シンプル・軽量・高速**
- **認証不要**: 個人ローカル環境前提
- **設定ミニマル**: ゼロコンフィグで即座に使える
- **依存最小**: HonoX + 必要最小限のライブラリ
- **起動高速**: 1秒以内でブラウザ起動

### **開発ワークフロー統合**
- **自動検出**: runbookファイルをプロジェクト全体からスキャン
- **実行履歴**: 過去の実行結果をローカル保存
- **エラー追跡**: 失敗した実行の詳細分析
- **変数管理**: プロジェクト毎の環境変数プリセット

## 📋 コア機能（厳選）

### 1. 🔍 **自動runbook検出**
- **パターンマッチング**: `**/*.yml`, `**/runbooks/**`, `**/tests/**`
- **階層表示**: フォルダ構造に基づく見やすい表示
- **ライブ更新**: ファイル変更の自動検出・反映
- **除外設定**: `.gitignore`ライクな除外パターン

### 2. ⚡ **直感的な実行**
- **ワンクリック実行**: 設定不要でrunbook実行
- **変数入力UI**: 必要な変数を視覚的フォームで入力
- **リアルタイム進捗**: WebSocketでライブログ表示
- **中断・再開**: 実行中のrunbookを安全に制御

### 3. 📊 **実行管理**
- **履歴表示**: 過去の実行結果・所要時間・成功率
- **エラー分析**: 失敗原因の詳細表示・解決提案
- **お気に入り**: よく使うrunbookのブックマーク
- **最近実行**: 直近の実行結果への素早いアクセス

### 4. 🛠️ **開発支援**
- **Monaco Editor**: runbookファイルの編集・シンタックスハイライト
- **変数補完**: 環境変数・既存変数の自動補完
- **バリデーション**: YAML構文・Runnスキーマ検証
- **プレビュー**: 実行前の変数展開結果プレビュー

### 5. 💾 **ローカルストレージ**
- **実行履歴**: `~/.runbook-admin/history.json`
- **設定**: `~/.runbook-admin/settings.json` 
- **お気に入り**: `~/.runbook-admin/favorites.json`
- **キャッシュ**: runbook一覧の高速表示

## 🛠 技術スタック（軽量特化）

### **コア**
- **HonoX**: フルスタックフレームワーク（ファイルベースルーティング）
- **Node.js**: ローカル実行環境（18.x+）
- **TypeScript**: 型安全開発

### **UI/フロントエンド**
- **hono/jsx**: 軽量JSXランタイム
- **Islands Architecture**: 必要最小限のJavaScript
- **Tailwind CSS**: 高速スタイリング
- **Monaco Editor**: runbook編集体験

### **バックエンド/統合**
- **child_process**: Runn CLI実行
- **chokidar**: ファイル変更監視
- **WebSocket**: リアルタイム通信
- **fs-extra**: ファイル操作

### **パッケージング**
- **npm package**: `npm publish` でグローバル配布
- **bin entry**: `npx runbook-admin` 実行可能
- **pkg**: バイナリ化（オプション）

## 🏗️ シンプルアーキテクチャ

```
┌─────────────────────────────────────────────────────────┐
│                npx runbook-admin                        │
│                                                         │
│  ┌─────────────────┐    ┌─────────────────────────────┐ │
│  │   HonoX App     │    │     File Watcher           │ │
│  │   (localhost)   │◄──►│   chokidar monitor         │ │
│  │                 │    │   **/*.yml changes         │ │
│  └─────────────────┘    └─────────────────────────────┘ │
│           │                           │                 │
│  ┌─────────────────┐    ┌─────────────────────────────┐ │
│  │  Browser UI     │    │     Runn CLI Integration   │ │
│  │                 │    │                            │ │
│  │ ├─ RunbookList  │    │ ├─ child_process.spawn     │ │
│  │ ├─ Execution    │    │ ├─ stdout/stderr capture   │ │
│  │ ├─ Monaco Editor│    │ └─ WebSocket streaming     │ │
│  │ └─ History      │    │                            │ │
│  └─────────────────┘    └─────────────────────────────┘ │
│                                                         │
│  ┌─────────────────────────────────────────────────────┐ │
│  │              Local Storage                          │ │
│  │  ~/.runbook-admin/{history,settings,favorites}     │ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## 📂 プロジェクト構造（最小構成）

```
runbook-admin/
├── src/
│   ├── app/
│   │   ├── routes/
│   │   │   ├── _renderer.tsx        # 共通レイアウト
│   │   │   ├── index.tsx            # メイン画面
│   │   │   ├── runbooks/
│   │   │   │   ├── [id].tsx         # runbook詳細・実行
│   │   │   │   └── edit.tsx         # エディタ
│   │   │   ├── history.tsx          # 実行履歴
│   │   │   └── api/
│   │   │       ├── scan.ts          # ファイルスキャン
│   │   │       ├── execute.ts       # 実行API
│   │   │       └── ws.ts            # WebSocket
│   │   │
│   │   ├── islands/
│   │   │   ├── RunbookCard.tsx      # runbookカード
│   │   │   ├── VariableForm.tsx     # 変数入力
│   │   │   ├── ExecutionView.tsx    # 実行監視
│   │   │   └── MonacoEditor.tsx     # コードエディタ
│   │   │
│   │   ├── lib/
│   │   │   ├── scanner.ts           # ファイル検出
│   │   │   ├── runn.ts              # CLI実行
│   │   │   ├── storage.ts           # ローカル保存
│   │   │   └── types.ts             # 型定義
│   │   │
│   │   └── styles/
│   │       └── globals.css
│   │
│   ├── bin/
│   │   └── runbook-admin.js         # CLI エントリーポイント
│   │
│   └── server.ts                    # HonoXサーバー
│
├── package.json
├── tsconfig.json
└── README.md
```

## ✅ 確定仕様

### **インストール・起動**
```bash
# グローバルインストール（推奨）
npm install -g runbook-admin

# 任意のプロジェクトで起動
cd my-project
runbook-admin

# or npxでインストール不要実行
npx runbook-admin
```

### **自動検出パターン**
```javascript
const patterns = [
  '**/*.runbook.yml',
  '**/runbooks/**/*.yml',
  '**/tests/**/*.yml', 
  '**/*.runn.yml',
  '**/scenarios/**/*.yml'
]

const ignorePatterns = [
  'node_modules/**',
  '.git/**',
  'dist/**',
  'build/**'
]
```

### **設定ファイル（`.runbook-admin.json`）**
```json
{
  "port": 3000,
  "autoOpen": true,
  "patterns": ["**/*.yml"],
  "ignore": ["node_modules/**"],
  "variables": {
    "API_BASE": "http://localhost:8080",
    "DEBUG": "true"
  }
}
```

### **データ保存先**
- **履歴**: `~/.runbook-admin/history.json`
- **設定**: `~/.runbook-admin/config.json`
- **お気に入り**: `~/.runbook-admin/favorites.json`

## 🚀 開発ロードマップ（短期集中）

### **Week 1: MVP（基本機能）**
- [x] HonoXプロジェクトセットアップ
- [ ] ファイル自動検出機能
- [ ] 基本UI（runbook一覧）
- [ ] Runn CLI実行統合
- [ ] npx対応・CLI化

### **Week 2: コア機能**
- [ ] 変数入力フォーム
- [ ] リアルタイム実行監視
- [ ] 実行履歴表示
- [ ] お気に入り機能

### **Week 3: エディタ・最適化**
- [ ] Monaco Editor統合
- [ ] ファイル監視・ライブ更新
- [ ] エラーハンドリング強化
- [ ] パフォーマンス最適化

### **Week 4: 公開準備**
- [ ] ドキュメント整備
- [ ] テスト充実
- [ ] npm package公開
- [ ] 使用例・デモ作成

## 💡 開発者価値

### **日常ワークフロー改善**
- **⚡ 実行時間90%短縮**: GUI化でコマンド入力不要
- **🔍 発見性向上**: プロジェクト全体のrunbook可視化
- **📊 実行追跡**: 成功率・傾向の把握
- **🛠️ デバッグ効率**: エラー原因の迅速特定

### **学習コスト削減**
- **📖 Runnコマンド暗記不要**: GUIで直感的操作
- **🎯 変数入力支援**: 何が必要か一目瞭然
- **💡 実行例学習**: 履歴から使い方を学習

### **チーム標準化**
- **🔄 統一インターフェース**: 誰でも同じ方法で実行
- **📝 実行記録**: 何をいつ実行したか明確
- **🚀 新メンバー支援**: runbook存在の可視化

## 🎯 競合比較

| 項目 | **runbook-admin** | runn CLI | 自作Web UI |
|------|------------------|----------|------------|
| **導入コスト** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ |
| **使いやすさ** | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| **機能豊富さ** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **保守性** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| **起動速度** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |

## 次のステップ

1. **技術検証**: HonoX + ファイル検出の基本実装
2. **MVP開発**: 1週間でワーキングプロトタイプ
3. **ユーザーテスト**: 実際のプロジェクトでの検証
4. **npm公開**: `npx runbook-admin` 実現

---

**シンプル・軽量・高速なローカル専用runbook管理ツールで、開発者の日常を効率化！** 🚀