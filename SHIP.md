# Ship Plan — claude-code-organizer

> Follow side-hustle/3-ship/ship-workflow.md template
> Created: 2026-03-18

---

## Phase 0: Launch Checklist (TODAY)

### README
- [ ] One-line description (3 seconds)
- [ ] Screenshot / demo GIF at the top
- [ ] Features bullet list
- [ ] Quick Start (`npx @mcpware/claude-code-organizer`)
- [ ] Comparison table (vs claude-control, claude-admin, claude-deck)
- [ ] Usage examples

### GitHub Repo Setup
- [ ] Description ✅ (already set)
- [ ] Topics / Tags (use all 20)
- [ ] Social Preview Image (1280×640) — use Canva MCP
- [ ] LICENSE file (MIT)
- [ ] .gitignore
- [ ] Release tag (v0.1.0)
- [ ] Badges (version, license, npm downloads)

### Package Registry
- [ ] `npm publish --access public` as `@mcpware/claude-code-organizer`
- [ ] Also publish as `claude-code-organizer` (unscoped, for discoverability)

### Plugin Marketplace
- [ ] Create `.claude-plugin/plugin.json` manifest
- [ ] Create marketplace repo `mcpware/marketplace`
- [ ] Submit to Anthropic official marketplace (claude.ai/settings/plugins/submit)

---

## Phase 1: Registry Registration (Day 1-2)

| Platform | URL | Status | Notes |
|----------|-----|:------:|-------|
| **npm** | npmjs.com | [ ] | `@mcpware/claude-code-organizer` + `claude-code-organizer` |
| **Anthropic Plugin Marketplace** | claude.ai/settings/plugins/submit | [ ] | Official, needs review |
| **Official MCP Registry** | registry.modelcontextprotocol.io | [ ] | Submit via `mcp-publisher` CLI |
| **awesome-mcp-servers** | github.com/punkpeye/awesome-mcp-servers | [ ] | PR (need Glama listing first) |
| **awesome-claude-code** | github.com/hesreallyhim/awesome-claude-code | [ ] | PR |
| **awesome-claude-plugins** | github.com/ComposioHQ/awesome-claude-plugins | [ ] | PR |
| **Glama.ai** | glama.ai/mcp/servers | [ ] | Need Dockerfile + glama.json + release tag |
| **MCP.so** | mcp.so | [ ] | Submit form |
| **Smithery.ai** | smithery.ai | [ ] | Submit MCP server |
| **MCPServers.org** | mcpservers.org | [ ] | Submit to directory |
| **PulseMCP** | pulsemcp.com | [ ] | Submit |
| **mcpmarket.com** | mcpmarket.com | [ ] | Submit |

### Glama Requirements (blocks awesome-mcp-servers PR)
- [ ] Add `Dockerfile`
- [ ] Add `glama.json`
- [ ] Create GitHub Release v0.1.0
- [ ] Submit to Glama → Claim → Wait for indexing

---

## Phase 2: Social Media Launch (Day 2-5)

| Day | Platform | Content | Status |
|-----|----------|---------|:------:|
| Day 2 | Reddit r/ClaudeAI | "I built a visual organizer for Claude Code memories, skills, and MCP servers" | [ ] |
| Day 2 | Reddit r/MCP | Technical angle — scope hierarchy + drag-and-drop | [ ] |
| Day 3 | Twitter/X | Thread: problem → solution → demo GIF → link | [ ] |
| Day 4 | Dev.to | Blog post: "I was drowning in 84 Claude Code config files" | [ ] |
| Day 5 | LinkedIn | Professional: "Built an open-source tool used by X developers" | [ ] |

---

## Phase 3: Content Angles

### Problem-first (Dev.to, HN)
> "Claude Code saves memories, skills, MCP servers, and hooks across 5+ scattered directories with ugly encoded paths. I had 84 config files and couldn't tell which scope each one applied to. So I built Claude Code Organizer — a visual dashboard that shows everything organized by scope hierarchy with drag-and-drop to move items between scopes."

### Comparison (Reddit, Twitter)
> "There are 10+ Claude Code config tools, but none let you actually MOVE items between scopes. claude-control is read-only. Claude Deck needs React+FastAPI+SQLite. I built a zero-dependency organizer with real drag-and-drop. Here's how they compare: [table]"

### Build-in-public (Twitter)
> "Day 1: Built a scope-aware inventory manager for Claude Code in one session. Zero npm dependencies, SortableJS for drag-and-drop. Here's what I learned about Claude's config system..."

---

## Execution Order (Today)

1. ~~Rename repo~~ ✅
2. Write README
3. Add LICENSE, .gitignore, topics
4. npm publish
5. Create plugin structure
6. Create GitHub Release v0.1.0
7. Submit to registries
