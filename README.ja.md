# Claude Code Organizer

[![npm version](https://img.shields.io/npm/v/@mcpware/claude-code-organizer)](https://www.npmjs.com/package/@mcpware/claude-code-organizer)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)

[English](README.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | 日本語 | [한국어](README.ko.md)

**Claude Code のメモリ・スキル・MCPサーバー・フックをまとめて管理できるダッシュボード。スコープ階層で一覧表示、ドラッグ＆ドロップでスコープ間を移動。**

![Claude Code Organizer Demo](docs/demo.gif)

## こんな経験ない？

Claude Code に「これ覚えて」って言ったのに、**違うスコープに保存されてた**こと、ありませんか？

あるあるなのが：プロジェクトフォルダの中で Claude に設定を覚えさせたら、そのプロジェクト専用のスコープに保存される。別のプロジェクトに切り替えると、Claude はその設定を知らない。メモリが元のプロジェクトに閉じ込められてしまう。

逆パターンもある — グローバルスコープに入ってるスキルやメモリが、実は特定のリポジトリでしか使わないのに、全プロジェクトに漏れてしまう。

手動で直す？ `~/.claude/` の中を掘って、`-home-user-projects-my-app/` みたいなエンコードされたパスのフォルダを探して、該当ファイルを見つけて自分で移動する……正直、かなり面倒。

**Claude Code Organizer はこの問題を解決します。**

### 例：プロジェクト → グローバル

プロジェクト内で Claude に「TypeScript + ESM がいい」と覚えさせた。でもこの設定、全プロジェクトで使いたい。ダッシュボードを開いて、そのメモリをプロジェクトからグローバルにドラッグ。以上。

### 例：グローバル → プロジェクト

グローバルにデプロイ用スキルがあるけど、実際に使うのは1つのリポジトリだけ。そのプロジェクトにドラッグすれば、他のプロジェクトからは見えなくなる。スッキリ。

---

## 機能

- **スコープ階層ビュー** — Global > Workspace > Project で整理、継承関係もひと目でわかる
- **ドラッグ＆ドロップ** — メモリ・スキル・MCPサーバーをスコープ間で移動
- **移動前に確認** — ファイルを触る前に必ず確認ダイアログが出る
- **型の安全性** — メモリはメモリフォルダにだけ、スキルはスキルフォルダにだけ移動可能
- **検索＆フィルター** — 全アイテムをリアルタイム検索、カテゴリ別フィルター（メモリ、スキル、MCP、設定、フック、プラグイン、プラン）
- **詳細パネル** — アイテムをクリックするとメタデータ・説明・ファイルパスを表示、VS Code で直接開ける
- **依存ゼロ** — 純粋な Node.js ビルトインモジュールのみ、SortableJS は CDN 経由
- **ガチのファイル移動** — `~/.claude/` 内のファイルを実際に移動する。閲覧専用ツールじゃない

## クイックスタート

```bash
# そのまま実行（インストール不要）
npx @mcpware/claude-code-organizer

# グローバルインストールしてもOK
npm install -g @mcpware/claude-code-organizer
claude-code-organizer
```

もしくは、Claude Code にこう伝えるだけ：

> `npx @mcpware/claude-code-organizer` を実行して。Claude Code の設定を管理するダッシュボードだよ。URLを教えて。

`http://localhost:3847` でダッシュボードが開きます。実際の `~/.claude/` ディレクトリを操作します。

## 管理できるもの

| タイプ | 閲覧 | スコープ間移動 |
|--------|:----:|:------------:|
| メモリ（feedback、user、project、reference） | ✅ | ✅ |
| スキル | ✅ | ✅ |
| MCPサーバー | ✅ | ✅ |
| 設定（CLAUDE.md、settings.json） | ✅ | 🔒 |
| フック | ✅ | 🔒 |
| プラグイン | ✅ | 🔒 |
| プラン | ✅ | 🔒 |

## スコープ階層

```
Global                       <- 全プロジェクトに適用
  会社 (Workspace)            <- 配下の全サブプロジェクトに適用
    会社リポ1                  <- このプロジェクト専用
    会社リポ2                  <- このプロジェクト専用
  個人開発 (Project)           <- 独立したプロジェクト
  ドキュメント (Project)        <- 独立したプロジェクト
```

子スコープは親スコープのメモリ・スキル・MCPサーバーを自動的に継承します。

## 仕組み

1. **スキャン** `~/.claude/` — プロジェクト・メモリ・スキル・MCPサーバー・フック・プラグイン・プランを検出
2. **階層を解決** — ファイルシステムのパスから親子関係を特定
3. **ダッシュボード描画** — スコープヘッダー > カテゴリバー > アイテム行、適切にインデント
4. **移動処理** — ドラッグまたは「移動先…」クリックで、安全チェック付きでファイルを実際に移動

## プラットフォーム

| プラットフォーム | 状態 |
|----------------|:----:|
| Ubuntu / Linux | ✅ サポート済み |
| macOS | たぶん動く（未テスト） |
| Windows | 未対応 |
| WSL | たぶん動く（未テスト） |

## ライセンス

MIT

## 作者

[ithiria894](https://github.com/ithiria894) — Claude Code エコシステム向けのツールを開発中。
