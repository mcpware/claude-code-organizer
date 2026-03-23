# r/SideProject — Sunday 2026-03-23
# Flair: Software
# Status: SCHEDULED

## Title
CS dropout, 1 week of Claude Code, 140 mystery config files. So I built a dashboard to fix it (open source)

## Body
I quit university CS, been using Claude Code for a week. Day 6 I opened `~/.claude/` and found **140 items** — memories, skills, MCP configs — scattered across encoded-path folders I didn't know existed.

Most of them weren't created by me. Claude did it silently. The best part: 3 identical MCP server entries across different scopes because I added the same server while cd'd into different directories. Claude duplicated it each time without telling me.

I spent a whole evening searching for existing tools — the most popular desktop app (600+ stars) has no scope hierarchy. A VS Code extension was close but only works inside VS Code. Nothing let me **see the full scope tree and drag items between scopes.**

So I built a dashboard in a day.

```
npx @mcpware/claude-code-organizer
```

It scans your entire `~/.claude/`, shows everything in a scope hierarchy tree (Global → Workspace → Project), and lets you drag-and-drop items between scopes. You can also delete stale memories that Claude auto-created from things you said casually.

**Honest caveats:** This is v0.3, built in a day. Linux/macOS only, not Windows yet. UI is functional but rough. ~800 lines of vanilla JS, zero dependencies.

This is my first open source project. If you try it and something breaks or you want a feature, open an issue — I'll probably fix it within a couple hours. I literally have not slept since I discovered Claude Code. My ADHD found its forever home.

GitHub: https://github.com/mcpware/claude-code-organizer
Full writeup: https://dev.to/ithiria894/claude-code-secretly-hoards-140-config-files-behind-your-back-heres-how-to-take-control-2dlb

**How do you manage Claude Code config? Have you ever checked what it's stored about you?**
