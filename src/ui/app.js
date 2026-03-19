/**
 * app.js — Frontend logic for Claude Inventory Manager.
 *
 * Fetches data from /api/scan, renders the scope tree,
 * handles drag-and-drop (SortableJS), search, filter, detail panel.
 *
 * All DOM rendering is here. Change index.html for structure,
 * style.css for appearance, this file for behavior.
 */

// ── State ────────────────────────────────────────────────────────────

let data = null;         // { scopes, items, counts }
let activeFilters = new Set(); // empty = show all, or set of "memory", "skill", "mcp", etc.
let selectedItem = null; // currently selected item object
let pendingDrag = null;  // { item, fromScopeId, toScopeId, revertFn }
let pendingDelete = null; // item to delete
let draggingItem = null; // item currently being dragged
let expandState = { scopes: new Set(), cats: new Set() }; // track expanded sections

// ── Category config ──────────────────────────────────────────────────

const CATEGORIES = {
  config:  { icon: "⚙️", label: "CONFIG",      group: null },
  memory:  { icon: "🧠", label: "MEMORIES",    group: "memory" },
  skill:   { icon: "⚡", label: "SKILLS",      group: "skill" },
  mcp:     { icon: "🔌", label: "MCP SERVERS", group: "mcp" },
  hook:    { icon: "🪝", label: "HOOKS",       group: null },
  plugin:  { icon: "🧩", label: "PLUGINS",     group: null },
  plan:    { icon: "📐", label: "PLANS",       group: null },
};

const ITEM_ICONS = {
  memory: "🧠", skill: "⚡", mcp: "🔌", config: "⚙️",
  hook: "🪝", plugin: "🧩", plan: "📐",
};

const SCOPE_ICONS = { global: "🌐", workspace: "📂", project: "📂" };

// ── Init ─────────────────────────────────────────────────────────────

async function init() {
  data = await fetchJson("/api/scan");
  document.getElementById("loading").style.display = "none";
  renderPills();
  renderTree();
  setupSearch();
  setupDetailPanel();
  setupModals();
}

async function fetchJson(url) {
  const res = await fetch(url);
  return res.json();
}

// ── Pills (filter tabs with counts) ──────────────────────────────────

function renderPills() {
  const el = document.getElementById("pills");
  const pills = [
    { key: "all", label: "All", count: data.counts.total },
    { key: "memory", label: "🧠 Memory", count: data.counts.memory || 0 },
    { key: "skill", label: "⚡ Skills", count: data.counts.skill || 0 },
    { key: "mcp", label: "🔌 MCP", count: data.counts.mcp || 0 },
    { key: "config", label: "⚙️ Config", count: data.counts.config || 0 },
    { key: "hook", label: "🪝 Hooks", count: data.counts.hook || 0 },
    { key: "plugin", label: "🧩 Plugins", count: data.counts.plugin || 0 },
    { key: "plan", label: "📐 Plans", count: data.counts.plan || 0 },
  ];

  // "All" is active when no filters selected
  const allActive = activeFilters.size === 0;

  el.innerHTML = pills.map(p => {
    const isActive = p.key === "all" ? allActive : activeFilters.has(p.key);
    return `<span class="pill${isActive ? ' active' : ''}" data-filter="${p.key}">${p.label} <b>${p.count}</b></span>`;
  }).join("");

  el.querySelectorAll(".pill").forEach(pill => {
    pill.addEventListener("click", () => {
      const key = pill.dataset.filter;
      if (key === "all") {
        // Clear all filters → show everything
        activeFilters.clear();
      } else {
        // Toggle this filter
        if (activeFilters.has(key)) {
          activeFilters.delete(key);
        } else {
          activeFilters.add(key);
        }
      }
      // Re-render pill states
      const allNow = activeFilters.size === 0;
      el.querySelectorAll(".pill").forEach(p => {
        const k = p.dataset.filter;
        p.classList.toggle("active", k === "all" ? allNow : activeFilters.has(k));
      });
      applyFilter();
    });
  });
}

function applyFilter() {
  const hasFilter = activeFilters.size > 0;
  document.querySelectorAll(".cat-hdr").forEach(hdr => {
    const cat = hdr.dataset.cat;
    const show = !hasFilter || activeFilters.has(cat);
    hdr.style.display = show ? "" : "none";
    const body = hdr.nextElementSibling;
    if (body) body.style.display = show ? "" : "none";
  });
}

// ── Tree rendering ───────────────────────────────────────────────────

function renderTree() {
  const treeEl = document.getElementById("tree");
  const rootScopes = data.scopes.filter(s => s.parentId === null);

  let html = "";

  // Render from root — renderScope recursively handles children
  for (const scope of rootScopes) {
    html += renderScope(scope, 0);
  }

  treeEl.innerHTML = html;
  initSortable();
}

function renderScope(scope, depth) {
  const items = data.items.filter(i => i.scopeId === scope.id);
  const childScopes = data.scopes.filter(s => s.parentId === scope.id);
  const totalCount = items.length + childScopes.reduce((sum, cs) =>
    sum + data.items.filter(i => i.scopeId === cs.id).length, 0
  );

  const icon = SCOPE_ICONS[scope.type] || "📂";
  const tagClass = `tag-${scope.type}`;

  // Build inheritance pills
  let inheritHtml = "";
  if (scope.parentId) {
    const chain = getScopeChain(scope);
    if (chain.length > 0) {
      const pills = chain.map(s =>
        `<span class="inherit-pill">${SCOPE_ICONS[s.type] || "📂"} ${esc(s.name)}</span>`
      ).join(" ");
      inheritHtml = `<div class="inherit"><span class="inherit-arrow">↳</span> Inherits ${pills}</div>`;
    }
  }

  // Group items by category
  const categories = {};
  for (const item of items) {
    (categories[item.category] ??= []).push(item);
  }

  // Count sub-projects
  const subInfo = childScopes.length > 0 ? `${childScopes.length} sub-projects` : "";

  let html = `
    <div class="scope-block">
      <div class="scope-hdr" data-scope-id="${esc(scope.id)}">
        <span class="scope-tog">▼</span>
        <span class="scope-ico">${icon}</span>
        <span class="scope-nm">${esc(scope.name)}</span>
        <span class="scope-tag ${tagClass}">${esc(scope.tag)}</span>
        <span class="scope-info">${esc(subInfo)}</span>
        <span class="scope-cnt">${totalCount}</span>
      </div>
      <div class="scope-body">
        ${inheritHtml}`;

  // Render each category
  for (const [cat, catItems] of Object.entries(categories)) {
    const catConfig = CATEGORIES[cat] || { icon: "📄", label: cat.toUpperCase(), group: null };
    html += `
        <div class="cat-hdr" data-cat="${esc(cat)}">
          <span class="cat-tog">▼</span>
          <span class="cat-ico">${catConfig.icon}</span>
          <span class="cat-nm">${catConfig.label}</span>
          <span class="cat-cnt">${catItems.length}</span>
        </div>
        <div class="cat-body" data-cat="${esc(cat)}">
          <div class="sortable-zone" data-scope="${esc(scope.id)}" data-group="${catConfig.group || 'none'}">
            ${catItems.map(item => renderItem(item)).join("")}
          </div>
        </div>`;
  }

  // Render child scopes
  if (childScopes.length > 0) {
    html += `<div class="child-scopes">`;
    for (const child of childScopes) {
      html += renderScope(child, depth + 1);
    }
    html += `</div>`;
  }

  html += `</div></div>`;
  return html;
}

function renderItem(item) {
  const icon = ITEM_ICONS[item.category] || "📄";
  const locked = item.locked ? " locked" : "";
  const badgeClass = `b-${item.subType || item.category}`;

  const actions = item.locked ? "" : `
    <span class="row-acts">
      <button class="rbtn" data-action="move">Move</button>
      <button class="rbtn" data-action="open">Open</button>
      <button class="rbtn rbtn-danger" data-action="delete">Delete</button>
    </span>`;

  return `
    <div class="item-row${locked}" data-path="${esc(item.path)}" data-category="${item.category}">
      <span class="row-ico">${icon}</span>
      <span class="row-name">${esc(item.name)}</span>
      <span class="row-badge ${badgeClass}">${esc(item.subType || item.category)}</span>
      <span class="row-desc">${esc(item.description)}</span>
      <span class="row-meta">${esc(item.size)}${item.fileCount ? ` · ${item.fileCount} files` : ""}</span>
      ${actions}
    </div>`;
}

function getScopeChain(scope) {
  const chain = [];
  let current = scope;
  while (current.parentId) {
    const parent = data.scopes.find(s => s.id === current.parentId);
    if (!parent) break;
    chain.unshift(parent);
    current = parent;
  }
  return chain;
}

function esc(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ── SortableJS init ──────────────────────────────────────────────────

function saveExpandState() {
  expandState.scopes.clear();
  expandState.cats.clear();
  document.querySelectorAll(".scope-hdr").forEach(hdr => {
    const body = hdr.nextElementSibling;
    if (body && !body.classList.contains("c")) {
      expandState.scopes.add(hdr.dataset.scopeId);
    }
  });
  document.querySelectorAll(".cat-hdr").forEach(hdr => {
    const body = hdr.nextElementSibling;
    const scopeId = hdr.closest(".scope-block")?.querySelector(".scope-hdr")?.dataset.scopeId || "";
    const catKey = `${scopeId}::${hdr.dataset.cat}`;
    if (body && !body.classList.contains("c")) {
      expandState.cats.add(catKey);
    }
  });
}

function restoreExpandState() {
  // Scopes default open — collapse those NOT in saved state (only if we have saved state)
  const hasSavedState = expandState.scopes.size > 0 || expandState.cats.size > 0;
  document.querySelectorAll(".scope-hdr").forEach(hdr => {
    const body = hdr.nextElementSibling;
    const tog = hdr.querySelector(".scope-tog");
    if (hasSavedState && !expandState.scopes.has(hdr.dataset.scopeId)) {
      body?.classList.add("c");
      tog?.classList.add("c");
    }
  });

  // Categories default collapsed — expand those in saved state
  document.querySelectorAll(".cat-hdr").forEach(hdr => {
    const body = hdr.nextElementSibling;
    const tog = hdr.querySelector(".cat-tog");
    const scopeId = hdr.closest(".scope-block")?.querySelector(".scope-hdr")?.dataset.scopeId || "";
    const catKey = `${scopeId}::${hdr.dataset.cat}`;

    if (expandState.cats.has(catKey)) {
      body?.classList.remove("c");
      tog?.classList.remove("c");
    } else {
      body?.classList.add("c");
      tog?.classList.add("c");
    }
  });
}

function initSortable() {
  document.querySelectorAll(".sortable-zone").forEach(el => {
    const group = el.dataset.group;
    if (!group || group === "none") return;

    Sortable.create(el, {
      group,
      animation: 150,
      ghostClass: "sortable-ghost",
      chosenClass: "sortable-chosen",
      draggable: ".item-row:not(.locked)",
      fallbackOnBody: true,
      scroll: document.querySelector(".tree-area"),
      scrollSensitivity: 100,
      scrollSpeed: 15,
      bubbleScroll: true,
      onStart(evt) {
        const itemPath = evt.item.dataset.path;
        draggingItem = data.items.find(i => i.path === itemPath);
      },
      onEnd(evt) {
        draggingItem = null;
        // Remove all drop-target highlights
        document.querySelectorAll(".scope-block.drop-target").forEach(b => b.classList.remove("drop-target"));

        if (evt.from === evt.to) return;

        const itemEl = evt.item;
        const itemPath = itemEl.dataset.path;
        const item = data.items.find(i => i.path === itemPath);
        if (!item) return;

        const fromScopeId = evt.from.dataset.scope;
        const toScopeId = evt.to.dataset.scope;
        const fromScope = data.scopes.find(s => s.id === fromScopeId);
        const toScope = data.scopes.find(s => s.id === toScopeId);

        const oldParent = evt.from;
        const oldIndex = evt.oldIndex;
        const revertFn = () => {
          if (oldIndex >= oldParent.children.length) oldParent.appendChild(itemEl);
          else oldParent.insertBefore(itemEl, oldParent.children[oldIndex]);
        };

        pendingDrag = { item, fromScopeId, toScopeId, revertFn };
        showDragConfirm(item, fromScope, toScope);
      }
    });
  });

  // ── Scope card as drop zone (for cross-scope drag) ──
  document.querySelectorAll(".scope-block").forEach(block => {
    const hdr = block.querySelector(".scope-hdr");
    if (!hdr) return;
    const scopeId = hdr.dataset.scopeId;

    block.addEventListener("dragover", (e) => {
      if (!draggingItem) return;
      if (draggingItem.scopeId === scopeId) return;
      e.preventDefault();
      // Highlight only this scope card (remove from others first)
      document.querySelectorAll(".scope-block.drop-target").forEach(b => {
        if (b !== block) b.classList.remove("drop-target");
      });
      block.classList.add("drop-target");
    });

    block.addEventListener("dragleave", (e) => {
      if (!block.contains(e.relatedTarget)) {
        block.classList.remove("drop-target");
      }
    });

    block.addEventListener("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();
      block.classList.remove("drop-target");
      document.querySelectorAll(".scope-block.drop-target").forEach(b => b.classList.remove("drop-target"));

      if (!draggingItem) return;
      if (draggingItem.scopeId === scopeId) return;

      const item = draggingItem;
      const fromScope = data.scopes.find(s => s.id === item.scopeId);
      const toScope = data.scopes.find(s => s.id === scopeId);

      pendingDrag = { item, fromScopeId: item.scopeId, toScopeId: scopeId, revertFn: () => {} };
      showDragConfirm(item, fromScope, toScope);
      draggingItem = null;
    });
  });

  // Scope header toggle — default OPEN
  document.querySelectorAll(".scope-hdr").forEach(hdr => {
    hdr.addEventListener("click", () => {
      const body = hdr.nextElementSibling;
      const tog = hdr.querySelector(".scope-tog");
      body.classList.toggle("c");
      tog.classList.toggle("c");
    });
  });

  // Category toggle — restore state or default collapsed
  restoreExpandState();

  document.querySelectorAll(".cat-hdr").forEach(hdr => {
    hdr.addEventListener("click", () => {
      const body = hdr.nextElementSibling;
      const tog = hdr.querySelector(".cat-tog");
      body.classList.toggle("c");
      tog.classList.toggle("c");
    });
  });

  // Item click → detail panel
  document.querySelectorAll(".item-row").forEach(row => {
    row.addEventListener("click", (e) => {
      if (e.target.closest(".rbtn")) return;
      const path = row.dataset.path;
      const item = data.items.find(i => i.path === path);
      if (item) showDetail(item, row);
    });
  });

  // Item action buttons
  document.querySelectorAll(".rbtn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const row = btn.closest(".item-row");
      const path = row.dataset.path;
      const item = data.items.find(i => i.path === path);
      if (!item) return;

      if (btn.dataset.action === "move") {
        selectedItem = item;
        openMoveModal(item);
      } else if (btn.dataset.action === "open") {
        window.open(`vscode://file${item.path}`, "_blank");
      } else if (btn.dataset.action === "delete") {
        openDeleteModal(item);
      }
    });
  });
}

// ── Search ───────────────────────────────────────────────────────────

function setupSearch() {
  document.getElementById("searchInput").addEventListener("input", function () {
    const q = this.value.toLowerCase();
    document.querySelectorAll(".item-row").forEach(row => {
      const text = row.textContent.toLowerCase();
      row.style.display = (!q || text.includes(q)) ? "" : "none";
    });
  });
}

// ── Detail panel ─────────────────────────────────────────────────────

function setupDetailPanel() {
  document.getElementById("detailClose").addEventListener("click", closeDetail);
  document.getElementById("detailOpen").addEventListener("click", () => {
    if (selectedItem) window.open(`vscode://file${selectedItem.path}`, "_blank");
  });
  document.getElementById("detailMove").addEventListener("click", () => {
    if (selectedItem && !selectedItem.locked) openMoveModal(selectedItem);
  });
  document.getElementById("detailDelete").addEventListener("click", () => {
    if (selectedItem && !selectedItem.locked) openDeleteModal(selectedItem);
  });
}

function showDetail(item, rowEl) {
  selectedItem = item;
  const panel = document.getElementById("detailPanel");
  panel.classList.remove("hidden");

  document.getElementById("detailTitle").textContent = item.name;
  document.getElementById("detailType").innerHTML = `<span class="row-badge b-${item.subType || item.category}">${item.subType || item.category}</span>`;
  const scope = data.scopes.find(s => s.id === item.scopeId);
  document.getElementById("detailScope").textContent = scope?.name || item.scopeId;
  document.getElementById("detailDesc").textContent = item.description || "—";
  document.getElementById("detailSize").textContent = item.size || "—";
  document.getElementById("detailDate").textContent = item.mtime || "—";
  document.getElementById("detailPath").textContent = item.path;

  // Show/hide move and delete buttons
  document.getElementById("detailMove").style.display = item.locked ? "none" : "";
  document.getElementById("detailDelete").style.display = item.locked ? "none" : "";

  // Highlight row
  document.querySelectorAll(".item-row.selected").forEach(r => r.classList.remove("selected"));
  if (rowEl) rowEl.classList.add("selected");
}

function closeDetail() {
  document.getElementById("detailPanel").classList.add("hidden");
  document.querySelectorAll(".item-row.selected").forEach(r => r.classList.remove("selected"));
  selectedItem = null;
}

// ── Drag confirm rendering ───────────────────────────────────────────

function showDragConfirm(item, fromScope, toScope) {
  const catConfig = CATEGORIES[item.category] || { icon: "📄", label: item.category };
  const badgeClass = `b-${item.subType || item.category}`;
  const fromIcon = SCOPE_ICONS[fromScope?.type] || "📂";
  const toIcon = SCOPE_ICONS[toScope?.type] || "📂";

  document.getElementById("dcPreview").innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
      <span style="font-size:1.1rem;">${catConfig.icon}</span>
      <div>
        <div style="font-weight:700;color:var(--text-primary);font-size:0.88rem;">${esc(item.name)}</div>
        <div style="display:flex;gap:6px;align-items:center;margin-top:3px;">
          <span class="row-badge ${badgeClass}">${esc(item.subType || item.category)}</span>
          <span style="font-size:0.7rem;color:var(--text-muted);">${esc(item.category)}</span>
        </div>
      </div>
    </div>
    <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-top:1px solid var(--border-light);">
      <div style="flex:1;text-align:center;">
        <div style="font-size:0.6rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">From</div>
        <div style="font-size:0.82rem;font-weight:600;color:#dc2626;">${fromIcon} ${esc(fromScope?.name || "?")}</div>
        <div style="font-size:0.6rem;color:var(--text-faint);">${esc(fromScope?.tag || "")}</div>
      </div>
      <div style="font-size:1.2rem;color:var(--text-faint);">→</div>
      <div style="flex:1;text-align:center;">
        <div style="font-size:0.6rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">To</div>
        <div style="font-size:0.82rem;font-weight:600;color:#16a34a;">${toIcon} ${esc(toScope?.name || "?")}</div>
        <div style="font-size:0.6rem;color:var(--text-faint);">${esc(toScope?.tag || "")}</div>
      </div>
    </div>
  `;
  document.getElementById("dragConfirmModal").classList.remove("hidden");
}

// ── Modals ───────────────────────────────────────────────────────────

function openDeleteModal(item) {
  pendingDelete = item;
  const catConfig = CATEGORIES[item.category] || { icon: "📄", label: item.category };
  const scope = data.scopes.find(s => s.id === item.scopeId);

  document.getElementById("deletePreview").innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
      <span style="font-size:1.1rem;">${catConfig.icon}</span>
      <div>
        <div style="font-weight:700;color:var(--text-primary);font-size:0.88rem;">${esc(item.name)}</div>
        <div style="font-size:0.65rem;color:var(--text-muted);margin-top:2px;">${esc(scope?.name || item.scopeId)} · ${esc(item.category)}</div>
      </div>
    </div>
    <div style="font-size:0.68rem;color:#dc2626;margin-top:8px;padding-top:8px;border-top:1px solid var(--border-light);">
      ${item.category === "skill" ? "This will delete the entire skill folder and all its files." : "This will permanently delete the file."}
    </div>`;

  document.getElementById("deleteModal").classList.remove("hidden");
}

function setupModals() {
  // Drag confirm
  document.getElementById("dcCancel").addEventListener("click", () => {
    document.getElementById("dragConfirmModal").classList.add("hidden");
    if (pendingDrag?.revertFn) pendingDrag.revertFn();
    pendingDrag = null;
  });
  document.getElementById("dcConfirm").addEventListener("click", async () => {
    document.getElementById("dragConfirmModal").classList.add("hidden");
    if (pendingDrag) {
      const result = await doMove(pendingDrag.item.path, pendingDrag.toScopeId);
      if (!result.ok && pendingDrag.revertFn) pendingDrag.revertFn();
      pendingDrag = null;
    }
  });

  // Move modal
  document.getElementById("moveCancel").addEventListener("click", closeMoveModal);
  document.getElementById("moveModal").addEventListener("click", (e) => {
    if (e.target === document.getElementById("moveModal")) closeMoveModal();
  });
  document.getElementById("dragConfirmModal").addEventListener("click", (e) => {
    if (e.target === document.getElementById("dragConfirmModal")) {
      document.getElementById("dragConfirmModal").classList.add("hidden");
      if (pendingDrag?.revertFn) pendingDrag.revertFn();
      pendingDrag = null;
    }
  });

  // Delete modal
  document.getElementById("deleteCancel").addEventListener("click", () => {
    document.getElementById("deleteModal").classList.add("hidden");
    pendingDelete = null;
  });
  document.getElementById("deleteConfirm").addEventListener("click", async () => {
    document.getElementById("deleteModal").classList.add("hidden");
    if (pendingDelete) {
      await doDelete(pendingDelete.path);
      pendingDelete = null;
    }
  });
  document.getElementById("deleteModal").addEventListener("click", (e) => {
    if (e.target === document.getElementById("deleteModal")) {
      document.getElementById("deleteModal").classList.add("hidden");
      pendingDelete = null;
    }
  });
}

async function openMoveModal(item) {
  const res = await fetchJson(`/api/destinations?path=${encodeURIComponent(item.path)}`);
  if (!res.ok) return toast(res.error, true);

  const listEl = document.getElementById("moveDestList");
  // Build full scope lookup for indent
  const allScopeMap = {};
  for (const s of data.scopes) allScopeMap[s.id] = s;
  for (const s of res.destinations) allScopeMap[s.id] = s;

  function getDepth(scope) {
    let depth = 0;
    let cur = scope;
    while (cur.parentId) {
      depth++;
      cur = allScopeMap[cur.parentId] || { parentId: null };
    }
    return depth;
  }

  // Add current scope (grayed out) + all destinations
  const currentScope = data.scopes.find(s => s.id === res.currentScopeId);
  const allEntries = [];

  // Insert current scope at the right position based on depth
  const allScopes = currentScope
    ? [...res.destinations, { ...currentScope, isCurrent: true }]
    : res.destinations;

  // Sort by depth then name to maintain tree order
  allScopes.sort((a, b) => {
    const da = getDepth(a), db = getDepth(b);
    if (da !== db) return da - db;
    return a.name.localeCompare(b.name);
  });

  // Reorder to put children right after their parent
  const ordered = [];
  function addWithChildren(parentId) {
    for (const s of allScopes) {
      if ((s.parentId || null) === parentId) {
        ordered.push(s);
        addWithChildren(s.id);
      }
    }
  }
  addWithChildren(null);

  listEl.innerHTML = ordered.map(scope => {
    const depth = getDepth(scope);
    const indentPx = depth > 0 ? ` style="padding-left:${depth * 28}px"` : "";
    const icon = scope.id === "global" ? "🌐" : (SCOPE_ICONS[scope.type] || "📂");
    const curClass = scope.isCurrent ? " cur" : "";
    const curLabel = scope.isCurrent ? ' <span style="font-size:0.6rem;color:var(--text-faint);margin-left:4px;">(current)</span>' : "";
    return `<div class="dest${curClass}" data-scope-id="${esc(scope.id)}"${indentPx}>
      <span class="di">${icon}</span>
      <span class="dn">${esc(scope.name)}${curLabel}</span>
      <span class="dp">${esc(scope.tag)}</span>
    </div>`;
  }).join("");

  // Click handlers
  let selectedDest = null;
  listEl.querySelectorAll(".dest").forEach(d => {
    d.addEventListener("click", () => {
      listEl.querySelectorAll(".dest").forEach(x => x.classList.remove("sel"));
      d.classList.add("sel");
      selectedDest = d.dataset.scopeId;
      document.getElementById("moveConfirm").disabled = false;
    });
  });

  document.getElementById("moveConfirm").disabled = true;
  document.getElementById("moveConfirm").onclick = async () => {
    if (!selectedDest) return;
    closeMoveModal();
    await doMove(item.path, selectedDest);
  };

  document.getElementById("moveModal").classList.remove("hidden");
}

function closeMoveModal() {
  document.getElementById("moveModal").classList.add("hidden");
}

// ── API calls ────────────────────────────────────────────────────────

async function refreshUI() {
  saveExpandState();
  data = await fetchJson("/api/scan");
  renderPills();
  renderTree();
  closeDetail();
}

async function doMove(itemPath, toScopeId) {
  const response = await fetch("/api/move", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ itemPath, toScopeId }),
  });
  const result = await response.json();

  if (result.ok) {
    toast(result.message);
    await refreshUI();
  } else {
    toast(result.error, true);
  }

  return result;
}

async function doDelete(itemPath) {
  const response = await fetch("/api/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ itemPath }),
  });
  const result = await response.json();

  if (result.ok) {
    toast(result.message);
    await refreshUI();
  } else {
    toast(result.error, true);
  }

  return result;
}

// ── Toast ────────────────────────────────────────────────────────────

function toast(msg, isError = false) {
  const el = document.getElementById("toast");
  document.getElementById("toastMsg").textContent = msg;
  el.className = isError ? "toast error" : "toast";
  setTimeout(() => el.classList.add("hidden"), 4000);
}

// ── Start ────────────────────────────────────────────────────────────
init();
