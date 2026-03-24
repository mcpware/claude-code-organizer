#!/usr/bin/env node

/**
 * MCP server layer for Claude Code Organizer.
 * Wraps existing scan/move/delete functions as MCP tools
 * so AI clients (Claude, Cursor, Windsurf) can discover and call them.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { scan } from './scanner.mjs';
import { moveItem, deleteItem, getValidDestinations } from './mover.mjs';

const server = new McpServer({
  name: 'claude-code-organizer',
  version: '0.3.6',
});

// Cache scan data so move/delete can look up items
let cachedData = null;

async function freshScan() {
  cachedData = await scan();
  return cachedData;
}

/**
 * Find an item in cached scan data by category + name + scopeId.
 * Returns the item object that mover.mjs expects.
 */
function findItem(category, name, scopeId) {
  if (!cachedData) return null;
  return cachedData.items.find(i =>
    i.category === category &&
    (i.name === name || i.fileName === name) &&
    i.scopeId === scopeId
  ) || null;
}

server.tool(
  'scan_inventory',
  'Scan all Claude Code configurations across every scope (global, workspace, project). Returns memories, skills, MCP servers, hooks, configs, plugins, and plans with their file paths and metadata.',
  {},
  async () => {
    const data = await freshScan();
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    };
  }
);

server.tool(
  'move_item',
  'Move a Claude Code configuration item (memory, skill, MCP server) from one scope to another. Run scan_inventory first to see available items and scope IDs.',
  {
    category: z.enum(['memory', 'skill', 'mcp']).describe('Category of item to move'),
    name: z.string().describe('Name of the item (as shown in scan_inventory results)'),
    fromScopeId: z.string().describe('Source scope ID (e.g. "global" or the encoded project directory name)'),
    toScopeId: z.string().describe('Destination scope ID'),
  },
  async ({ category, name, fromScopeId, toScopeId }) => {
    if (!cachedData) await freshScan();

    const item = findItem(category, name, fromScopeId);
    if (!item) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ ok: false, error: `Item not found: ${category} "${name}" in scope "${fromScopeId}". Run scan_inventory first to see available items.` }) }],
      };
    }

    const result = await moveItem(item, toScopeId, cachedData.scopes);
    if (result.ok) await freshScan();

    return {
      content: [{ type: 'text', text: JSON.stringify(result) }],
    };
  }
);

server.tool(
  'delete_item',
  'Delete a Claude Code configuration item (memory, skill, MCP server entry). Run scan_inventory first to see available items and scope IDs.',
  {
    category: z.enum(['memory', 'skill', 'mcp']).describe('Category of item to delete'),
    name: z.string().describe('Name of the item (as shown in scan_inventory results)'),
    scopeId: z.string().describe('Scope ID where the item lives'),
  },
  async ({ category, name, scopeId }) => {
    if (!cachedData) await freshScan();

    const item = findItem(category, name, scopeId);
    if (!item) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ ok: false, error: `Item not found: ${category} "${name}" in scope "${scopeId}". Run scan_inventory first to see available items.` }) }],
      };
    }

    const result = await deleteItem(item, cachedData.scopes);
    if (result.ok) await freshScan();

    return {
      content: [{ type: 'text', text: JSON.stringify(result) }],
    };
  }
);

server.tool(
  'list_destinations',
  'List valid destination scopes for a specific item. Shows where this item can be moved to.',
  {
    category: z.enum(['memory', 'skill', 'mcp']).describe('Category of item'),
    name: z.string().describe('Name of the item'),
    scopeId: z.string().describe('Current scope ID of the item'),
  },
  async ({ category, name, scopeId }) => {
    if (!cachedData) await freshScan();

    const item = findItem(category, name, scopeId);
    if (!item) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ ok: false, error: `Item not found: ${category} "${name}" in scope "${scopeId}". Run scan_inventory first to see available items.` }) }],
      };
    }

    const destinations = getValidDestinations(item, cachedData.scopes);
    return {
      content: [{ type: 'text', text: JSON.stringify({ ok: true, destinations, currentScopeId: item.scopeId }, null, 2) }],
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
