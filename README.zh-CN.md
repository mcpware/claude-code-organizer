# Claude Code Organizer

[![npm version](https://img.shields.io/npm/v/@mcpware/claude-code-organizer)](https://www.npmjs.com/package/@mcpware/claude-code-organizer)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)

[English](README.md) | 简体中文 | [繁體中文](README.zh-TW.md) | [日本語](README.ja.md) | [한국어](README.ko.md)

**一个仪表盘，帮你管理 Claude Code 的所有记忆、技能、MCP 服务器和钩子 — 按作用域分层展示，拖拽即可跨作用域移动。**

![Claude Code Organizer Demo](docs/demo.gif)

## 痛点

你有没有跟 Claude Code 说过"记住这个"，结果发现它存错地方了？

比如你在某个项目文件夹里，让 Claude 记住一个偏好设置。它就存到了这个项目的作用域下。等你切到另一个项目，Claude 完全不知道有这回事 — 那条记忆被锁死在原来的项目里了。

反过来也一样坑：有些技能或记忆放在全局作用域，其实只对某一个仓库有用，结果污染了你所有的项目。

想手动修？那你得自己去翻 `~/.claude/` 目录，在一堆 `-home-user-projects-my-app/` 这种编码路径的文件夹里找到对应的文件，手动剪切粘贴。说实话，挺折腾的。

**Claude Code Organizer 就是来解决这个问题的。**

### 举个例子：项目 → 全局

你在某个项目里让 Claude 记住了"我喜欢用 TypeScript + ESM"。但这个偏好你希望全局生效。打开仪表盘，把那条记忆从项目拖到全局。搞定，一步到位。

### 举个例子：全局 → 项目

你有一个部署技能放在全局，但其实只有一个仓库用得上。把它拖到那个项目里去 — 其他项目就不会再看到它了。干净利落。

---

## 功能

- **作用域分层视图** — 全局 > 工作区 > 项目，清晰的层级关系，还有继承标记
- **拖拽移动** — 记忆、技能、MCP 服务器，拖一下就能换作用域
- **移动前确认** — 每次操作前弹确认框，不会误操作
- **类型隔离** — 记忆只能移到记忆文件夹，技能只能移到技能文件夹，不会搞混
- **搜索 & 筛选** — 实时搜索所有条目，支持按类别筛选（记忆、技能、MCP、配置、钩子、插件、计划）
- **详情面板** — 点击任意条目查看元数据、描述、文件路径，还能直接用 VS Code 打开
- **零依赖** — 纯 Node.js 内置模块，SortableJS 走 CDN
- **真·文件移动** — 直接操作 `~/.claude/` 目录里的文件，不是什么只读查看器

## 快速上手

```bash
# 直接跑，不用装
npx @mcpware/claude-code-organizer

# 也可以全局安装
npm install -g @mcpware/claude-code-organizer
claude-code-organizer
```

或者直接把下面这段话丢给 Claude Code：

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
