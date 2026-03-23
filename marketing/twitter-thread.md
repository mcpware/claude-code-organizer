# Twitter Thread — CCO Launch
# Schedule: ASAP (Twitter is forgiving, can post multiple times)
# Status: READY TO POST
# Rules: Link in REPLY not main tweet. Max 1-2 hashtags. Demo GIF in tweet 4.

## Tweet 1 (Hook)
Claude Code secretly creates 140+ config files behind your back.

Memories, skills, MCP servers — scattered across encoded-path folders you didn't know existed. You didn't create most of them.

The worst part? They're degrading your AI's accuracy right now.

🧵👇

## Tweet 2 (Technical problem)
Every session, Claude loads ALL configs from your current scope + everything inherited from parent scopes. That's your context window.

Wrong-scope items = wasted tokens + polluted context + lower accuracy.

A Python skill in global scope? Gets loaded into your React frontend session.

## Tweet 3 (The pain)
Want to fix it? Your options:

1. Manually dig through ~/.claude/ encoded-path folders. cat each file. 140 of them.

2. Ask Claude to manage it — it'll ls one directory, you say "no, ALL scopes", back and forth playing 20 questions.

No command shows the full tree.

## Tweet 4 (Solution + GIF)
So I built a dashboard. One command:

npx @mcpware/claude-code-organizer

Scope hierarchy tree. 140 items at a glance. Drag-and-drop to the right scope. Delete stale memories Claude auto-created.

[ATTACH: demo GIF from https://raw.githubusercontent.com/mcpware/claude-code-organizer/main/docs/demo.gif]

## Tweet 5 (Competitors)
Searched a whole evening for existing tools:

→ Desktop app (600+ ⭐) — no scope hierarchy
→ VS Code ext — only works inside VS Code
→ Full-stack web app — needs React + Rust + SQLite

None had scope tree + drag-and-drop.

Built it myself. 800 lines vanilla JS. Zero deps.

## Tweet 6 (Personal + CTA)
I'm a CS dropout. Used Claude Code for exactly one week. Day 6 I found the problem, built the dashboard in a day.

v0.3. Rough but works. Report a bug, I'll fix it in hours.

Haven't slept since I discovered CC. ADHD found its forever home.

⭐ Star / 🍴 Fork / 🐛 Issue welcome

#BuildInPublic #MCP

## Reply to Tweet 6 (Links)
GitHub: https://github.com/mcpware/claude-code-organizer

Full writeup: https://dev.to/ithiria894/claude-code-secretly-hoards-140-config-files-behind-your-back-heres-how-to-take-control-2dlb

npx @mcpware/claude-code-organizer
