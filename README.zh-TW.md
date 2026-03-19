# Claude Code Organizer

[![npm version](https://img.shields.io/npm/v/@mcpware/claude-code-organizer)](https://www.npmjs.com/package/@mcpware/claude-code-organizer)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)

[English](README.md) | [简体中文](README.zh-CN.md) | 繁體中文 | [日本語](README.ja.md) | [한국어](README.ko.md)

**一個儀表板，幫你管理 Claude Code 的所有記憶、技能、MCP 伺服器和 Hook — 按 scope 分層顯示，拖拉就能跨 scope 搬移。**

![Claude Code Organizer Demo](docs/demo.gif)

## 問題

你有沒有跟 Claude Code 說過「記住這個」，結果它存錯 scope？

舉個例子：你在某個專案資料夾裡，請 Claude 記住一個偏好設定。它就存到了那個專案的 scope 底下。等你切到另一個專案，Claude 完全不曉得有這件事 — 那條記憶就被關在原來的專案裡了。

反過來也很煩：有些技能或記憶放在 global scope，實際上只跟某一個 repo 有關，結果滲透到你所有的專案裡。

想手動修？那你得自己去翻 `~/.claude/` 目錄，在一堆 `-home-user-projects-my-app/` 這種編碼路徑資料夾裡找到對的檔案，自己搬。說真的，很麻煩。

**Claude Code Organizer 就是來解決這件事的。**

### 範例：專案 → 全域

你在某個專案裡讓 Claude 記住了「我偏好 TypeScript + ESM」。但這個偏好你希望全域生效。打開儀表板，把那條記憶從專案 scope 拖到 global scope。搞定。

### 範例：全域 → 專案

你有一個 deploy 技能放在 global，但其實只有一個 repo 用得到。把它拖到那個專案裡 — 其他專案就再也看不到它了。

---

## 功能

- **Scope 分層檢視** — Global > Workspace > Project，層級一目瞭然，附繼承標記
- **拖拉搬移** — 記憶、技能、MCP 伺服器，拖一下就能換 scope
- **搬移前確認** — 每次操作前跳確認視窗，不怕手滑
- **同類型隔離** — 記憶只能搬到記憶資料夾，技能只能搬到技能資料夾，不會搞混
- **搜尋 & 篩選** — 即時搜尋所有項目，可依類別篩選（記憶、技能、MCP、設定、Hook、Plugin、Plan）
- **詳情面板** — 點任意項目查看 metadata、說明、檔案路徑，還能直接用 VS Code 開啟
- **零相依** — 純 Node.js 內建模組，SortableJS 走 CDN
- **真・檔案搬移** — 直接動 `~/.claude/` 裡的檔案，不是只能看的 viewer

## 點解要用視覺化儀表板？

Claude Code 用 CLI 都可以 list 同搬 file。咁點解仲要呢個工具？

| 你想做嘅嘢 | CLI / Skill | 視覺化儀表板 |
|-----------|:-----------:|:----------:|
| **全局視野** — 一次睇晒所有 scope 嘅記憶、技能、MCP 伺服器 | Scroll 一大段 text output | Scope tree，一眼睇晒 |
| **跨 scope 認知** — 理解 Global vs Workspace vs Project 嘅繼承關係 | 行幾條 command，自己喺腦入面砌 | 有縮排嘅 tree 層級 |
| **跨 scope 搬移** | 記住準確路徑，打 command | 拖拉搞掂 |
| **預覽內容** | 逐個 `cat` 檔案 | 撳一下 → 側邊面板 |
| **全局搜尋** | `grep` + 自己 filter | 即時搜尋 + 分類篩選 |
| **了解你有咩** | 自己數每個目錄幾多個 file | 按 scope × 類別自動統計 |

儀表板俾你**text output 做唔到嘅全局視野** — 成個 scope tree 一覽無遺，一眼就見到擺錯位嘅嘢，拖一下就搞掂。唔使背 command，唔使打 path。

## 快速開始

### 方式1：Claude Code Plugin（推薦）

```bash
# 裝成 Plugin — 自動加 /organize 指令
/plugin install claude-code-organizer
```

之後喺 Claude Code 打 `/organize` 就可以開儀表板。

### 方式2：npx（免安裝）

```bash
npx @mcpware/claude-code-organizer
```

### 方式3：全域安裝

```bash
npm install -g @mcpware/claude-code-organizer
claude-code-organizer
```

### 方式4：叫 Claude 幫你跑

直接貼呢段話俾 Claude Code：

> 幫我跑 `npx @mcpware/claude-code-organizer`，這是管理 Claude Code 設定的儀表板。跑起來後告訴我 URL。

瀏覽器打開 `http://localhost:3847`，直接操作你本機的 `~/.claude/` 目錄。

## 管理範圍

| 類型 | 檢視 | 跨 Scope 搬移 |
|------|:----:|:------------:|
| 記憶（feedback、user、project、reference） | ✅ | ✅ |
| 技能 | ✅ | ✅ |
| MCP 伺服器 | ✅ | ✅ |
| 設定（CLAUDE.md、settings.json） | ✅ | 🔒 |
| Hook | ✅ | 🔒 |
| Plugin | ✅ | 🔒 |
| Plan | ✅ | 🔒 |

## Scope 層級

```
Global                        <- 到處生效
  公司 (Workspace)             <- 底下所有子專案繼承
    公司Repo1                  <- 僅限這個專案
    公司Repo2                  <- 僅限這個專案
  Side Project (Project)       <- 獨立專案
  Docs (Project)               <- 獨立專案
```

子 scope 會自動繼承父 scope 的記憶、技能和 MCP 伺服器設定。

## 原理

1. **掃描** `~/.claude/` — 找出所有專案、記憶、技能、MCP 伺服器、Hook、Plugin、Plan
2. **解析層級** — 從檔案系統路徑推導出父子關係
3. **繪製儀表板** — Scope 標題 > 類別列 > 項目清單，自動縮排
4. **處理搬移** — 拖拉或點「移動到…」，後端做完安全檢查後直接搬檔案

## 平台支援

| 平台 | 狀態 |
|------|:----:|
| Ubuntu / Linux | ✅ 已支援 |
| macOS | 應該沒問題（尚未測試） |
| Windows | 暫不支援 |
| WSL | 應該沒問題（尚未測試） |

## 授權

MIT

## 作者

[ithiria894](https://github.com/ithiria894) — 替 Claude Code 生態系打造工具。
