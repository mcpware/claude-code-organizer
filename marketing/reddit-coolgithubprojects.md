# r/coolgithubprojects — Thursday 2026-03-27
# Flair: N/A
# Status: SCHEDULED

## Title
Claude Code Organizer — a dashboard that shows everything Claude Code stores about you and lets you drag items between scopes (open source)

## Body
Claude Code silently creates 100+ config files (memories, skills, MCP servers) scattered across encoded-path folders. There's no built-in way to see them all at once or move them between scopes.

This dashboard scans `~/.claude/`, displays a scope hierarchy tree (Global → Workspace → Project), and lets you drag-and-drop items between scopes. Also has MCP tools so Claude can manage its own config programmatically.

```
npx @mcpware/claude-code-organizer
```

- Scope-aware hierarchy tree with item counts
- Drag-and-drop cross-scope moves
- Delete stale memories
- Search & filter across all items
- Zero dependencies, ~800 lines vanilla JS

GitHub: https://github.com/mcpware/claude-code-organizer
