/**
 * Edge case + coverage gap tests.
 *
 * Tests scenarios the happy-path tests don't cover:
 * - sharesGlobalClaudeDir detection
 * - Unknown/invalid categories
 * - Empty data sets
 * - Multi-level ancestors (grandparent)
 * - Same-name items across 3+ scopes
 * - MCP path differences (.mcp.json vs .claude.json)
 * - Boundary conditions
 *
 * Run: node --test tests/unit/test-edge-cases.mjs
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { getValidDestinations, sharesGlobalClaudeDir } from '../../src/mover.mjs';
import {
  hasEffectiveRule, getAncestorScopes, computeEffectiveSets, getEffectiveItems
} from '../../src/effective.mjs';

const HOME = homedir();
const itemKey = (i) => `${i.category}::${i.name}::${i.scopeId}`;

// ── sharesGlobalClaudeDir ──────────────────────────────────────────

describe('sharesGlobalClaudeDir', () => {

  it('returns true when repoDir is HOME', () => {
    assert.strictEqual(sharesGlobalClaudeDir({ repoDir: HOME }), true);
  });

  it('returns false when repoDir is a normal project', () => {
    assert.strictEqual(sharesGlobalClaudeDir({ repoDir: '/tmp/project' }), false);
  });

  it('returns false when repoDir is null', () => {
    assert.strictEqual(sharesGlobalClaudeDir({ repoDir: null }), false);
  });

  it('returns false when repoDir is undefined', () => {
    assert.strictEqual(sharesGlobalClaudeDir({}), false);
  });

  it('returns false for HOME subdirectory (not HOME itself)', () => {
    assert.strictEqual(sharesGlobalClaudeDir({ repoDir: join(HOME, 'projects') }), false);
  });

  it('returns false for HOME parent (should not match)', () => {
    const parent = HOME.split('/').slice(0, -1).join('/');
    assert.strictEqual(sharesGlobalClaudeDir({ repoDir: parent }), false);
  });
});

// ── getValidDestinations — edge cases ──────────────────────────────

describe('getValidDestinations — edge cases', () => {

  const scopes = [
    { id: 'global', type: 'global', repoDir: null },
    { id: 'proj', type: 'project', repoDir: '/tmp/proj' },
  ];

  it('unknown category returns empty', () => {
    const item = { category: 'banana', scopeId: 'proj', locked: false };
    assert.deepStrictEqual(getValidDestinations(item, scopes), []);
  });

  it('empty scopes array returns empty', () => {
    const item = { category: 'skill', scopeId: 'proj', locked: false };
    assert.deepStrictEqual(getValidDestinations(item, []), []);
  });

  it('item already in global — global not in destinations (no self-move)', () => {
    const item = { category: 'skill', scopeId: 'global', locked: false };
    const dests = getValidDestinations(item, scopes);
    assert.ok(!dests.some(s => s.id === 'global'));
  });

  it('scope without repoDir is not a valid destination for file-based items', () => {
    const scopesWithNull = [
      { id: 'global', type: 'global', repoDir: null },
      { id: 'broken', type: 'project', repoDir: null },
    ];
    const item = { category: 'skill', scopeId: 'global', locked: false };
    const dests = getValidDestinations(item, scopesWithNull);
    assert.ok(!dests.some(s => s.id === 'broken'));
  });

  it('MCP CAN go to scope without repoDir (uses claudeProjectDir)', () => {
    const scopesWithNull = [
      { id: 'global', type: 'global', repoDir: null },
      { id: 'broken', type: 'project', repoDir: null },
    ];
    const item = { category: 'mcp', scopeId: 'global', locked: false };
    const dests = getValidDestinations(item, scopesWithNull);
    assert.ok(dests.some(s => s.id === 'broken'));
  });
});

// ── Effective rules — edge cases ───────────────────────────────────

describe('getEffectiveItems — edge cases', () => {

  it('empty items array returns empty', () => {
    const scopes = [{ id: 'global', type: 'global', repoDir: null }];
    assert.deepStrictEqual(getEffectiveItems('global', [], scopes), []);
  });

  it('non-existent scopeId still includes global effective items', () => {
    const scopes = [{ id: 'global', type: 'global', repoDir: null }];
    const items = [{ category: 'skill', name: 'x', scopeId: 'global' }];
    const result = getEffectiveItems('nonexistent', items, scopes);
    // No own items, but global skill (participating category) is included
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].scopeId, 'global');
  });

  it('global scope only returns own items (no inheritance)', () => {
    const scopes = [
      { id: 'global', type: 'global', repoDir: null },
      { id: 'proj', type: 'project', repoDir: '/tmp/proj' },
    ];
    const items = [
      { category: 'skill', name: 'a', scopeId: 'global' },
      { category: 'skill', name: 'b', scopeId: 'proj' },
    ];
    const result = getEffectiveItems('global', items, scopes);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].name, 'a');
  });
});

describe('computeEffectiveSets — edge cases', () => {

  it('empty items returns empty sets', () => {
    const { shadowedKeys, conflictKeys, ancestorKeys } = computeEffectiveSets('proj', [], [], itemKey);
    assert.strictEqual(shadowedKeys.size, 0);
    assert.strictEqual(conflictKeys.size, 0);
    assert.strictEqual(ancestorKeys.size, 0);
  });

  it('null scopeId returns empty sets', () => {
    const { shadowedKeys } = computeEffectiveSets(null, [], [], itemKey);
    assert.strictEqual(shadowedKeys.size, 0);
  });

  it('only shadowed items are global ones with matching project names', () => {
    const items = [
      { category: 'mcp', name: 'github', scopeId: 'proj' },
      { category: 'mcp', name: 'github', scopeId: 'global' },
      { category: 'mcp', name: 'slack', scopeId: 'proj' },  // unique — not shadowed
    ];
    const scopes = [
      { id: 'global', repoDir: null },
      { id: 'proj', repoDir: '/tmp/proj' },
    ];
    const { shadowedKeys } = computeEffectiveSets('proj', items, scopes, itemKey);
    assert.strictEqual(shadowedKeys.size, 1);
    assert.ok([...shadowedKeys][0].includes('global'));
  });

  it('project item is NEVER shadowed (only global gets shadowed)', () => {
    const items = [
      { category: 'agent', name: 'bot', scopeId: 'proj' },
      { category: 'agent', name: 'bot', scopeId: 'global' },
    ];
    const scopes = [{ id: 'global', repoDir: null }, { id: 'proj', repoDir: '/tmp/proj' }];
    const { shadowedKeys } = computeEffectiveSets('proj', items, scopes, itemKey);
    for (const key of shadowedKeys) {
      assert.ok(key.includes('global'), 'only global items should be shadowed');
      assert.ok(!key.includes('proj'), 'project items should NOT be shadowed');
    }
  });

  it('command conflict flags BOTH project and global items', () => {
    const items = [
      { category: 'command', name: 'deploy', scopeId: 'proj' },
      { category: 'command', name: 'deploy', scopeId: 'global' },
    ];
    const scopes = [{ id: 'global', repoDir: null }, { id: 'proj', repoDir: '/tmp/proj' }];
    const { conflictKeys } = computeEffectiveSets('proj', items, scopes, itemKey);
    assert.strictEqual(conflictKeys.size, 2);
  });

  it('non-overlapping names produce zero conflicts/shadows', () => {
    const items = [
      { category: 'mcp', name: 'a', scopeId: 'proj' },
      { category: 'mcp', name: 'b', scopeId: 'global' },
      { category: 'command', name: 'x', scopeId: 'proj' },
      { category: 'command', name: 'y', scopeId: 'global' },
    ];
    const scopes = [{ id: 'global', repoDir: null }, { id: 'proj', repoDir: '/tmp/proj' }];
    const { shadowedKeys, conflictKeys } = computeEffectiveSets('proj', items, scopes, itemKey);
    assert.strictEqual(shadowedKeys.size, 0);
    assert.strictEqual(conflictKeys.size, 0);
  });
});

// ── Multi-level ancestor detection ─────────────────────────────────

describe('getAncestorScopes — multi-level', () => {

  const scopes = [
    { id: 'global', type: 'global', repoDir: null },
    { id: 'company', type: 'project', repoDir: '/work/company' },
    { id: 'team', type: 'project', repoDir: '/work/company/team' },
    { id: 'repo', type: 'project', repoDir: '/work/company/team/repo' },
  ];

  it('repo sees both team and company as ancestors', () => {
    const ancestors = getAncestorScopes('repo', scopes);
    const ids = ancestors.map(s => s.id).sort();
    assert.deepStrictEqual(ids, ['company', 'team']);
  });

  it('team sees company as ancestor but not repo', () => {
    const ancestors = getAncestorScopes('team', scopes);
    assert.deepStrictEqual(ancestors.map(s => s.id), ['company']);
  });

  it('company has no ancestors', () => {
    assert.strictEqual(getAncestorScopes('company', scopes).length, 0);
  });

  it('ancestor items from grandparent are included in effective view', () => {
    const items = [
      { category: 'config', name: 'CLAUDE.md', scopeId: 'company' },
      { category: 'config', name: 'CLAUDE.md', scopeId: 'team' },
      { category: 'memory', name: 'team_notes', scopeId: 'team' },
      { category: 'skill', name: 'deploy', scopeId: 'repo' },
    ];
    const effective = getEffectiveItems('repo', items, scopes);
    // Should include: repo skill + company CLAUDE.md (ancestor) + team CLAUDE.md (ancestor) + team memory (ancestor)
    assert.ok(effective.some(i => i.scopeId === 'company' && i.name === 'CLAUDE.md'));
    assert.ok(effective.some(i => i.scopeId === 'team' && i.name === 'CLAUDE.md'));
    assert.ok(effective.some(i => i.scopeId === 'team' && i.name === 'team_notes'));
  });

  it('ancestorKeys includes grandparent items', () => {
    const items = [
      { category: 'config', name: 'CLAUDE.md', scopeId: 'company' },
      { category: 'config', name: 'CLAUDE.md', scopeId: 'team' },
    ];
    const { ancestorKeys } = computeEffectiveSets('repo', items, scopes, itemKey);
    assert.ok([...ancestorKeys].some(k => k.includes('company')));
    assert.ok([...ancestorKeys].some(k => k.includes('team')));
  });
});

// ── Same-name items across 3+ scopes ───────────────────────────────

describe('Same-name items across 3 scopes', () => {

  const scopes = [
    { id: 'global', type: 'global', repoDir: null },
    { id: 'parent', type: 'project', repoDir: '/work/parent' },
    { id: 'child', type: 'project', repoDir: '/work/parent/child' },
  ];

  it('MCP: only global copy is shadowed (child scope is selected)', () => {
    const items = [
      { category: 'mcp', name: 'server', scopeId: 'global' },
      { category: 'mcp', name: 'server', scopeId: 'parent' },
      { category: 'mcp', name: 'server', scopeId: 'child' },
    ];
    // When viewing child scope, only items from global scope get shadowed
    // (parent is not "global" so computeEffectiveSets only checks global vs project)
    const { shadowedKeys } = computeEffectiveSets('child', items, scopes, itemKey);
    assert.ok([...shadowedKeys].some(k => k.includes('global')));
    // parent's copy is an ancestor item, not shadowed by child
    assert.ok(![...shadowedKeys].some(k => k.includes('parent')));
  });

  it('command: same name in all 3 scopes → only global+child flagged as conflict', () => {
    const items = [
      { category: 'command', name: 'deploy', scopeId: 'global' },
      { category: 'command', name: 'deploy', scopeId: 'parent' },
      { category: 'command', name: 'deploy', scopeId: 'child' },
    ];
    const { conflictKeys } = computeEffectiveSets('child', items, scopes, itemKey);
    // Only child (project) vs global are checked for conflicts
    assert.ok([...conflictKeys].some(k => k.includes('child')));
    assert.ok([...conflictKeys].some(k => k.includes('global')));
  });
});

// ── hasEffectiveRule completeness ───────────────────────────────────

describe('hasEffectiveRule — all 11 categories', () => {

  const ALL_CATEGORIES = ['skill', 'memory', 'mcp', 'command', 'agent', 'plan', 'rule', 'config', 'hook', 'plugin', 'session'];

  it('participating categories return true', () => {
    const expected = ['skill', 'memory', 'mcp', 'command', 'agent', 'config', 'hook'];
    for (const cat of expected) {
      assert.ok(hasEffectiveRule(cat), `${cat} should participate`);
    }
  });

  it('non-participating categories return false', () => {
    const expected = ['plan', 'rule', 'plugin', 'session'];
    for (const cat of expected) {
      assert.ok(!hasEffectiveRule(cat), `${cat} should NOT participate`);
    }
  });

  it('every known category is explicitly tested', () => {
    for (const cat of ALL_CATEGORIES) {
      // Just verify it doesn't throw
      const result = hasEffectiveRule(cat);
      assert.strictEqual(typeof result, 'boolean', `${cat} should return boolean`);
    }
  });

  it('unknown category returns false', () => {
    assert.ok(!hasEffectiveRule('banana'));
    assert.ok(!hasEffectiveRule(''));
    assert.ok(!hasEffectiveRule(undefined));
  });
});
