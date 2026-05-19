# 占いサイト「忖度なしの相性占い」開発 - 引き継ぎメモ

このドキュメントは、Claude.aiでの作業を Claude Code に引き継ぐためのメモです。

---

## 0. 大前提のお願い（先生モードで動いて）

ユーザーは技術初心者です。以下のルールを **必ず** 守ってください：

1. **コマンドを実行する前に、何のコマンドか日本語でわかりやすく説明する**
2. **ファイルを編集する前に、何をどう変えるか日本語で説明する**
3. **専門用語は使わず、初心者向けに噛み砕いて説明する**
4. **1つの作業ごとにユーザーの確認を取ってから次に進む**（勝手に複数ステップ進めない）
5. **「なぜこの作業が必要か」を毎回説明する**（理由なしに作業を進めない）
6. **エラーが出たら、その原因と対処法を日本語で説明する**
7. **「今ここ」が分かるように、進捗を都度伝える**

---

## 1. プロジェクト概要

- **サイト名**: 忖度なしの相性占い
- **構成**: React + Vite
- **機能**: 2人の情報を入力すると、AI×5占術（九星気学・四柱推命・姓名判断・西洋占星術・星座）で相性を鑑定
- **使用AI**: Anthropic Claude（モデル: `claude-haiku-4-5-20251001`）
- **コンセプト**: 「忖度なし」= 他のAI鑑定が綺麗事ばかりの中、ガチで本音を言うのが差別化ポイント

### プロジェクトの場所
- ローカル: `C:\Users\Owner\uranai\`
- GitHubアカウント: `uranai-site`
- リポジトリ: https://github.com/uranai-site/uranai
- ブランチ: `master`

### 開発環境
- OS: Windows 11
- エディタ: VS Code（Claude Code拡張機能インストール済み）
- ターミナル: PowerShell
- Node.js: インストール済み（`npm run dev`で起動できる）
- 開発サーバー: `localhost:5173`（Vite v8.0.10）

### Claudeプラン
- ユーザーは **Maxプラン（5x）** に加入済み
- Claude Codeは追加料金なしで使用可能（Maxプランの利用枠で動作）

---

## 2. これまでの経緯（やったこと）

### ✅ 完了済み

1. **危険なAPIキーをrevoke**
   - 元々App.jsxに直書きされていたAPIキー（`sk-ant-api03-tZ7L6tx...`）が会話中にスクショで露出した
   - Anthropic Consoleで該当キーを削除（urana13という名前のキー）

2. **新しいAPIキーを作成**
   - Anthropic Consoleで新規キー作成済み
   - ユーザーがメモ帳ファイルに保管している
   - **このキーはまだApp.jsxには反映されていない**（古いキーのまま）

3. **ローカルの未コミット変更をリセット**
   - `git checkout .` を実行
   - `src/App.css` の削除と `src/App.jsx` の意図しない変更を破棄
   - 現在 `nothing to commit, working tree clean` 状態
   - GitHubの最新（origin/master）と完全に同期済み

4. **Claude Codeのセットアップ**
   - VS Codeに「Claude Code for VS Code」拡張機能（Anthropic公式）インストール済み
   - Claude.ai Subscription（Maxプラン）と連携済み

---

## 3. 現在のApp.jsxの問題点（要修正）

### ⚠️ セキュリティ問題

App.jsx内に以下のような危険なコードがある（1500行目付近）：

```javascript
headers: {
  "Content-Type": "application/json",
  "anthropic-dangerous-direct-browser-access": "true",  // ← 危険モード有効
  "x-api-key": "sk-ant-api03-..."  // ← APIキー直書き
}
```

これらは：
- ブラウザから直接Anthropic APIを叩く危険な構成
- ソースコードを見れば誰でもキーを盗める
- GitHubに公開リポジトリとして上がっている時点で漏洩リスク

### ファイル構造

- App.jsxは **約2,037行、240万文字** と非常に大きい（CSS、占術データ、AIプロンプト、計算ロジック、JSXが全部1ファイルに同居）
- 将来的にファイル分割もしたいが、今回の作業範囲ではない

---

## 4. 今日やりたいこと（作業順序）

### Phase 1：基盤整備 ⭐ 最優先

1. **`.gitignore`に`.env`系を追加**
   - 現在の`.gitignore`は標準のViteテンプレート
   - `.env`、`.env.local`、`.env*.local`が除外設定に入っていないので追加する
   - これをやらないと、次のステップで作る`.env`がGitHubに漏洩する

2. **`.env`ファイルを作成**
   - `C:\Users\Owner\uranai\.env`
   - 中身: `ANTHROPIC_API_KEY=sk-ant-api03-...`（ユーザーが新しいキーを保管中、本人に貼ってもらう）

3. **`/api`フォルダを作成し、Vercel API Routesを実装**
   - `api/fortune.js`（または`.ts`）を作成
   - サーバーサイドでAnthropic APIを呼ぶ構成
   - `@anthropic-ai/sdk` を使うのが推奨

4. **`@anthropic-ai/sdk`をインストール**
   - `npm install @anthropic-ai/sdk`

5. **App.jsxを修正**
   - 直接Anthropic APIを叩いてる部分を削除
   - 自分のサーバー（`/api/fortune`）を叩くように変更
   - `anthropic-dangerous-direct-browser-access` ヘッダーを削除
   - `x-api-key` の直書きを削除

6. **`vite.config.js`を修正**
   - ローカル開発（`npm run dev`）時に`/api`へのリクエストをVercel開発サーバーにプロキシする設定
   - またはVercel CLIをインストールして `vercel dev` で動かす方式も検討

7. **ローカルで動作確認**
   - `npm run dev` または `vercel dev` で起動
   - 占いが正常に動くか確認
   - APIキーがブラウザのDevToolsで漏れていないか確認

### Phase 2：マネタイズ機能を仮組み

ユーザーは以下のマネタイズ方針を採用予定：

**「無料基本鑑定 + 月額200円サブスク + 控えめな広告」**

- 🆓 **無料**: 基本相性鑑定（今の機能）、1日1回まで
- 💎 **ベーシック（月額200円）**:
  - 鑑定回数無制限
  - 月運勢・週運勢
  - 過去の鑑定履歴を保存
  - 広告非表示
  - ラッキーアイテム/カラー詳細
- ⭐ **プレミアム単発（500円〜）**: 「人生の転機鑑定」、PDF鑑定書発行など

実装方針：
- **決済はまだ繋がない**（Stripe連携は後日）
- ボタンや画面遷移、無料/有料の切り替えロジックの「ガワ」だけ仮組み
- 「もし有料機能ONにしたらどうなるか」をローカルで体験できる状態にする
- 広告枠も後で有効化できるよう枠だけ準備

### Phase 3：磨き込み（数日〜数週間）

**ローカルで磨き込み中だから、ユーザーが指示する内容に都度対応して。**

- 鑑定文のクオリティ調整（口調、辛口度、深さ、長さなど）
- UIの調整
- 計算ロジックの精度向上
- 新機能の追加
- 「忖度なし」コンセプトを強化する文言調整

### Phase 4：公開（完成度に納得してから）

- Vercelにデプロイ
- Stripe連携で実際に課金できるように
- AdSense審査・設置
- ドメイン設定（必要なら）

---

## 5. 注意事項

### セキュリティ
- 新しいAPIキーは**絶対にApp.jsxやその他のソースコードに書かない**
- `.env`ファイルは**絶対にGitHubにpushしない**（`.gitignore`必須）
- コミット前に必ず`git status`と`git diff`で確認する
- VercelにデプロイするときはVercelの環境変数機能でAPIキーを設定する

### Git運用
- 大きい変更をする前に `git status` で状態確認
- 区切りごとに `git commit` してロールバックできるようにする
- コミットメッセージは日本語OK
- リモートへの`push`は変更内容を確認してから実行

### ユーザーへの配慮
- ユーザーは技術初心者なので**いきなり複雑なコマンドを連発しない**
- 「これから〇〇します。なぜなら〜」を毎回伝える
- エラーが出たら焦らせず、丁寧に原因と対処を説明する
- ファイル削除・上書きなど **戻せない操作の前は必ず確認を取る**

### コード品質
- 既存のコーディングスタイルにできるだけ合わせる
- 大規模なリファクタリング（ファイル分割など）は別タスクとして提案するに留める
- 動作確認を怠らない

---

## 6. 最初のアクション

このメモを読んだら、以下の順で進めてください：

1. **このメモの内容をユーザーに要約して伝える**（「こういう状況で、こう進めたいんですね」と確認）
2. **質問があれば最初に聞く**（不明点をクリアにしてから着手）
3. **ユーザーの確認を取って Phase 1 のステップ1から開始する**

---

## 7. 参考情報

### Vercel API Routesの基本構成例

```
uranai/
├── api/
│   └── fortune.js     ← サーバーサイド処理
├── src/
│   └── App.jsx        ← フロントエンド
├── .env               ← APIキー（ローカル用、gitignore必須）
├── package.json
└── vite.config.js
```

`api/fortune.js` の雛形（参考）：
```javascript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  
  try {
    const { messages, model } = req.body;
    const response = await client.messages.create({
      model: model || "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      messages,
    });
    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
```

### App.jsxの該当箇所
- API呼び出しは1500行目付近
- 検索キーワード: `x-api-key`、`anthropic-dangerous-direct-browser-access`、`fetch(`
- AIプロンプトは `buildMessages` 関数内

---

以上です。よろしくお願いします！
