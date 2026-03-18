/**
 * mover.mjs — Safely move Claude Code customizations between scopes.
 *
 * Rules:
 *   - memory → memory only
 *   - skill → skill only
 *   - mcp → mcp only
 *   - config, plugin, plan → locked, cannot move
 *
 * Pure data module. No HTTP, no UI.
 */

import { rename, mkdir, readFile, writeFile } from "node:fs/promises";
import { join, dirname, basename } from "node:path";
import { homedir } from "node:os";
import { existsSync } from "node:fs";

const HOME = homedir();
const CLAUDE_DIR = join(HOME, ".claude");

// ── Resolve scope to real filesystem path ────────────────────────────

function resolveMemoryDir(scopeId) {
  if (scopeId === "global") return join(CLAUDE_DIR, "memory");
  return join(CLAUDE_DIR, "projects", scopeId, "memory");
}

function resolveSkillDir(scopeId, scopes) {
  if (scopeId === "global") return join(CLAUDE_DIR, "skills");
  const scope = scopes.find(s => s.id === scopeId);
  if (!scope || !scope.repoDir) return null;
  return join(scope.repoDir, ".claude", "skills");
}

function resolveMcpJson(scopeId, scopes) {
  if (scopeId === "global") return join(CLAUDE_DIR, ".mcp.json");
  const scope = scopes.find(s => s.id === scopeId);
  if (!scope || !scope.repoDir) return null;
  return join(scope.repoDir, ".mcp.json");
}

// ── Validate move ────────────────────────────────────────────────────

function validateMove(item, toScopeId) {
  // Locked items cannot move
  if (item.locked) {
    return { ok: false, error: `${item.name} is locked and cannot be moved` };
  }

  // Same scope = no-op
  if (item.scopeId === toScopeId) {
    return { ok: false, error: "Item is already in this scope" };
  }

  // Only memory, skill, mcp can move
  const movableCategories = ["memory", "skill", "mcp"];
  if (!movableCategories.includes(item.category)) {
    return { ok: false, error: `${item.category} items cannot be moved` };
  }

  return { ok: true };
}

// ── Move memory file ─────────────────────────────────────────────────

async function moveMemory(item, toScopeId) {
  const fromDir = dirname(item.path);
  const toDir = resolveMemoryDir(toScopeId);
  const toPath = join(toDir, item.fileName);

  if (existsSync(toPath)) {
    return { ok: false, error: `File already exists at destination: ${item.fileName}` };
  }

  await mkdir(toDir, { recursive: true });
  await rename(item.path, toPath);

  return {
    ok: true,
    from: item.path,
    to: toPath,
    message: `Moved "${item.name}" from ${item.scopeId} to ${toScopeId}`,
  };
}

// ── Move skill directory ─────────────────────────────────────────────

async function moveSkill(item, toScopeId, scopes) {
  const toSkillsRoot = resolveSkillDir(toScopeId, scopes);
  if (!toSkillsRoot) {
    return { ok: false, error: `Cannot resolve skill directory for scope: ${toScopeId}` };
  }

  const toPath = join(toSkillsRoot, item.fileName);

  if (existsSync(toPath)) {
    return { ok: false, error: `Skill directory already exists at destination: ${item.fileName}` };
  }

  await mkdir(toSkillsRoot, { recursive: true });
  await rename(item.path, toPath);

  return {
    ok: true,
    from: item.path,
    to: toPath,
    message: `Moved skill "${item.name}" from ${item.scopeId} to ${toScopeId}`,
  };
}

// ── Move MCP server entry ────────────────────────────────────────────

async function moveMcp(item, toScopeId, scopes) {
  const fromMcpJson = item.path;
  const toMcpJson = resolveMcpJson(toScopeId, scopes);

  if (!toMcpJson) {
    return { ok: false, error: `Cannot resolve .mcp.json for scope: ${toScopeId}` };
  }

  // Read source .mcp.json
  let fromContent;
  try {
    fromContent = JSON.parse(await readFile(fromMcpJson, "utf-8"));
  } catch {
    return { ok: false, error: `Cannot read source .mcp.json: ${fromMcpJson}` };
  }

  const serverConfig = fromContent.mcpServers?.[item.name];
  if (!serverConfig) {
    return { ok: false, error: `Server "${item.name}" not found in ${fromMcpJson}` };
  }

  // Read or create destination .mcp.json
  let toContent = { mcpServers: {} };
  try {
    toContent = JSON.parse(await readFile(toMcpJson, "utf-8"));
    if (!toContent.mcpServers) toContent.mcpServers = {};
  } catch {
    // File doesn't exist or is invalid, start fresh
  }

  if (toContent.mcpServers[item.name]) {
    return { ok: false, error: `Server "${item.name}" already exists in destination` };
  }

  // Add to destination
  toContent.mcpServers[item.name] = serverConfig;

  // Remove from source
  delete fromContent.mcpServers[item.name];

  // Write both files
  await mkdir(dirname(toMcpJson), { recursive: true });
  await writeFile(toMcpJson, JSON.stringify(toContent, null, 2) + "\n");
  await writeFile(fromMcpJson, JSON.stringify(fromContent, null, 2) + "\n");

  return {
    ok: true,
    from: fromMcpJson,
    to: toMcpJson,
    message: `Moved MCP server "${item.name}" from ${item.scopeId} to ${toScopeId}`,
  };
}

// ── Main move function ───────────────────────────────────────────────

/**
 * Move an item to a different scope.
 *
 * @param {object} item - Item object from scanner
 * @param {string} toScopeId - Target scope ID
 * @param {object[]} scopes - All scopes from scanner
 * @returns {{ ok: boolean, error?: string, from?: string, to?: string, message?: string }}
 */
export async function moveItem(item, toScopeId, scopes) {
  const validation = validateMove(item, toScopeId);
  if (!validation.ok) return validation;

  try {
    switch (item.category) {
      case "memory":
        return await moveMemory(item, toScopeId);
      case "skill":
        return await moveSkill(item, toScopeId, scopes);
      case "mcp":
        return await moveMcp(item, toScopeId, scopes);
      default:
        return { ok: false, error: `Unknown category: ${item.category}` };
    }
  } catch (err) {
    return { ok: false, error: `Move failed: ${err.message}` };
  }
}

/**
 * Get valid destination scopes for an item.
 * Returns only scopes where this category of item can live.
 */
export function getValidDestinations(item, scopes) {
  if (item.locked) return [];

  return scopes
    .filter(s => s.id !== item.scopeId)
    .filter(s => {
      switch (item.category) {
        case "memory":
          return true; // memories can go to any scope
        case "skill":
          // skills can go to global or any scope with a repoDir
          return s.id === "global" || s.repoDir;
        case "mcp":
          return true; // mcp can go to any scope
        default:
          return false;
      }
    });
}
