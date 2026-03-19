/**
 * server.mjs — HTTP server for Claude Inventory Manager.
 * Routes only. All logic is in scanner.mjs and mover.mjs.
 * All UI is in src/ui/ (html, css, js).
 */

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { scan } from "./scanner.mjs";
import { moveItem, deleteItem, getValidDestinations } from "./mover.mjs";

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
  return JSON.parse(body);
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

  // GET /api/scan — full scan of all customizations
  if (path === "/api/scan" && req.method === "GET") {
    const data = await freshScan();
    return json(res, data);
  }

  // POST /api/move — move an item to a different scope
  if (path === "/api/move" && req.method === "POST") {
    const { itemPath, toScopeId } = await readBody(req);

    if (!cachedData) await freshScan();

    // Find the item by path
    const item = cachedData.items.find(i => i.path === itemPath && !i.locked);
    if (!item) return json(res, { ok: false, error: "Item not found or locked" }, 400);

    const result = await moveItem(item, toScopeId, cachedData.scopes);

    // Refresh cache after move
    if (result.ok) await freshScan();

    return json(res, result, result.ok ? 200 : 400);
  }

  // POST /api/delete — delete an item
  if (path === "/api/delete" && req.method === "POST") {
    const { itemPath } = await readBody(req);

    if (!cachedData) await freshScan();

    const item = cachedData.items.find(i => i.path === itemPath && !i.locked);
    if (!item) return json(res, { ok: false, error: "Item not found or locked" }, 400);

    const result = await deleteItem(item, cachedData.scopes);

    if (result.ok) await freshScan();

    return json(res, result, result.ok ? 200 : 400);
  }

  // GET /api/destinations?path=...&category=... — valid move destinations
  if (path === "/api/destinations" && req.method === "GET") {
    if (!cachedData) await freshScan();
    const itemPath = url.searchParams.get("path");
    const item = cachedData.items.find(i => i.path === itemPath);
    if (!item) return json(res, { ok: false, error: "Item not found" }, 400);

    const destinations = getValidDestinations(item, cachedData.scopes);
    return json(res, { ok: true, destinations, currentScopeId: item.scopeId });
  }

  // GET /api/file-content?path=... — read file content for detail panel
  if (path === "/api/file-content" && req.method === "GET") {
    const filePath = url.searchParams.get("path");
    if (!filePath || !filePath.startsWith("/")) {
      return json(res, { ok: false, error: "Invalid path" }, 400);
    }
    try {
      const content = await readFile(filePath, "utf-8");
      return json(res, { ok: true, content });
    } catch {
      return json(res, { ok: false, error: "Cannot read file" }, 400);
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
      console.log(`Claude Inventory running at http://localhost:${p}`);
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
