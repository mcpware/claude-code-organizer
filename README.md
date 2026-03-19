# Claude Code Organizer

[![npm version](https://img.shields.io/npm/v/@mcpware/claude-code-organizer)](https://www.npmjs.com/package/@mcpware/claude-code-organizer)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)

English | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [日本語](README.ja.md) | [한국어](README.ko.md)

**Organize all your Claude Code memories, skills, MCP servers, and hooks — view by scope hierarchy, move between scopes via drag-and-drop.**

![Claude Code Organizer Demo](docs/demo.gif)

## The Problem

Ever asked Claude Code to "remember this", only to find it saved the memory to the wrong scope?

You're inside a project folder, you tell Claude to remember a preference — and it saves it to that project's scope. Switch to another project, and Claude has no idea. That memory is trapped.

The reverse happens too — skills or memories sitting in global scope that really only apply to one repo, leaking into everything else.

Want to fix it? You'd have to manually dig through `~/.claude/` and its encoded-path folders (`-home-user-projects-my-app/`), find the right file, and move it yourself.

**Claude Code Organizer fixes this.**

### Example: Project → Global

You told Claude to remember "I prefer TypeScript + ESM" while inside a project, but that preference applies everywhere. Open the dashboard, drag that memory from Project scope to Global scope. Done.

### Example: Global → Project

You have a deploy skill sitting in global, but it only makes sense for one repo. Drag it into that Project scope — other projects won't see it anymore.

---

## Features

- **Scope-aware hierarchy** — See all items organized as Global > Workspace > Project, with inheritance indicators
- **Drag-and-drop** — Move memories between scopes, skills between global and per-repo, MCP servers between configs
- **Move confirmation** — Every move shows a confirmation modal before touching any files
- **Same-type safety** — Memories can only move to memory folders, skills to skill folders, MCP to MCP configs
- **Search & filter** — Instantly search across all items, filter by category (Memory, Skills, MCP, Config, Hooks, Plugins, Plans)
- **Detail panel** — Click any item to see full metadata, description, file path, and open in VS Code
- **Zero dependencies** — Pure Node.js built-in modules, SortableJS via CDN
- **Real file moves** — Actually moves files in `~/.claude/`, not just a viewer

## Why a Visual Dashboard?

Claude Code can already list and move files via CLI. So why does this tool exist?

| What you need | CLI / Skill | Visual Dashboard |
|---------------|:-----------:|:----------------:|
| **Big picture** — see every memory, skill, MCP server across all scopes at once | Scroll through long text output | Scope tree, one glance |
| **Cross-scope awareness** — understand Global vs Workspace vs Project inheritance | Run multiple commands, piece it together | Tree hierarchy with indentation |
| **Move items between scopes** | Remember exact paths, type commands | Drag-and-drop |
| **Preview content** | `cat` each file one by one | Click → side panel |
| **Search across everything** | `grep` with manual filtering | Real-time search + category filters |
| **Understand what you have** | Count files per directory yourself | Automatic counts per category per scope |

The dashboard gives you the **big picture that text output can't** — you see the full scope tree, spot misplaced items instantly, and fix them with a drag. No commands to memorize, no paths to type.

## Quick Start

```bash
# Run directly (no install needed)
npx @mcpware/claude-code-organizer

# Or install globally
npm install -g @mcpware/claude-code-organizer
claude-code-organizer
```

Or paste this into Claude Code:

> Run `npx @mcpware/claude-code-organizer` — it's a dashboard for managing Claude Code settings. Tell me the URL when it's ready.

Opens a dashboard at `http://localhost:3847`. Works with your real `~/.claude/` directory.

## What It Manages

| Type | View | Move Between Scopes |
|------|:----:|:-------------------:|
| Memories (feedback, user, project, reference) | Yes | Yes |
| Skills | Yes | Yes |
| MCP Servers | Yes | Yes |
| Config (CLAUDE.md, settings.json) | Yes | Locked |
| Hooks | Yes | Locked |
| Plugins | Yes | Locked |
| Plans | Yes | Locked |

## Scope Hierarchy

```
Global                       <- applies everywhere
  Company (workspace)        <- applies to all sub-projects
    CompanyRepo1             <- project-specific
    CompanyRepo2             <- project-specific
  SideProjects (project)     <- independent project
  Documents (project)        <- independent project
```

Child scopes inherit parent scope's memories, skills, and MCP servers.

## How It Works

1. **Scans** `~/.claude/` — discovers all projects, memories, skills, MCP servers, hooks, plugins, plans
2. **Resolves scope hierarchy** — determines parent-child relationships from filesystem paths
3. **Renders dashboard** — scope headers > category bars > item rows, with proper indentation
4. **Handles moves** — when you drag or click "Move to...", actually moves files on disk with safety checks

## Comparison

| Feature | Claude Code Organizer | [claude-control](https://github.com/code-by-gunnar/claude-control) | [claude-admin](https://github.com/conradBruchmann/claude-admin) | [Claude Deck](https://claudedeck.org/) |
|---------|:--------------------:|:--------------:|:------------:|:----------:|
| View by scope hierarchy | Yes | Yes | Partial | No |
| Move between scopes | **Yes** | No (read-only) | No | No |
| Drag-and-drop | **Yes** | No | No | No |
| Memories management | **Yes** | No | Yes | No |
| Skills management | **Yes** | Yes | Yes | No |
| MCP management | **Yes** | Yes | Yes | Yes |
| Zero dependencies | **Yes** | No | No | No (React+FastAPI+SQLite) |
| Standalone (no IDE) | **Yes** | Yes | Yes | Yes |

## Platform Support

| Platform | Status |
|----------|:------:|
| Ubuntu / Linux | Supported |
| macOS | Should work (untested) |
| Windows | Not yet |
| WSL | Should work (untested) |

## Project Structure

```
src/
  scanner.mjs       # Scans ~/.claude/ — pure data, no side effects
  mover.mjs         # Moves files between scopes — safety checks + rollback
  server.mjs        # HTTP server — routes only, no logic
  ui/
    index.html       # HTML structure
    style.css        # All styling (edit freely, won't break logic)
    app.js           # Frontend rendering + SortableJS + interactions
bin/
  cli.mjs            # Entry point
```

Frontend and backend are fully separated. Edit `src/ui/` files to change the look without touching any logic.

## API

The dashboard is backed by a REST API:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/scan` | GET | Scan all customizations, returns scopes + items + counts |
| `/api/move` | POST | Move an item to a different scope |
| `/api/destinations` | GET | Get valid move destinations for an item |
| `/api/file-content` | GET | Read file content for detail panel |

## License

MIT

## Author

[ithiria894](https://github.com/ithiria894) — Building tools for the Claude Code ecosystem.

See also: [@mcpware/instagram-mcp](https://github.com/mcpware/instagram-mcp)
