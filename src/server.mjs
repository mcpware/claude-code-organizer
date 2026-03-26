/**
 * server.mjs — HTTP server for Claude Code Organizer.
 * Routes only. All logic is in scanner.mjs and mover.mjs.
 * All UI is in src/ui/ (html, css, js).
 */

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname, resolve } from "node:path";
import { homedir } from "node:os";
import { createRequire } from "node:module";
import https from "node:https";
import { scan } from "./scanner.mjs";
import { moveItem, deleteItem, getValidDestinations } from "./mover.mjs";
import { countTokens, getMethod } from "./tokenizer.mjs";

// ── Update check ─────────────────────────────────────────────────────
async function checkForUpdate() {
  const require = createRequire(import.meta.url);
  const { version: local } = require("../package.json");
  const data = await new Promise((resolve, reject) => {
    const req = https.get("https://registry.npmjs.org/@mcpware/claude-code-organizer/latest", { timeout: 3000 }, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => resolve(body));
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("timeout")); });
  });
  const { version: latest } = JSON.parse(data);
  if (latest && latest !== local) {
    console.log(`\uD83D\uDCE6 Update available: ${local} \u2192 ${latest}  Run: npm update -g @mcpware/claude-code-organizer\n`);
  }
}

// ── Path safety ──────────────────────────────────────────────────────

const HOME = homedir();
const CLAUDE_DIR = join(HOME, ".claude");

/**
 * Validate that a file path is within allowed directories.
 * Prevents path traversal attacks (e.g. ../../etc/passwd).
 */
function isPathAllowed(filePath) {
  const resolved = resolve(filePath);
  // Allow paths under ~/.claude/ or under any discovered project repoDir
  if (resolved.startsWith(CLAUDE_DIR + "/") || resolved === CLAUDE_DIR) return true;
  // Allow paths under HOME (covers repo dirs with .mcp.json, CLAUDE.md etc)
  if (resolved.startsWith(HOME + "/")) return true;
  return false;
}

const UI_DIR = join(import.meta.dirname, "ui");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

// ── Cached scan data (refresh on each request to /api/scan) ──────────
let cachedData = null;

async function freshScan() {
  cachedData = await scan();
  return cachedData;
}

// ── Request helpers ──────────────────────────────────────────────────

function json(res, data, status = 200) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

async function readBody(req) {
  let body = "";
  for await (const chunk of req) body += chunk;
  try {
    return JSON.parse(body);
  } catch {
    throw new Error("Invalid JSON body");
  }
}

async function serveFile(res, filePath) {
  try {
    const content = await readFile(filePath);
    const mime = MIME[extname(filePath)] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": mime });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}

// ── Routes ───────────────────────────────────────────────────────────

async function handleRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;

  // ── API routes ──

  // GET /api/version — check for updates (UI calls this)
  if (path === "/api/version" && req.method === "GET") {
    const require = createRequire(import.meta.url);
    const { version: local } = require("../package.json");
    try {
      const data = await new Promise((resolve, reject) => {
        const req = https.get("https://registry.npmjs.org/@mcpware/claude-code-organizer/latest", { timeout: 3000 }, (res) => {
          let body = "";
          res.on("data", (c) => (body += c));
          res.on("end", () => resolve(body));
        });
        req.on("error", reject);
        req.on("timeout", () => { req.destroy(); reject(new Error("timeout")); });
      });
      const { version: latest } = JSON.parse(data);
      return json(res, { local, latest, updateAvailable: latest !== local });
    } catch {
      return json(res, { local, latest: null, updateAvailable: false });
    }
  }

  // GET /api/scan — full scan of all customizations
  if (path === "/api/scan" && req.method === "GET") {
    const data = await freshScan();
    return json(res, data);
  }

  // GET /api/context-budget?scope=<id> — token budget breakdown for a scope
  if (path === "/api/context-budget" && req.method === "GET") {
    const scopeId = url.searchParams.get("scope");
    if (!scopeId) return json(res, { ok: false, error: "Missing scope parameter" }, 400);

    if (!cachedData) await freshScan();

    const scope = cachedData.scopes.find(s => s.id === scopeId);
    if (!scope) return json(res, { ok: false, error: "Scope not found" }, 400);

    // Collect parent chain (for inherited items)
    const parentIds = [];
    let cur = scope;
    while (cur.parentId) {
      parentIds.push(cur.parentId);
      cur = cachedData.scopes.find(s => s.id === cur.parentId);
      if (!cur) break;
    }

    // Categories that Claude loads into context at session start.
    // Sessions and plugins are NOT loaded into context.
    // Individual memory files are NOT pre-loaded — only MEMORY.md (index) is.
    // Claude reads individual memories on-demand via readFileState.
    const CONTEXT_CATEGORIES = new Set(["memory", "skill", "config", "mcp", "rule", "command", "agent", "hook"]);

    // Tokenize items for a set of scope IDs, return per-item breakdown
    async function tokenizeItems(scopeIds) {
      const items = cachedData.items.filter(
        i => scopeIds.includes(i.scopeId) && CONTEXT_CATEGORIES.has(i.category)
      );
      const results = [];

      for (const item of items) {
        let text = "";
        try {
          if (item.category === "memory") {
            // Individual memory files are NOT pre-loaded into context.
            // Only MEMORY.md (index) is loaded at session start.
            // Individual files are read on-demand via readFileState.
            // Skip all individual memory items from context budget.
            continue;
          } else if (item.category === "mcp") {
            // MCP: tokenize the config JSON (name-only placeholders at startup)
            text = JSON.stringify(item.mcpConfig || {}, null, 2);
          } else if (item.category === "hook") {
            // Hooks: tokenize the hook command/prompt
            text = item.description || "";
          } else if (item.category === "skill") {
            // Skills load name + description only (not full SKILL.md)
            text = `${item.name}\n${item.description || ""}`;
          } else if (item.path) {
            // Config, rule, command, agent: read file content
            text = await readFile(item.path, "utf-8");
          }
        } catch {
          // File unreadable — use empty string
        }

        const { tokens, confidence } = await countTokens(text);
        const scopeObj = cachedData.scopes.find(s => s.id === item.scopeId);
        results.push({
          category: item.category,
          subType: item.subType,
          name: item.name,
          path: item.path,
          tokens,
          confidence,
          sizeBytes: item.sizeBytes || 0,
          scopeId: item.scopeId,
          scopeName: scopeObj?.name || item.scopeId,
        });
      }

      return results;
    }

    const [currentItems, inheritedItems, method] = await Promise.all([
      tokenizeItems([scopeId]),
      tokenizeItems(parentIds),
      getMethod(),
    ]);

    // Add MEMORY.md files — these are not in scanner items but ARE pre-loaded
    async function addMemoryIndexFiles(scopeIds, targetArray) {
      for (const sid of scopeIds) {
        const s = cachedData.scopes.find(sc => sc.id === sid);
        if (!s) continue;
        // Find MEMORY.md path for this scope
        let memPath = null;
        if (s.id === "global") {
          memPath = join(CLAUDE_DIR, "memory", "MEMORY.md");
        } else if (s.claudeProjectDir) {
          memPath = join(s.claudeProjectDir, "memory", "MEMORY.md");
        }
        if (!memPath) continue;
        try {
          const text = await readFile(memPath, "utf-8");
          const { tokens, confidence } = await countTokens(text);
          if (tokens > 0) {
            targetArray.push({
              category: "memory",
              subType: "index",
              name: "MEMORY.md",
              path: memPath,
              tokens,
              confidence,
              sizeBytes: Buffer.byteLength(text, "utf-8"),
              scopeId: sid,
              scopeName: s.name,
            });
          }
        } catch { /* file doesn't exist */ }
      }
    }

    await Promise.all([
      addMemoryIndexFiles([scopeId], currentItems),
      addMemoryIndexFiles(parentIds, inheritedItems),
    ]);

    // System overhead: ~22.5K (system prompt ~6.6K + system tools ~15.9K)
    // Based on /context measurements
    const SYSTEM_OVERHEAD = 22500;

    // MCP overhead: actual tool schema definitions are much larger than the config JSON.
    // Measured via /context: 50K across 16 servers = ~3100 per server average.
    // Range: 195 tok (rss-reader, 2 tools) to 8962 tok (Google Calendar, 9 tools).
    const mcpServerCount = cachedData.items.filter(
      i => i.category === "mcp" && (i.scopeId === scopeId || parentIds.includes(i.scopeId))
    ).length;
    const mcpOverhead = mcpServerCount * 3100;

    const currentTotal = currentItems.reduce((sum, i) => sum + i.tokens, 0);
    const inheritedTotal = inheritedItems.reduce((sum, i) => sum + i.tokens, 0);
    const total = currentTotal + inheritedTotal + SYSTEM_OVERHEAD + mcpOverhead;

    const CONTEXT_LIMIT = 200000;

    return json(res, {
      ok: true,
      scopeId,
      scopeName: scope.name,
      currentScope: {
        items: currentItems,
        total: currentTotal,
      },
      inherited: {
        items: inheritedItems,
        total: inheritedTotal,
      },
      systemOverhead: {
        base: SYSTEM_OVERHEAD,
        mcpServers: mcpServerCount,
        mcpEstimate: mcpOverhead,
        total: SYSTEM_OVERHEAD + mcpOverhead,
        confidence: "estimated",
        citation: "GitHub #30103, ClaudeCodeCamp measurements",
      },
      total,
      contextLimit: CONTEXT_LIMIT,
      percentUsed: Math.round((total / CONTEXT_LIMIT) * 1000) / 10,
      method,
    });
  }

  // POST /api/move — move an item to a different scope
  if (path === "/api/move" && req.method === "POST") {
    const { itemPath, toScopeId, category, name } = await readBody(req);

    if (!cachedData) await freshScan();

    // Find the item by path + optional category/name (needed to disambiguate
    // items sharing the same file, e.g. multiple MCP servers in one .mcp.json)
    const item = cachedData.items.find(i =>
      i.path === itemPath &&
      !i.locked &&
      (!category || i.category === category) &&
      (!name || i.name === name)
    );
    if (!item) return json(res, { ok: false, error: "Item not found or locked" }, 400);

    const result = await moveItem(item, toScopeId, cachedData.scopes);

    // Refresh cache after move
    if (result.ok) await freshScan();

    return json(res, result, result.ok ? 200 : 400);
  }

  // POST /api/delete — delete an item
  if (path === "/api/delete" && req.method === "POST") {
    const { itemPath, category, name } = await readBody(req);

    if (!cachedData) await freshScan();

    const item = cachedData.items.find(i =>
      i.path === itemPath &&
      !i.locked &&
      (!category || i.category === category) &&
      (!name || i.name === name)
    );
    if (!item) return json(res, { ok: false, error: "Item not found or locked" }, 400);

    const result = await deleteItem(item, cachedData.scopes);

    if (result.ok) await freshScan();

    return json(res, result, result.ok ? 200 : 400);
  }

  // GET /api/destinations?path=...&category=...&name=... — valid move destinations
  if (path === "/api/destinations" && req.method === "GET") {
    if (!cachedData) await freshScan();
    const itemPath = url.searchParams.get("path");
    const category = url.searchParams.get("category");
    const name = url.searchParams.get("name");
    // Match by path + category + name to disambiguate items sharing the same path (e.g. hooks vs config in settings.json)
    const item = cachedData.items.find(i =>
      i.path === itemPath &&
      (!category || i.category === category) &&
      (!name || i.name === name)
    );
    if (!item) return json(res, { ok: false, error: "Item not found" }, 400);

    const destinations = getValidDestinations(item, cachedData.scopes);
    return json(res, { ok: true, destinations, currentScopeId: item.scopeId });
  }

  // POST /api/restore — restore a deleted file (for undo)
  if (path === "/api/restore" && req.method === "POST") {
    const { filePath, content, isDir } = await readBody(req);
    if (!filePath || !filePath.startsWith("/") || !isPathAllowed(filePath)) {
      return json(res, { ok: false, error: "Invalid or disallowed path" }, 400);
    }
    try {
      const { mkdir, writeFile: wf } = await import("node:fs/promises");
      const { dirname } = await import("node:path");
      await mkdir(dirname(filePath), { recursive: true });
      if (isDir) {
        // For skills: restore SKILL.md inside the directory
        await mkdir(filePath, { recursive: true });
        const skillPath = join(filePath, "SKILL.md");
        await wf(skillPath, content, "utf-8");
      } else {
        await wf(filePath, content, "utf-8");
      }
      await freshScan();
      return json(res, { ok: true, message: "Restored successfully" });
    } catch (err) {
      return json(res, { ok: false, error: `Restore failed: ${err.message}` }, 400);
    }
  }

  // POST /api/restore-mcp — restore a deleted MCP server entry
  if (path === "/api/restore-mcp" && req.method === "POST") {
    const { name, config, mcpJsonPath } = await readBody(req);
    if (!name || !config || !mcpJsonPath || !isPathAllowed(mcpJsonPath)) {
      return json(res, { ok: false, error: "Missing name, config, or mcpJsonPath, or disallowed path" }, 400);
    }
    try {
      let content = { mcpServers: {} };
      try {
        content = JSON.parse(await readFile(mcpJsonPath, "utf-8"));
        if (!content.mcpServers) content.mcpServers = {};
      } catch { /* file doesn't exist, start fresh */ }
      content.mcpServers[name] = config;
      const { writeFile: wf, mkdir: mk } = await import("node:fs/promises");
      const { dirname } = await import("node:path");
      await mk(dirname(mcpJsonPath), { recursive: true });
      await wf(mcpJsonPath, JSON.stringify(content, null, 2) + "\n");
      await freshScan();
      return json(res, { ok: true, message: `Restored MCP server "${name}"` });
    } catch (err) {
      return json(res, { ok: false, error: `Restore failed: ${err.message}` }, 400);
    }
  }

  // GET /api/file-content?path=... — read file content for detail panel
  if (path === "/api/file-content" && req.method === "GET") {
    const filePath = url.searchParams.get("path");
    if (!filePath || !filePath.startsWith("/") || !isPathAllowed(filePath)) {
      return json(res, { ok: false, error: "Invalid or disallowed path" }, 400);
    }
    try {
      const content = await readFile(filePath, "utf-8");
      return json(res, { ok: true, content });
    } catch {
      return json(res, { ok: false, error: "Cannot read file" }, 400);
    }
  }

  // GET /api/session-preview?path=... — parse JSONL session into readable conversation
  if (path === "/api/session-preview" && req.method === "GET") {
    const filePath = url.searchParams.get("path");
    if (!filePath || !filePath.endsWith(".jsonl") || !isPathAllowed(filePath)) {
      return json(res, { ok: false, error: "Invalid or disallowed session path" }, 400);
    }
    try {
      const raw = await readFile(filePath, "utf-8");
      const lines = raw.trim().split("\n");
      const messages = [];
      let title = null;
      let totalMessages = 0;

      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          if (entry.aiTitle) title = entry.aiTitle;
          if (entry.message?.role && entry.message?.content) {
            const role = entry.message.role === "user" ? "👤 User" : "🤖 Assistant";
            const content = entry.message.content;
            // Content can be string or array of {type, text}
            const text = typeof content === "string"
              ? content
              : Array.isArray(content)
                ? content.filter(c => c.type === "text").map(c => c.text).join("\n")
                : "";
            if (text.trim()) {
              totalMessages++;
              const display = text.length > 500 ? text.slice(0, 500) + "\n... (truncated)" : text;
              messages.push(`${role}:\n${display}`);
            }
          }
        } catch { /* skip malformed lines */ }
      }

      // Show last 20 messages (most recent conversation)
      const last20 = messages.slice(-20);
      const header = title ? `# ${title}\n\n` : "";
      const showing = totalMessages > 20
        ? `Showing last 20 of ${totalMessages} messages\n\n`
        : `${totalMessages} messages\n\n`;
      const preview = header + showing + last20.join("\n\n---\n\n");
      return json(res, { ok: true, content: preview || "(empty session)" });
    } catch {
      return json(res, { ok: false, error: "Cannot read session" }, 400);
    }
  }

  // GET /api/browse-dirs?path=... — list subdirectories for folder picker
  if (path === "/api/browse-dirs" && req.method === "GET") {
    const dirPath = url.searchParams.get("path") || HOME;
    const resolved = resolve(dirPath);

    // Only allow browsing under HOME for safety
    if (!resolved.startsWith(HOME) && resolved !== HOME) {
      return json(res, { ok: false, error: "Cannot browse outside HOME directory" }, 400);
    }

    try {
      const { readdir: rd, stat: st } = await import("node:fs/promises");
      const entries = await rd(resolved, { withFileTypes: true });
      const dirs = [];
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (entry.name.startsWith(".")) continue; // skip hidden
        dirs.push(entry.name);
      }
      dirs.sort();
      return json(res, { ok: true, path: resolved, dirs, parent: resolve(resolved, "..") });
    } catch {
      return json(res, { ok: false, error: "Cannot read directory" }, 400);
    }
  }

  // POST /api/export — export all scanned items to a folder
  if (path === "/api/export" && req.method === "POST") {
    let { exportDir } = await readBody(req);
    // Default to ~/.claude/exports/ if no path provided
    if (!exportDir) exportDir = join(CLAUDE_DIR, "exports");
    if (!exportDir.startsWith("/")) {
      return json(res, { ok: false, error: "Invalid exportDir (must be absolute path)" }, 400);
    }

    try {
      if (!cachedData) await freshScan();
      const { mkdir: mk, copyFile: cpf, writeFile: wf, cp: cpDir } = await import("node:fs/promises");
      const { dirname, relative, basename } = await import("node:path");

      const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const backupRoot = join(exportDir, `cco-backup-${ts}`);
      let copied = 0;
      const errors = [];

      for (const item of cachedData.items) {
        try {
          const subDir = join(backupRoot, item.scopeId, item.category);
          await mk(subDir, { recursive: true });

          if (item.category === "skill") {
            // Skills are directories — copy whole dir
            const dest = join(subDir, item.fileName || basename(item.path));
            await cpDir(item.path, dest, { recursive: true });
          } else if (item.category === "mcp") {
            // MCP entries live inside JSON — export the full .mcp.json
            const dest = join(subDir, `${item.name}.json`);
            const config = item.mcpConfig || {};
            await wf(dest, JSON.stringify({ [item.name]: config }, null, 2) + "\n");
          } else {
            // Regular files — copy directly
            const dest = join(subDir, item.fileName || basename(item.path));
            await cpf(item.path, dest);
          }
          copied++;
        } catch (err) {
          errors.push(`${item.name}: ${err.message}`);
        }
      }

      // Write summary
      const summary = {
        exportedAt: new Date().toISOString(),
        totalItems: cachedData.items.length,
        copied,
        errors: errors.length,
        scopes: cachedData.scopes.map(s => ({ id: s.id, name: s.name, type: s.type })),
        categories: [...new Set(cachedData.items.map(i => i.category))],
      };
      await wf(join(backupRoot, "backup-summary.json"), JSON.stringify(summary, null, 2) + "\n");

      return json(res, {
        ok: true,
        message: `Exported ${copied} items to ${backupRoot}`,
        path: backupRoot,
        copied,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (err) {
      return json(res, { ok: false, error: `Export failed: ${err.message}` }, 400);
    }
  }

  // ── Static UI files ──

  if (path === "/" || path === "/index.html") {
    return serveFile(res, join(UI_DIR, "index.html"));
  }
  if (path === "/style.css") {
    return serveFile(res, join(UI_DIR, "style.css"));
  }
  if (path === "/app.js") {
    return serveFile(res, join(UI_DIR, "app.js"));
  }

  // Suppress favicon 404
  if (path === "/favicon.ico") {
    res.writeHead(204);
    return res.end();
  }

  // ── 404 ──
  res.writeHead(404);
  res.end("Not found");
}

// ── Start server ─────────────────────────────────────────────────────

export function startServer(port = 3847, maxRetries = 10) {
  const server = createServer(async (req, res) => {
    try {
      await handleRequest(req, res);
    } catch (err) {
      console.error("Error:", err.message);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: err.message }));
    }
  });

  let attempt = 0;
  function tryListen(p) {
    server.listen(p, () => {
      console.log(`\nClaude Code Organizer running at http://localhost:${p}\n`);
      console.log(`Made by a CS dropout with no mass, no team, no budget \u2014 just Claude Code and ADHD.`);
      console.log(`This is my first open-source project. If it helped you, a star would make my week:`);
      console.log(`\u2B50 https://github.com/mcpware/claude-code-organizer`);
      console.log(`\uD83D\uDCEC Bugs, ideas, or just wanna say hi? https://github.com/mcpware/claude-code-organizer/issues \u2014 I fix things same day, I promise\n`);
      // Non-blocking update check
      checkForUpdate().catch(() => {});
    });
  }

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE" && attempt < maxRetries) {
      attempt++;
      const nextPort = port + attempt;
      console.log(`Port ${port + attempt - 1} in use, trying ${nextPort}...`);
      tryListen(nextPort);
    } else {
      console.error(`Failed to start server: ${err.message}`);
      process.exit(1);
    }
  });

  tryListen(port);
  return server;
}
