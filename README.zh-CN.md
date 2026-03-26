# Claude Code Organizer

[![npm version](https://img.shields.io/npm/v/@mcpware/claude-code-organizer)](https://www.npmjs.com/package/@mcpware/claude-code-organizer)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)

[English](README.md) | 简体中文 | [繁體中文](README.zh-TW.md) | [廣東話](README.zh-HK.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Español](README.es.md) | [Bahasa Indonesia](README.id.md) | [Italiano](README.it.md) | [Português](README.pt-BR.md) | [Türkçe](README.tr.md) | [Tiếng Việt](README.vi.md) | [ไทย](README.th.md)

**一个仪表盘，帮你管理 Claude Code 的所有记忆、技能、MCP 服务器和钩子 — 按作用域分层展示，拖拽即可跨作用域移动。**

![Claude Code Organizer Demo](docs/demo.gif)

## 问题

每次你使用 Claude Code 时，有两件事在默默发生 — 而你完全看不到。

### 问题 1：你根本不知道 context 已经用了多少

这是一个使用两周后的真实项目目录：

![Context Budget](docs/democontextbudged.png)

**如果你在这个目录下启动 Claude Code session，在你开始对话之前就已经加载了 70.9K tokens。** 也就是你 200K context window 的 35.4% — 你还没输入一个字就没了。光是这些开销的估计成本：Opus 每个 session $1.06 USD，Sonnet $0.21 USD。

剩下的 64.5% 要和你的消息、Claude 的回复以及 tool results 共享，直到 context compression 启动。Context 越满，Claude 越不准 — 这个效应叫做 **context rot**。

70.9K 从哪来的？它包括所有我们可以**离线测量**的内容 — 你的 CLAUDE.md、记忆、技能、MCP server 定义、设置、Hook、规则、命令和代理 — 逐项计算 token。再加上一个**估算的系统开销**（~21K tokens），也就是 Claude Code 每次 API call 都会加载的固定基础设施：system prompt、23+ 个内置 tool 定义和 MCP tool schemas。

而这还只是数得到的部分。它**不包括** **runtime injections** — Claude Code 在 session 期间静默添加的 tokens：

- **Rule re-injection** — 你所有的 rule 文件在每次 tool call 之后都会被重新注入 context。大约 ~30 次 tool call 之后，光是这一项就能占掉你 ~46% 的 context window
- **File change diffs** — 当你读过或写过的文件被外部修改（比如 linter），完整的 diff 会作为隐藏的 system-reminder 注入
- **System reminders** — malware 警告、token 提示和其他隐藏的 injections 会附加在消息后面
- **Conversation history** — 你的消息、Claude 的回复和所有 tool results 在每次 API call 时都会被重新发送

你在 session 中的实际用量远远高于 70.9K。你只是看不到。

### 问题 2：你的 context 被污染了

Claude Code 每次你工作时都会默默创建记忆、技能、MCP config、命令、代理和规则 — 然后丢进和你当前目录匹配的 scope。你想要全局生效的偏好？被锁在某个项目里。只属于某个仓库的 deploy 技能？泄漏到 global，污染你所有其他项目。

一个 Python pipeline 技能放在 global，结果每次你开 React frontend session 都会被加载。重复的 MCP entry 会初始化同一个 server 两次。过时的记忆和你当前的指令互相矛盾。每一个放错位置的项目都在浪费 token **并且**降低准确度。

你没有办法看到全貌。没有任何一条命令可以一次显示所有 scope、所有项目、所有继承关系。

### 解决办法：可视化仪表盘

```bash
npx @mcpware/claude-code-organizer
```

一条命令。看到 Claude 存了什么 — 按 scope 层级排好。**开始之前就看到你的 token 预算。** 在 scope 之间拖拽移动。删除过时记忆。找出重复项目。掌控什么在真正影响 Claude 的行为。

> **首次运行会自动安装 `/cco` skill** — 之后在任何 Claude Code session 里输入 `/cco` 就能打开仪表盘。

### 示例：找出什么在吃你的 tokens

打开仪表盘，点击 **Context Budget**，切换到 **By Tokens** — 最大的消耗者会排在最上面。一个你忘了的 2.4K token CLAUDE.md？一个在三个 scope 里重复的技能？现在你看到了。清理它，省下 10-20% 的 context window。

### 示例：修复 scope 污染

你在某个项目里告诉 Claude「我喜欢 TypeScript + ESM」，但这个偏好应该全局生效。把那条记忆从 Project 拖到 Global。**搞定。拖一下。** 一个 deploy 技能放在 global 但其实只有一个仓库用得到？拖进那个 Project scope — 其他项目就不会再看到它了。

### 示例：删除过时记忆

Claude 会自动记住你随口说的东西，或者它*以为*你想记住的东西。一周后已经没用了但还是每次 session 都加载。浏览、阅读、删除。**你来决定 Claude 以为自己知道你什么。**

---

## 功能

- **作用域分层视图** — 全局 > 工作区 > 项目，清晰的层级关系，还有继承标记
- **拖拽移动** — 记忆、技能、MCP 服务器，拖一下就能换作用域
- **移动前确认** — 每次操作前弹确认框，不会误操作
- **类型隔离** — 记忆只能移到记忆文件夹，技能只能移到技能文件夹，不会搞混
- **搜索 & 筛选** — 实时搜索所有条目，支持按类别筛选（记忆、技能、MCP、配置、钩子、插件、计划）
- **Context Budget** — 在你开始输入之前就看到你的 config 占了多少 tokens — 逐项分析、继承的 scope 成本、系统开销估算、以及 200K context 的使用百分比
- **详情面板** — 点击任意条目查看元数据、描述、文件路径，还能直接用 VS Code 打开
- **零依赖** — 纯 Node.js 内置模块，SortableJS 走 CDN
- **真·文件移动** — 直接操作 `~/.claude/` 目录里的文件，不是什么只读查看器
- **100+ E2E 测试** — Playwright 测试套件，覆盖 filesystem 验证、安全性（路径穿越、格式错误输入）、context budget 和所有 11 个类别

## 快速上手

### 方式1：npx（免安装）

```bash
npx @mcpware/claude-code-organizer
```

### 方式2：全局安装

```bash
npm install -g @mcpware/claude-code-organizer
claude-code-organizer
```

### 方式3：让 Claude 帮你跑

直接把这段话丢给 Claude Code：

> 帮我跑 `npx @mcpware/claude-code-organizer`，这是一个管理 Claude Code 设置的仪表盘。跑起来之后告诉我 URL。

浏览器打开 `http://localhost:3847`，直接操作你本地的 `~/.claude/` 目录。

## 管理范围

| 类型 | 查看 | 跨作用域移动 |
|------|:----:|:----------:|
| 记忆（反馈、用户、项目、引用） | ✅ | ✅ |
| 技能 | ✅ | ✅ |
| MCP 服务器 | ✅ | ✅ |
| 配置（CLAUDE.md、settings.json） | ✅ | 🔒 |
| 钩子 | ✅ | 🔒 |
| 插件 | ✅ | 🔒 |
| 计划 | ✅ | 🔒 |

## 作用域层级

```
全局                          <- 到处生效
  公司 (工作区)                <- 下面所有子项目都继承
    公司仓库1                  <- 仅限这个项目
    公司仓库2                  <- 仅限这个项目
  个人项目 (项目)              <- 独立项目
  文档 (项目)                  <- 独立项目
```

子作用域自动继承父作用域的记忆、技能和 MCP 服务器配置。

## 原理

1. **扫描** `~/.claude/` — 找出所有项目、记忆、技能、MCP 服务器、钩子、插件、计划
2. **解析层级** — 根据文件系统路径推导出父子关系
3. **渲染仪表盘** — 作用域标题 > 类别栏 > 条目列表，自动缩进
4. **处理移动** — 拖拽或点"移动到…"，后台做完安全检查后直接移动文件

## 平台

| 平台 | 状态 |
|------|:----:|
| Ubuntu / Linux | ✅ 已支持 |
| macOS | 应该没问题（还没测） |
| Windows | 暂不支持 |
| WSL | 应该没问题（还没测） |

## 许可证

MIT

## 作者

[ithiria894](https://github.com/ithiria894) — 给 Claude Code 生态造轮子。
