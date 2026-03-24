/**
 * app.js — Frontend logic for Claude Code Organizer.
 *
 * Fetches data from /api/scan, renders the approved three-panel UI,
 * and keeps the existing search, filter, drag/drop, detail, bulk,
 * move, delete, and undo behaviors.
 */

let data = null;
let activeFilters = new Set();
let selectedItem = null;
let selectedScopeId = null;
let pendingDrag = null;
let pendingDelete = null;
let draggingItem = null;
let bulkSelected = new Set();
let searchQuery = "";
let selectMode = false;
let toastTimer = null;
let detailPreviewKey = null;

const uiState = {
  expandedScopes: new Set(),
  collapsedCats: new Set(),
  collapsedBundles: new Set(),
  sortBy: {}, // { [catKey]: { field: "size"|"date"|"name", dir: "asc"|"desc" } }
};

const CATEGORY_ORDER = ["skill", "memory", "mcp", "command", "agent", "plan", "rule", "config", "hook", "plugin", "session"];

const CATEGORIES = {
  memory: { icon: "🧠", label: "Memories", filterLabel: "Memories", group: "memory" },
  skill: { icon: "⚡", label: "Skills", filterLabel: "Skills", group: "skill" },
  session: { icon: "💬", label: "Sessions", filterLabel: "Sessions", group: null },
  mcp: { icon: "🔌", label: "MCP Servers", filterLabel: "MCP", group: "mcp" },
  command: { icon: "▶️", label: "Commands", filterLabel: "Commands", group: "command" },
  agent: { icon: "🤖", label: "Agents", filterLabel: "Agents", group: "agent" },
  plan: { icon: "📐", label: "Plans", filterLabel: "Plans", group: "plan" },
  rule: { icon: "📏", label: "Rules", filterLabel: "Rules", group: null },
  config: { icon: "⚙️", label: "Config", filterLabel: "Config", group: null },
  hook: { icon: "🪝", label: "Hooks", filterLabel: "Hooks", group: null },
  plugin: { icon: "🧩", label: "Plugins", filterLabel: "Plugins", group: null },
};

const ITEM_ICONS = {
  memory: "🧠",
  skill: "⚡",
  session: "💬",
  mcp: "🔌",
  command: "▶️",
  agent: "🤖",
  plan: "📐",
  rule: "📏",
  config: "⚙️",
  hook: "🪝",
  plugin: "🧩",
};

const SCOPE_ICONS = {
  global: "🌐",
  workspace: "📂",
  project: "📂",
};

const BADGE_CLASS = {
  feedback: "ib-feedback",
  user: "ib-user",
  project: "ib-project",
  reference: "ib-reference",
  skill: "ib-skill",
  mcp: "ib-mcp",
  session: "ib-session",
  config: "ib-config",
  hook: "ib-hook",
  plugin: "ib-plugin",
  plan: "ib-plan",
  memory: "ib-feedback",
  command: "ib-skill",
  agent: "ib-mcp",
  rule: "ib-config",
};

const SHORT_DATE = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

async function init() {
  try {
    data = await fetchJson("/api/scan");
    selectedScopeId = getInitialSelectedScopeId();
    initializeScopeState();
    setupUi();
    renderAll();
  } catch (error) {
    document.getElementById("loading").textContent = "Failed to load inventory";
    toast(error?.message || "Failed to load inventory", true);
  }
}

async function fetchJson(url) {
  const res = await fetch(url);
  return res.json();
}

function setupUi() {
  setupSearch();
  setupSidebarTree();
  setupFilterBar();
  setupItemList();
  setupDetailPanel();
  setupModals();
  setupBulkBar();
  setupScopeDropZones();
  setupThemeToggle();
  setupCcActions();
  setupResizers();
}

function setupSearch() {
  const input = document.getElementById("searchInput");
  input.addEventListener("input", () => {
    searchQuery = input.value.trim().toLowerCase();
    renderAll();
  });
}

function setupSidebarTree() {
  document.getElementById("sidebarTree").addEventListener("click", (event) => {
    const catRow = event.target.closest(".s-cat");
    if (catRow) {
      selectedScopeId = catRow.dataset.scopeId;
      expandScopePath(selectedScopeId);
      const cat = catRow.dataset.cat;
      if (activeFilters.size === 1 && activeFilters.has(cat)) {
        activeFilters.clear();
      } else {
        activeFilters = new Set([cat]);
      }
      renderAll();
      return;
    }

    const toggle = event.target.closest(".s-tog");
    if (toggle && !toggle.classList.contains("empty")) {
      const hdr = toggle.closest(".s-scope-hdr");
      if (!hdr) return;
      const scopeId = hdr.dataset.scopeId;
      if (uiState.expandedScopes.has(scopeId)) uiState.expandedScopes.delete(scopeId);
      else uiState.expandedScopes.add(scopeId);
      renderSidebar();
      return;
    }

    const hdr = event.target.closest(".s-scope-hdr");
    if (!hdr) return;
    selectedScopeId = hdr.dataset.scopeId;
    expandScopePath(selectedScopeId);
    if (selectedItem && selectedItem.scopeId !== selectedScopeId) {
      closeDetail();
    }
    renderAll();
  });
}

function setupFilterBar() {
  document.getElementById("pills").addEventListener("click", (event) => {
    const selectBtn = event.target.closest("#selectBtn");
    if (selectBtn) {
      selectMode = !selectMode;
      document.getElementById("app").classList.toggle("select-mode", selectMode);
      renderPills();
      updateBulkBar();
      return;
    }

    const pill = event.target.closest(".f-pill");
    if (!pill) return;

    const key = pill.dataset.filter;
    if (key === "all") {
      activeFilters.clear();
    } else if (activeFilters.has(key)) {
      activeFilters.delete(key);
    } else {
      activeFilters.add(key);
    }

    renderAll();
  });
}

function setupItemList() {
  const itemList = document.getElementById("itemList");

  itemList.addEventListener("click", (event) => {
    const actionBtn = event.target.closest(".act-btn");
    if (actionBtn) {
      const itemEl = actionBtn.closest(".item");
      const item = getItemByKey(itemEl?.dataset.itemKey);
      if (!item) return;

      if (actionBtn.dataset.action === "move") {
        openMoveModal(item);
      } else if (actionBtn.dataset.action === "open") {
        window.open(`vscode://file${item.path}`, "_blank");
      } else if (actionBtn.dataset.action === "delete") {
        openDeleteModal(item);
      }
      return;
    }

    if (event.target.closest(".item-chk")) return;

    const sortBtn = event.target.closest(".sort-btn");
    if (sortBtn) {
      const cat = sortBtn.dataset.cat;
      const field = sortBtn.dataset.sort;
      const catKey = `${selectedScopeId}::${cat}`;
      const current = uiState.sortBy[catKey];
      if (current?.field === field) {
        uiState.sortBy[catKey] = { field, dir: current.dir === "asc" ? "desc" : "asc" };
      } else {
        uiState.sortBy[catKey] = { field, dir: field === "date" ? "desc" : "asc" };
      }
      renderMainContent();
      initSortable();
      return;
    }

    const catHdr = event.target.closest(".cat-hdr");
    if (catHdr && !event.target.closest(".sort-btn")) {
      const key = `${selectedScopeId}::${catHdr.dataset.cat}`;
      if (uiState.collapsedCats.has(key)) uiState.collapsedCats.delete(key);
      else uiState.collapsedCats.add(key);
      renderMainContent();
      initSortable();
      return;
    }

    const bundleRow = event.target.closest(".bundle-row");
    if (bundleRow) {
      const key = `${selectedScopeId}::${bundleRow.dataset.bundle}`;
      if (uiState.collapsedBundles.has(key)) uiState.collapsedBundles.delete(key);
      else uiState.collapsedBundles.add(key);
      renderMainContent();
      initSortable();
      return;
    }

    const itemEl = event.target.closest(".item");
    if (!itemEl) return;
    const item = getItemByKey(itemEl.dataset.itemKey);
    if (item) showDetail(item);
  });

  itemList.addEventListener("change", (event) => {
    const checkbox = event.target.closest(".item-chk");
    if (!checkbox) return;

    const key = checkbox.dataset.itemKey;
    if (checkbox.checked) bulkSelected.add(key);
    else bulkSelected.delete(key);
    updateBulkBar();
  });
}

function setupDetailPanel() {
  document.getElementById("detailClose").addEventListener("click", closeDetail);
  document.getElementById("detailOpen").addEventListener("click", () => {
    if (selectedItem) window.open(`vscode://file${selectedItem.path}`, "_blank");
  });
  document.getElementById("detailMove").addEventListener("click", () => {
    if (selectedItem && (canMoveItem(selectedItem) || selectedItem.locked)) openMoveModal(selectedItem);
  });
  document.getElementById("detailDelete").addEventListener("click", () => {
    if (selectedItem && canDeleteItem(selectedItem)) openDeleteModal(selectedItem);
  });
}

function setupBulkBar() {
  document.getElementById("bulkClear").addEventListener("click", () => {
    bulkSelected.clear();
    document.querySelectorAll(".item-chk").forEach((checkbox) => {
      checkbox.checked = false;
    });
    updateBulkBar();
  });

  document.getElementById("bulkDelete").addEventListener("click", async () => {
    const items = getSelectedItems();
    if (items.length === 0) return;

    if (!confirm(`Delete ${items.length} item(s)? This cannot be undone.`)) return;

    let ok = 0;
    let fail = 0;

    for (const item of items) {
      const result = await doDelete(item, true);
      if (result.ok) ok++;
      else fail++;
    }

    bulkSelected.clear();
    await refreshUI();
    toast(`Deleted ${ok} item(s)${fail ? `, ${fail} failed` : ""}`);
  });

  document.getElementById("bulkMove").addEventListener("click", async () => {
    const items = getSelectedItems();
    if (items.length === 0) return;

    const categories = new Set(items.map((item) => item.category));
    if (categories.size > 1) {
      toast("Cannot bulk-move items of different types", true);
      return;
    }

    const nonMovable = items.filter((item) => !canMoveItem(item));
    if (nonMovable.length > 0) {
      toast(`${nonMovable[0].category} items cannot be moved`, true);
      return;
    }

    openBulkMoveModal(items);
  });
}

function setupThemeToggle() {
  const button = document.getElementById("themeToggle");
  updateThemeButton();
  button.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    updateThemeButton();
  });
}

function updateThemeButton() {
  const button = document.getElementById("themeToggle");
  button.textContent = document.body.classList.contains("dark") ? "☀ Light" : "◐ Dark";
}

function setupResizers() {
  setupResizer("resizerLeft", "sidebar", "left");
  setupResizer("resizerRight", "detailPanel", "right");
}

function setupResizer(resizerId, panelId, direction) {
  const resizer = document.getElementById(resizerId);
  const panel = document.getElementById(panelId);
  if (!resizer || !panel) return;

  let startX = 0;
  let startWidth = 0;

  resizer.addEventListener("mousedown", (event) => {
    startX = event.clientX;
    startWidth = panel.getBoundingClientRect().width;
    resizer.classList.add("active");
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    function onMove(moveEvent) {
      const delta = direction === "left" ? moveEvent.clientX - startX : startX - moveEvent.clientX;
      const nextWidth = Math.max(180, Math.min(600, startWidth + delta));
      panel.style.width = `${nextWidth}px`;
      panel.style.flexShrink = "0";
    }

    function onUp() {
      resizer.classList.remove("active");
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    }

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  });
}

function renderAll() {
  normalizeState();
  renderSidebar();
  renderContentHeader();
  renderPills();
  renderMainContent();
  updateBulkBar();

  const needsPreview = selectedItem && itemKey(selectedItem) !== detailPreviewKey;
  renderDetailPanel(needsPreview);

  if (needsPreview) {
    loadPreview(selectedItem);
  }

  initSortable();

  const loading = document.getElementById("loading");
  loading.classList.toggle("hidden", Boolean(data));
  document.getElementById("app").classList.toggle("select-mode", selectMode);
}

function renderSidebar() {
  const tree = document.getElementById("sidebarTree");
  const rootScopes = getRootScopes().filter((scope) => scopeVisibleInSidebar(scope));

  if (rootScopes.length === 0) {
    tree.innerHTML = `<div class="empty-state">No scopes match the current search.</div>`;
    return;
  }

  tree.innerHTML = rootScopes.map((scope) => renderSidebarScope(scope)).join("");
}

function renderSidebarScope(scope) {
  const childHtml = getChildScopes(scope.id)
    .filter((child) => scopeVisibleInSidebar(child))
    .map((child) => renderSidebarScope(child))
    .join("");

  const categoryRows = getSidebarCategoryCounts(scope.id)
    .map(({ category, count }) => {
      const config = CATEGORIES[category] || { icon: "📄", label: capitalize(category) };
      return `
        <div class="s-cat" data-scope-id="${esc(scope.id)}" data-cat="${esc(category)}">
          <span class="s-cat-ico">${config.icon}</span>
          <span class="s-cat-nm">${esc(config.label)}</span>
          <span class="s-cat-cnt">${count}</span>
        </div>`;
    })
    .join("");

  const hasNestedContent = Boolean(categoryRows || childHtml);
  const isExpanded = hasNestedContent && (searchQuery ? true : uiState.expandedScopes.has(scope.id));
  const icon = SCOPE_ICONS[scope.type] || "📂";

  return `
    <div class="s-scope scope-block" data-scope-id="${esc(scope.id)}">
      <div class="s-scope-hdr${scope.id === selectedScopeId ? " active" : ""}" data-scope-id="${esc(scope.id)}">
        <span class="s-tog${hasNestedContent ? (isExpanded ? "" : " collapsed") : " empty"}">▾</span>
        <span class="s-ico">${icon}</span>
        <span class="s-nm">${esc(scope.name)}</span>
        <span class="s-cnt">${getRecursiveScopeCount(scope.id)}</span>
      </div>
      ${hasNestedContent ? `
        <div class="s-scope-body${isExpanded ? "" : " collapsed"}">
          ${categoryRows ? `<div>${categoryRows}</div>` : ""}
          ${childHtml ? `<div class="s-children">${childHtml}</div>` : ""}
        </div>` : ""}
    </div>`;
}

function renderContentHeader() {
  const scope = getScopeById(selectedScopeId);
  const title = document.getElementById("contentTitle");
  const tag = document.getElementById("contentScopeTag");
  const inherit = document.getElementById("contentInherit");

  if (!scope) {
    title.textContent = "Organizer";
    tag.textContent = "global";
    inherit.innerHTML = "";
    inherit.style.display = "none";
    return;
  }

  title.textContent = scope.name;
  tag.textContent = scope.type;

  const chain = getScopeChain(scope);
  if (chain.length === 0) {
    inherit.innerHTML = "";
    inherit.style.display = "none";
    return;
  }

  inherit.style.display = "";
  inherit.innerHTML = `
    <span class="c-inherit-label">inherits from</span>
    ${chain.map((entry, index) => {
      const icon = SCOPE_ICONS[entry.type] || "📂";
      const sep = index === chain.length - 1 ? "" : `<span class="c-inherit-sep">›</span>`;
      return `<span class="c-inherit-pill">${icon} ${esc(entry.name)}</span>${sep}`;
    }).join("")}`;
}

function renderPills() {
  const container = document.getElementById("pills");
  // Count items for the currently selected scope (not global counts)
  const scopeItems = selectedScopeId
    ? (data?.items || []).filter((i) => i.scopeId === selectedScopeId)
    : data?.items || [];
  const scopeCounts = {};
  let scopeTotal = 0;
  for (const item of scopeItems) {
    scopeCounts[item.category] = (scopeCounts[item.category] || 0) + 1;
    scopeTotal++;
  }
  const pills = [
    { key: "all", label: "All", icon: "◌", count: scopeTotal },
    ...CATEGORY_ORDER.map((category) => {
      const config = CATEGORIES[category] || { icon: "📄", filterLabel: capitalize(category) };
      return {
        key: category,
        label: config.filterLabel,
        icon: config.icon,
        count: scopeCounts[category] || 0,
      };
    }),
  ];

  const allActive = activeFilters.size === 0;
  const visiblePills = pills.filter((p) => p.key === "all" || p.count > 0 || activeFilters.has(p.key));
  const hiddenPills = pills.filter((p) => p.key !== "all" && p.count === 0 && !activeFilters.has(p.key));
  const showHidden = container.dataset.expanded === "true";

  container.innerHTML = `
    ${visiblePills.map((pill) => {
      const isActive = pill.key === "all" ? allActive : activeFilters.has(pill.key);
      return `
        <button type="button" class="f-pill${isActive ? " active" : ""}" data-filter="${pill.key}">
          <span class="f-pill-ico">${pill.icon}</span>
          ${esc(pill.label)}
          <b>${pill.count}</b>
        </button>`;
    }).join("")}${hiddenPills.length > 0 ? `
        <button type="button" class="f-pill f-pill-more" id="pillsMore">${showHidden ? "Less ▴" : `+${hiddenPills.length} more ▾`}</button>` : ""}${showHidden ? hiddenPills.map((pill) => `
        <button type="button" class="f-pill f-pill-dim" data-filter="${pill.key}">
          <span class="f-pill-ico">${pill.icon}</span>
          ${esc(pill.label)}
          <b>0</b>
        </button>`).join("") : ""}
    <button type="button" class="select-btn${selectMode ? " active" : ""}" id="selectBtn">☐ Select</button>`;

  // Toggle handler for "more" button
  const moreBtn = document.getElementById("pillsMore");
  if (moreBtn) {
    moreBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      container.dataset.expanded = showHidden ? "false" : "true";
      renderPills();
    });
  }
}

function renderMainContent() {
  const itemList = document.getElementById("itemList");
  const scope = getScopeById(selectedScopeId);

  if (!scope) {
    itemList.innerHTML = `<div class="empty-state empty-centered">Select a scope to inspect its contents.</div>`;
    return;
  }

  const items = getVisibleItemsForScope(scope.id);
  const categories = CATEGORY_ORDER
    .map((category) => ({
      category,
      items: sortCategoryItems(category, items.filter((item) => item.category === category)),
    }))
    .filter((entry) => entry.items.length > 0);

  if (categories.length === 0) {
    const message = searchQuery
      ? "No items match the current search in this scope."
      : activeFilters.size > 0
        ? "No items match the current filters in this scope."
        : "No items found in this scope.";
    itemList.innerHTML = `<div class="empty-state empty-centered">${message}</div>`;
    return;
  }

  itemList.innerHTML = categories.map(({ category, items: catItems }) => {
    const config = CATEGORIES[category] || { icon: "📄", label: capitalize(category), group: null };
    const catKey = `${scope.id}::${category}`;
    const collapsed = searchQuery ? false : uiState.collapsedCats.has(catKey);

    return `
      <div class="cat-section" data-cat-section="${esc(category)}">
        <div class="cat-hdr" data-cat="${esc(category)}">
          <span class="cat-hdr-tog${collapsed ? " collapsed" : ""}">▾</span>
          <span class="cat-hdr-ico">${config.icon}</span>
          <span class="cat-hdr-nm">${esc(config.label)}</span>
          <span class="cat-hdr-cnt">${pluralize(catItems.length, "item")}</span>
          <span class="cat-hdr-sort">
            <button type="button" class="sort-btn${(uiState.sortBy[`${scope.id}::${category}`]?.field === "size") ? " active" : ""}" data-cat="${esc(category)}" data-sort="size">Size ${sortArrow(`${scope.id}::${category}`, "size")}</button>
            <button type="button" class="sort-btn${(uiState.sortBy[`${scope.id}::${category}`]?.field === "date") ? " active" : ""}" data-cat="${esc(category)}" data-sort="date">Date ${sortArrow(`${scope.id}::${category}`, "date")}</button>
          </span>
        </div>
        <div class="cat-body${collapsed ? " collapsed" : ""}">
          ${category === "skill"
            ? renderSkillCategory(scope.id, config.group, catItems)
            : `
              <div class="sortable-zone" data-scope="${esc(scope.id)}" data-group="${config.group || "none"}">
                ${catItems.map((item) => renderItem(item)).join("")}
              </div>`}
        </div>
      </div>`;
  }).join("");

  updateSelectedItemHighlight();
}

function renderSkillCategory(scopeId, group, items) {
  const bundles = new Map();
  const unbundled = [];

  for (const item of items) {
    if (item.bundle) {
      if (!bundles.has(item.bundle)) bundles.set(item.bundle, []);
      bundles.get(item.bundle).push(item);
    } else {
      unbundled.push(item);
    }
  }

  let html = "";

  for (const [bundle, bundleItems] of bundles.entries()) {
    const bundleKey = `${scopeId}::${bundle}`;
    const collapsed = searchQuery ? false : !uiState.collapsedBundles.has(bundleKey);
    const bundleName = bundle.split("/").pop() || bundle;
    html += `
      <div class="bundle-group">
        <div class="bundle-row" data-bundle="${esc(bundle)}">
          <span class="bundle-row-ico">📦</span>
          <span class="bundle-row-nm">${esc(bundleName)}</span>
          <span class="bundle-row-src">${esc(bundle)}</span>
          <span class="bundle-row-cnt">${pluralize(bundleItems.length, "skill")}</span>
        </div>
        <div class="bundle-children${collapsed ? " collapsed" : ""}">
          <div class="sortable-zone" data-scope="${esc(scopeId)}" data-group="${group || "none"}">
            ${bundleItems.map((item) => renderItem(item)).join("")}
          </div>
        </div>
      </div>`;
  }

  if (unbundled.length > 0) {
    html += `
      <div class="sortable-zone" data-scope="${esc(scopeId)}" data-group="${group || "none"}">
        ${unbundled.map((item) => renderItem(item)).join("")}
      </div>`;
  }

  return html;
}

function renderItem(item) {
  const icon = ITEM_ICONS[item.category] || "📄";
  const key = itemKey(item);
  const isSelected = selectedItem && itemKey(selectedItem) === key;
  const checked = bulkSelected.has(key) ? " checked" : "";
  const badgeHtml = shouldShowItemBadge(item) ? renderBadge(item) : "";
  const checkbox = item.locked ? "" : `<input type="checkbox" class="item-chk" data-item-key="${esc(key)}"${checked}>`;
  const dateLabel = formatShortDate(item.mtime || item.ctime);
  const sizeLabel = item.size || "—";
  const desc = item.description || item.fileName || item.path || "No description";

  const actions = item.locked ? "" : `
    <span class="item-actions">
      ${(canMoveItem(item) || item.locked) ? `<button type="button" class="act-btn act-move" data-action="move">Move</button>` : ""}
      <button type="button" class="act-btn act-open" data-action="open">Open</button>
      ${canDeleteItem(item) ? `<button type="button" class="act-btn act-del" data-action="delete">Del</button>` : ""}
    </span>`;

  return `
    <div class="item${item.locked ? " locked" : ""}${isSelected ? " selected" : ""}" data-item-key="${esc(key)}" data-path="${esc(item.path)}" data-category="${esc(item.category)}">
      ${checkbox}
      <span class="item-ico">${icon}</span>
      <span class="item-name">${esc(item.name)}</span>
      ${badgeHtml}
      <span class="item-desc">${esc(desc)}</span>
      <div class="item-right">
        <span class="item-size">${esc(sizeLabel)}</span>
        <span class="item-date">${esc(dateLabel)}</span>
      </div>
      ${actions}
    </div>`;
}

function renderDetailPanel(resetPreview = false) {
  const title = document.getElementById("detailTitle");
  const crumb = document.getElementById("detailCrumb");
  const scopeEl = document.getElementById("detailScope");
  const type = document.getElementById("detailType");
  const desc = document.getElementById("detailDesc");
  const size = document.getElementById("detailSize");
  const dates = document.getElementById("detailDates");
  const path = document.getElementById("detailPath");
  const preview = document.getElementById("previewContent");
  const openBtn = document.getElementById("detailOpen");
  const moveBtn = document.getElementById("detailMove");
  const deleteBtn = document.getElementById("detailDelete");

  if (!selectedItem) {
    title.textContent = "Select an item";
    crumb.innerHTML = `<span class="crumb-pill">No item selected</span>`;
    scopeEl.textContent = "—";
    type.textContent = "—";
    desc.textContent = "Select an item to inspect its metadata and preview.";
    size.textContent = "—";
    dates.innerHTML = `
      <div class="d-value d-date-line">Created: <b>—</b></div>
      <div class="d-value d-date-line">Modified: <b>—</b></div>`;
    path.textContent = "—";
    preview.textContent = "Select an item to preview";
    openBtn.disabled = true;
    moveBtn.disabled = true;
    deleteBtn.disabled = true;
    detailPreviewKey = null;
    return;
  }

  const scope = getScopeById(selectedItem.scopeId);
  title.textContent = selectedItem.name;
  crumb.innerHTML = renderBreadcrumb(scope);
  scopeEl.textContent = scope ? capitalize(scope.name) : selectedItem.scopeId;
  type.innerHTML = renderBadge(selectedItem, true);
  desc.textContent = selectedItem.description || "—";
  size.textContent = selectedItem.size || "—";
  dates.innerHTML = `
    <div class="d-value d-date-line">Created: <b>${esc(selectedItem.ctime || "—")}</b></div>
    <div class="d-value d-date-line">Modified: <b>${esc(selectedItem.mtime || "—")}</b></div>`;
  path.textContent = selectedItem.path || "—";

  openBtn.disabled = false;
  moveBtn.disabled = false; // always enabled — locked items use CC prompt instead of API
  deleteBtn.disabled = !canDeleteItem(selectedItem);

  // CC Actions — contextual prompt buttons
  renderCcActions(selectedItem);

  if (resetPreview) {
    preview.textContent = "Loading...";
    detailPreviewKey = itemKey(selectedItem);
  }
}

function renderCcActions(item) {
  const container = document.getElementById("detailCcActions");
  const btnRow = document.getElementById("ccBtnRow");
  const buttons = [];

  const explainPrompt = `I have a Claude Code ${item.category} called "${item.name}" at:\n${item.path}\n\nPlease read this file and explain:\n1. What does this ${item.category} do?\n2. When does it get loaded / triggered?\n3. What would break if I removed or changed it?\n4. Are there any other files that depend on it?`;

  // Info line for unlocked items
  if (!item.locked && item.category !== "session") {
    buttons.push({ ico: "🤖", label: "", prompt: null, info: "Use these prompts for guided changes — Claude Code will read the file, explain the impact, and confirm before making changes." });
  }

  switch (item.category) {
    case "session": {
      const sessionId = (item.fileName || "").replace(".jsonl", "");
      if (sessionId) {
        buttons.push({ ico: "💡", label: "", prompt: null, info: "Sessions can be resumed directly in Claude Code. Copy the command below and paste it in a new terminal to continue where you left off." });
        buttons.push({ ico: "💬", label: "Resume Session", prompt: `claude --resume ${sessionId}\n\n# Session file: ${item.path}` });
        buttons.push({ ico: "📋", label: "Summarize", prompt: `I have a Claude Code session at:\n${item.path}\n\nPlease read this session file and give me a summary:\n1. What was this session about?\n2. What was accomplished?\n3. Were there any unfinished tasks or pending actions?\n4. What files were modified?` });
      }
      break;
    }
    case "memory":
      buttons.push({ ico: "📋", label: "Explain This", prompt: explainPrompt });
      buttons.push({ ico: "✏️", label: "Edit Content", prompt: `I want to edit this Claude Code memory: "${item.name}"\nPath: ${item.path}\nType: ${item.subType || "memory"}\n\nBefore editing:\n1. Read the current content\n2. Show me the current frontmatter (name, description, type) and body\n3. Ask me what I want to change\n4. Show the before vs after diff\n5. Only save after I confirm` });
      break;
    case "skill":
      buttons.push({ ico: "📋", label: "Explain This", prompt: explainPrompt });
      buttons.push({ ico: "✏️", label: "Edit Skill", prompt: `I want to edit this Claude Code skill: "${item.name}"\nPath: ${item.path}\n\nBefore editing:\n1. Read the SKILL.md content\n2. Explain what this skill does and when it triggers\n3. Ask me what I want to change\n4. Show the before vs after diff\n5. Warn if the change could affect how Claude Code invokes it\n6. Only save after I confirm` });
      break;
    case "mcp":
      buttons.push({ ico: "📋", label: "Explain This", prompt: `I have a Claude Code MCP server called "${item.name}" at:\n${item.path}\n\nPlease explain:\n1. What does this MCP server do?\n2. What tools does it provide?\n3. How is it configured (command, args, env)?\n4. Is it currently working? Check if the command exists on this system.` });
      buttons.push({ ico: "🔧", label: "Edit Config", prompt: `I want to modify this MCP server configuration: "${item.name}"\nPath: ${item.path}\n\nBefore changing:\n1. Read the current MCP config\n2. Show me the current command, args, and env settings\n3. Ask me what I want to change\n4. Show the before vs after diff\n5. Warn if this could break any tools that depend on this MCP server\n6. Only save after I confirm` });
      break;
    case "plan":
      buttons.push({ ico: "📋", label: "Explain This", prompt: explainPrompt });
      buttons.push({ ico: "▶️", label: "Continue Plan", prompt: `I have an existing Claude Code plan at:\n${item.path}\n\nPlease read this plan and:\n1. Summarize what the plan is about\n2. Show which steps are done and which are remaining\n3. Ask me if I want to continue from where it left off` });
      break;
    case "command":
      buttons.push({ ico: "📋", label: "Explain This", prompt: explainPrompt });
      buttons.push({ ico: "✏️", label: "Edit Command", prompt: `I want to edit this Claude Code command: "${item.name}"\nPath: ${item.path}\n\nBefore editing:\n1. Read the current content\n2. Explain what this command does and its argument format\n3. Ask me what I want to change\n4. Show the before vs after diff\n5. Only save after I confirm` });
      break;
    case "agent":
      buttons.push({ ico: "📋", label: "Explain This", prompt: explainPrompt });
      buttons.push({ ico: "✏️", label: "Edit Agent", prompt: `I want to edit this Claude Code agent: "${item.name}"\nPath: ${item.path}\n\nBefore editing:\n1. Read the current content\n2. Explain what this agent does, what tools it has, and what model it uses\n3. Ask me what I want to change\n4. Show the before vs after diff\n5. Only save after I confirm` });
      break;
    case "rule":
      buttons.push({ ico: "💡", label: "", prompt: null, info: "Rules enforce project-specific constraints. Use these prompts to understand or modify them." });
      buttons.push({ ico: "📋", label: "Explain This", prompt: `I have a Claude Code rule: "${item.name}"\nPath: ${item.path}\n\nPlease read this rule and explain:\n1. What constraint does it enforce?\n2. Why was it created?\n3. What would happen if it were removed?\n4. Are there any edge cases it doesn't cover?` });
      buttons.push({ ico: "✏️", label: "Modify", prompt: `I want to modify this Claude Code rule: "${item.name}"\nPath: ${item.path}\n\nBefore making any changes:\n1. Read the current content\n2. Explain the rule\n3. Ask me what I want to change\n4. Show the before vs after diff\n5. Warn if the change could weaken important constraints\n6. Only save after I confirm` });
      break;
    case "config":
      buttons.push({ ico: "💡", label: "", prompt: null, info: "Config files are managed by Claude Code. Use these prompts to ask Claude Code to help you understand or modify them." });
      buttons.push({ ico: "📋", label: "Explain This", prompt: `I have a Claude Code config file: "${item.name}"\nPath: ${item.path}\n\nPlease read it and explain:\n1. What does each setting do?\n2. Which settings are most important?\n3. Are there any settings that look unusual or could cause issues?` });
      buttons.push({ ico: "✏️", label: "Modify", prompt: `I want to modify this Claude Code config: "${item.name}"\nPath: ${item.path}\n\nBefore making any changes:\n1. Read the current content\n2. Explain what each setting does\n3. Ask me what I want to change\n4. Show exactly what will change (before vs after)\n5. Warn if the change could break anything\n6. Only apply after I confirm` });
      buttons.push({ ico: "🗑️", label: "Remove", prompt: `I want to remove this Claude Code config file: "${item.name}"\nPath: ${item.path}\n\n⚠️ This is a config file — removing it can significantly change how Claude Code behaves in this project.\n\nBefore doing ANYTHING:\n1. Read the entire file and explain what it is — is this CLAUDE.md (project instructions), settings.json (project settings), or settings.local.json (local overrides)?\n2. Explain in plain language what EVERY setting/instruction in this file does\n3. Explain exactly what will change after removal:\n   - If CLAUDE.md: all project-specific instructions, coding conventions, and custom rules will be lost. Claude Code will behave generically.\n   - If settings.json: project-level permission overrides, model preferences, and tool settings will revert to defaults.\n   - If settings.local.json: local environment overrides (API keys, personal preferences) will be lost.\n4. List everything that depends on or references this file\n5. Ask me: "Are you sure you want to remove this? Here is what you will lose: [list]. Type YES to confirm."\n6. Only remove after I type YES — do not proceed on any other response` });
      break;
    case "hook":
      buttons.push({ ico: "💡", label: "", prompt: null, info: "Hooks run automatically on Claude Code events. Use these prompts to understand or modify them safely." });
      buttons.push({ ico: "📋", label: "Explain This", prompt: `I have a Claude Code hook: "${item.name}"\nPath: ${item.path}\n\nPlease explain:\n1. What event triggers this hook?\n2. What does the hook script do?\n3. What would happen if I disabled or removed it?\n4. Is the hook script working correctly? Check if the script exists and is executable.` });
      buttons.push({ ico: "✏️", label: "Modify", prompt: `I want to modify this Claude Code hook: "${item.name}"\nPath: ${item.path}\n\nBefore changing:\n1. Read the hook config and the script it runs\n2. Explain when it triggers and what it does\n3. Ask me what I want to change\n4. Show the before vs after diff\n5. Warn about any side effects (e.g. breaking pre-commit checks)\n6. Only apply after I confirm` });
      buttons.push({ ico: "🗑️", label: "Remove", prompt: `I want to remove this Claude Code hook: "${item.name}"\nPath: ${item.path}\n\nBefore removing:\n1. Read the hook and explain what it does\n2. Tell me what behavior will stop after removal\n3. Check if other hooks or configs depend on it\n4. Only remove after I explicitly confirm` });
      break;
    case "plugin":
      buttons.push({ ico: "💡", label: "", prompt: null, info: "Plugins extend Claude Code's capabilities. Use these prompts to understand or manage them." });
      buttons.push({ ico: "📋", label: "Explain This", prompt: `I have a Claude Code plugin: "${item.name}"\nPath: ${item.path}\n\nPlease explain:\n1. What does this plugin do?\n2. What features or commands does it add?\n3. Is it actively loaded by Claude Code?\n4. What would change if I removed it?` });
      buttons.push({ ico: "🗑️", label: "Remove", prompt: `I want to remove this Claude Code plugin: "${item.name}"\nPath: ${item.path}\n\nBefore removing:\n1. Explain what features this plugin provides\n2. Check if any skills, hooks, or configs reference it\n3. Tell me what will stop working after removal\n4. Only remove after I explicitly confirm` });
      break;
    default:
      buttons.push({ ico: "📋", label: "Explain This", prompt: explainPrompt });
      break;
  }

  if (buttons.length === 0) {
    container.classList.add("hidden");
    return;
  }

  container.classList.remove("hidden");
  btnRow.innerHTML = buttons.map((btn) => {
    if (btn.info) {
      return `<div class="cc-info"><span class="cc-ico">${btn.ico}</span>${esc(btn.info)}</div>`;
    }
    return `<button type="button" class="cc-btn" data-prompt="${esc(btn.prompt)}"><span class="cc-ico">${btn.ico}</span>${esc(btn.label)}</button>`;
  }).join("");
}

function setupCcActions() {
  document.getElementById("detailCcActions").addEventListener("click", (event) => {
    const btn = event.target.closest(".cc-btn");
    if (!btn) return;
    const prompt = btn.dataset.prompt;
    navigator.clipboard.writeText(prompt).then(() => {
      const orig = btn.innerHTML;
      const isResume = prompt.startsWith("claude --resume");
      const msg = isResume ? "Copied! Paste in a new terminal" : "Copied! Paste to Claude Code";
      btn.innerHTML = `<span class="cc-ico">✅</span>${msg}`;
      setTimeout(() => { btn.innerHTML = orig; }, 2500);
    });
  });
}

function renderBreadcrumb(scope) {
  if (!scope) return `<span class="crumb-pill">Unknown scope</span>`;
  const scopes = [...getScopeChain(scope), scope];
  return scopes.map((entry, index) => {
    const icon = SCOPE_ICONS[entry.type] || "📂";
    const sep = index === scopes.length - 1 ? "" : `<span class="crumb-sep">›</span>`;
    return `<span class="crumb-pill">${icon} ${esc(entry.name)}</span>${sep}`;
  }).join("");
}

function shouldShowItemBadge(item) {
  if (item.category === "memory") return true;
  if (item.subType && item.subType !== item.category) return true;
  return ["mcp", "config", "hook", "plugin", "plan"].includes(item.category);
}

function renderBadge(item, detail = false) {
  const label = item.subType || item.category;
  const cls = BADGE_CLASS[label] || BADGE_CLASS[item.category] || "ib-session";
  const style = detail ? ' style="font-size:0.68rem"' : "";
  return `<span class="item-badge ${cls}"${style}>${esc(label)}</span>`;
}

function initSortable() {
  if (!window.Sortable) return;

  const scrollEl = document.getElementById("mainContent");

  document.querySelectorAll(".sortable-zone").forEach((el) => {
    const group = el.dataset.group;
    if (!group || group === "none") return;

    Sortable.create(el, {
      group,
      animation: 150,
      ghostClass: "sortable-ghost",
      chosenClass: "sortable-chosen",
      draggable: ".item:not(.locked)",
      filter: ".act-btn, .item-chk",
      preventOnFilter: false,
      fallbackOnBody: true,
      scroll: scrollEl,
      scrollSensitivity: 100,
      scrollSpeed: 15,
      bubbleScroll: true,
      onStart(evt) {
        draggingItem = getItemByKey(evt.item.dataset.itemKey);
      },
      onEnd(evt) {
        draggingItem = null;
        clearScopeHighlights();

        if (evt.from === evt.to) return;

        const itemEl = evt.item;
        const item = getItemByKey(itemEl.dataset.itemKey);
        if (!item) {
          renderMainContent();
          initSortable();
          return;
        }

        const oldParent = evt.from;
        const oldIndex = evt.oldIndex ?? 0;
        const revertFn = () => {
          const children = oldParent.children;
          if (oldIndex >= children.length) oldParent.appendChild(itemEl);
          else oldParent.insertBefore(itemEl, children[oldIndex]);
        };

        const fromScopeId = evt.from.dataset.scope;
        const toScopeId = evt.to.dataset.scope;

        if (!fromScopeId || !toScopeId || fromScopeId === toScopeId) {
          revertFn();
          return;
        }

        pendingDrag = { item, fromScopeId, toScopeId, revertFn };
        showDragConfirm(item, getScopeById(fromScopeId), getScopeById(toScopeId));
      },
    });
  });
}

function setupScopeDropZones() {
  document.addEventListener("dragover", (event) => {
    if (!draggingItem) return;

    const scopeBlock = event.target.closest(".scope-block");
    clearScopeHighlights();

    if (!scopeBlock) return;

    const scopeId = scopeBlock.dataset.scopeId;
    if (!scopeId || scopeId === draggingItem.scopeId) return;

    event.preventDefault();
    scopeBlock.classList.add("drop-target");
  }, true);

  document.addEventListener("drop", (event) => {
    if (!draggingItem) return;

    const scopeBlock = event.target.closest(".scope-block");
    clearScopeHighlights();

    if (!scopeBlock) return;
    if (event.target.closest(".sortable-zone")) return;

    const scopeId = scopeBlock.dataset.scopeId;
    if (!scopeId || scopeId === draggingItem.scopeId) return;

    event.preventDefault();
    event.stopPropagation();

    const item = draggingItem;

    if (item.locked) {
      // Locked item — generate CC prompt
      const destScope = getScopeById(scopeId);
      const fromScope = getScopeById(item.scopeId);
      const prompt = `I want to move this Claude Code ${item.category} to a different scope.\n\nItem: "${item.name}"\nCurrent path: ${item.path}\nFrom scope: ${fromScope?.name || item.scopeId}\nMove to scope: ${destScope?.name || scopeId}\n\nBefore moving:\n1. Read the file and understand what it does\n2. Determine the correct destination path for the "${destScope?.name || scopeId}" scope\n3. Check if a ${item.category} with the same name already exists at the destination\n4. Explain what will change — which projects will gain or lose access to this ${item.category}\n5. Warn me about any potential conflicts or breaking changes\n6. Only move the file after I confirm`;
      navigator.clipboard.writeText(prompt).then(() => {
        toast("Move prompt copied! Paste to Claude Code in your terminal.");
      });
      draggingItem = null;
      return;
    }

    pendingDrag = {
      item,
      fromScopeId: item.scopeId,
      toScopeId: scopeId,
      revertFn: () => {},
    };

    showDragConfirm(item, getScopeById(item.scopeId), getScopeById(scopeId));
    draggingItem = null;
  }, true);

  document.addEventListener("dragend", () => {
    draggingItem = null;
    clearScopeHighlights();
  }, true);
}

function clearScopeHighlights() {
  document.querySelectorAll(".scope-block.drop-target").forEach((el) => {
    el.classList.remove("drop-target");
  });
}

function showDetail(item) {
  const next = getItemByKey(itemKey(item)) || item;
  const shouldLoadPreview = itemKey(next) !== detailPreviewKey;
  selectedItem = next;
  document.getElementById("detailPanel").classList.remove("hidden");
  renderDetailPanel(shouldLoadPreview);
  updateSelectedItemHighlight();
  if (shouldLoadPreview) {
    loadPreview(next);
  }
}

function updateSelectedItemHighlight() {
  const selectedKey = selectedItem ? itemKey(selectedItem) : null;
  document.querySelectorAll(".item.selected").forEach((row) => {
    row.classList.remove("selected");
  });
  if (!selectedKey) return;
  const row = document.querySelector(`.item[data-item-key="${cssEscape(selectedKey)}"]`);
  row?.classList.add("selected");
}

async function loadPreview(item) {
  const preview = document.getElementById("previewContent");
  const currentKey = itemKey(item);

  try {
    if (item.category === "mcp") {
      if (currentKey !== detailPreviewKey) return;
      preview.textContent = JSON.stringify(item.mcpConfig || {}, null, 2);
      return;
    }

    if (item.category === "hook") {
      const res = await fetchJson(`/api/file-content?path=${encodeURIComponent(item.path)}`);
      if (currentKey !== detailPreviewKey) return;
      if (res.ok) {
        const settings = JSON.parse(res.content);
        const hookConfig = settings.hooks?.[item.name];
        preview.textContent = hookConfig ? JSON.stringify(hookConfig, null, 2) : (item.description || "(no content)");
      } else {
        preview.textContent = item.description || "(no content)";
      }
      return;
    }

    if (item.category === "plugin") {
      if (currentKey !== detailPreviewKey) return;
      preview.textContent = `Plugin directory: ${item.path}`;
      return;
    }

    if (item.category === "session") {
      const res = await fetchJson(`/api/session-preview?path=${encodeURIComponent(item.path)}`);
      if (currentKey !== detailPreviewKey) return;
      preview.textContent = res.ok ? res.content : "Cannot load session preview";
      requestAnimationFrame(() => {
        preview.scrollTop = preview.scrollHeight;
      });
      return;
    }

    let filePath = item.path;
    if (item.category === "skill") filePath = `${item.path}/SKILL.md`;

    const res = await fetchJson(`/api/file-content?path=${encodeURIComponent(filePath)}`);
    if (currentKey !== detailPreviewKey) return;
    preview.textContent = res.ok ? res.content : (res.error || "Cannot load preview");
  } catch {
    if (currentKey !== detailPreviewKey) return;
    preview.textContent = "Failed to load preview";
  }
}

function closeDetail() {
  selectedItem = null;
  detailPreviewKey = null;
  document.getElementById("detailPanel").classList.add("hidden");
  renderDetailPanel();
  updateSelectedItemHighlight();
}

function showDragConfirm(item, fromScope, toScope) {
  const fromIcon = SCOPE_ICONS[fromScope?.type] || "📂";
  const toIcon = SCOPE_ICONS[toScope?.type] || "📂";

  document.getElementById("dcPreview").innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
      <span style="font-size:1.1rem;">${ITEM_ICONS[item.category] || "📄"}</span>
      <div>
        <div style="font-weight:900;color:var(--text-primary);font-size:0.9rem;">${esc(item.name)}</div>
        <div style="display:flex;gap:6px;align-items:center;margin-top:4px;">
          ${renderBadge(item)}
          <span style="font-size:0.72rem;color:var(--text-muted);">${esc(item.category)}</span>
        </div>
      </div>
    </div>
    <div style="display:flex;align-items:center;gap:10px;padding-top:10px;border-top:1px solid var(--border-light);">
      <div style="flex:1;text-align:center;">
        <div style="font-size:0.6rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">From</div>
        <div style="font-size:0.82rem;font-weight:700;color:var(--danger);">${fromIcon} ${esc(fromScope?.name || "?")}</div>
        <div style="font-size:0.62rem;color:var(--text-faint);">${esc(fromScope?.type || "")}</div>
      </div>
      <div style="font-size:1.2rem;color:var(--text-faint);">→</div>
      <div style="flex:1;text-align:center;">
        <div style="font-size:0.6rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">To</div>
        <div style="font-size:0.82rem;font-weight:700;color:var(--accent);">${toIcon} ${esc(toScope?.name || "?")}</div>
        <div style="font-size:0.62rem;color:var(--text-faint);">${esc(toScope?.type || "")}</div>
      </div>
    </div>`;

  document.getElementById("dragConfirmModal").classList.remove("hidden");
}

function openDeleteModal(item) {
  pendingDelete = item;
  const scope = getScopeById(item.scopeId);

  document.getElementById("deletePreview").innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
      <span style="font-size:1.1rem;">${ITEM_ICONS[item.category] || "📄"}</span>
      <div>
        <div style="font-weight:900;color:var(--text-primary);font-size:0.9rem;">${esc(item.name)}</div>
        <div style="font-size:0.68rem;color:var(--text-muted);margin-top:2px;">${esc(scope?.name || item.scopeId)} · ${esc(item.category)}</div>
      </div>
    </div>
    <div style="font-size:0.68rem;color:var(--danger);margin-top:8px;padding-top:8px;border-top:1px solid var(--border-light);">
      ${item.category === "skill" ? "This will delete the entire skill folder and all its files." : "This will permanently delete the item from disk."}
    </div>`;

  document.getElementById("deleteModal").classList.remove("hidden");
}

function setupModals() {
  document.getElementById("dcCancel").addEventListener("click", () => {
    document.getElementById("dragConfirmModal").classList.add("hidden");
    if (pendingDrag?.revertFn) pendingDrag.revertFn();
    pendingDrag = null;
  });

  document.getElementById("dcConfirm").addEventListener("click", async () => {
    document.getElementById("dragConfirmModal").classList.add("hidden");
    if (!pendingDrag) return;
    const result = await doMove(pendingDrag.item, pendingDrag.toScopeId);
    if (!result.ok && pendingDrag.revertFn) pendingDrag.revertFn();
    pendingDrag = null;
  });

  document.getElementById("moveCancel").addEventListener("click", closeMoveModal);
  document.getElementById("moveModal").addEventListener("click", (event) => {
    if (event.target === document.getElementById("moveModal")) closeMoveModal();
  });

  document.getElementById("dragConfirmModal").addEventListener("click", (event) => {
    if (event.target !== document.getElementById("dragConfirmModal")) return;
    document.getElementById("dragConfirmModal").classList.add("hidden");
    if (pendingDrag?.revertFn) pendingDrag.revertFn();
    pendingDrag = null;
  });

  document.getElementById("deleteCancel").addEventListener("click", () => {
    document.getElementById("deleteModal").classList.add("hidden");
    pendingDelete = null;
  });

  document.getElementById("deleteConfirm").addEventListener("click", async () => {
    document.getElementById("deleteModal").classList.add("hidden");
    if (pendingDelete) {
      await doDelete(pendingDelete);
      pendingDelete = null;
    }
  });

  document.getElementById("deleteModal").addEventListener("click", (event) => {
    if (event.target !== document.getElementById("deleteModal")) return;
    document.getElementById("deleteModal").classList.add("hidden");
    pendingDelete = null;
  });
}

async function openMoveModal(item) {
  const res = await fetchJson(`/api/destinations?path=${encodeURIComponent(item.path)}&category=${encodeURIComponent(item.category)}&name=${encodeURIComponent(item.name)}`);
  if (!res.ok) {
    toast(res.error, true);
    return;
  }

  const listEl = document.getElementById("moveDestList");
  const ordered = buildOrderedScopeEntries(res.destinations, res.currentScopeId);
  let selectedDest = null;

  listEl.innerHTML = ordered.map(renderDestinationRow).join("");

  listEl.querySelectorAll(".dest").forEach((entry) => {
    if (entry.classList.contains("cur")) return;
    entry.addEventListener("click", () => {
      listEl.querySelectorAll(".dest").forEach((node) => node.classList.remove("sel"));
      entry.classList.add("sel");
      selectedDest = entry.dataset.scopeId;
      document.getElementById("moveConfirm").disabled = false;
    });
  });

  document.getElementById("moveConfirm").disabled = true;
  document.getElementById("moveConfirm").onclick = async () => {
    if (!selectedDest) return;
    closeMoveModal();
    if (item.locked) {
      // Locked item — generate CC prompt instead of API call
      const destScope = getScopeById(selectedDest);
      const destName = destScope?.name || selectedDest;
      const prompt = `I want to move this Claude Code ${item.category} to a different scope.\n\nItem: "${item.name}"\nCurrent path: ${item.path}\nMove to scope: ${destName}\n\nBefore moving:\n1. Read the file and understand what it does\n2. Determine the correct destination path for the "${destName}" scope\n3. Check if a ${item.category} with the same name already exists at the destination\n4. Explain what will change — which projects will gain or lose access to this ${item.category}\n5. Warn me about any potential conflicts or breaking changes\n6. Only move the file after I confirm`;
      navigator.clipboard.writeText(prompt).then(() => {
        toast("Move prompt copied! Paste to Claude Code in your terminal.");
      });
    } else {
      await doMove(item, selectedDest);
    }
  };

  document.getElementById("moveModal").classList.remove("hidden");
}

async function openBulkMoveModal(items) {
  const first = items[0];
  const res = await fetchJson(`/api/destinations?path=${encodeURIComponent(first.path)}&category=${encodeURIComponent(first.category)}&name=${encodeURIComponent(first.name)}`);
  if (!res.ok) {
    toast(res.error, true);
    return;
  }

  const listEl = document.getElementById("moveDestList");
  const ordered = buildOrderedScopeEntries(res.destinations, res.currentScopeId);
  let selectedDest = null;

  listEl.innerHTML = ordered.map(renderDestinationRow).join("");

  listEl.querySelectorAll(".dest").forEach((entry) => {
    if (entry.classList.contains("cur")) return;
    entry.addEventListener("click", () => {
      listEl.querySelectorAll(".dest").forEach((node) => node.classList.remove("sel"));
      entry.classList.add("sel");
      selectedDest = entry.dataset.scopeId;
      document.getElementById("moveConfirm").disabled = false;
    });
  });

  document.getElementById("moveConfirm").disabled = true;
  document.getElementById("moveConfirm").onclick = async () => {
    if (!selectedDest) return;
    closeMoveModal();

    let ok = 0;
    let fail = 0;
    for (const item of items) {
      const result = await doMove(item, selectedDest, true);
      if (result.ok) ok++;
      else fail++;
    }

    bulkSelected.clear();
    await refreshUI();
    toast(`Moved ${ok} item(s)${fail ? `, ${fail} failed` : ""}`);
  };

  document.getElementById("moveModal").classList.remove("hidden");
}

function buildOrderedScopeEntries(destinations, currentScopeId) {
  const currentScope = getScopeById(currentScopeId);
  const allScopes = currentScope
    ? [...destinations, { ...currentScope, isCurrent: true }]
    : [...destinations];

  const scopeMap = {};
  for (const scope of data.scopes) scopeMap[scope.id] = scope;
  for (const scope of allScopes) scopeMap[scope.id] = scope;

  const getDepth = (scope) => {
    let depth = 0;
    let current = scope;
    while (current.parentId) {
      depth++;
      current = scopeMap[current.parentId] || { parentId: null };
    }
    return depth;
  };

  allScopes.sort((a, b) => {
    const da = getDepth(a);
    const db = getDepth(b);
    if (da !== db) return da - db;
    return a.name.localeCompare(b.name);
  });

  const ordered = [];
  function addWithChildren(parentId) {
    for (const scope of allScopes) {
      if ((scope.parentId || null) === parentId) {
        ordered.push({ ...scope, depth: getDepth(scope) });
        addWithChildren(scope.id);
      }
    }
  }

  addWithChildren(null);
  return ordered;
}

function renderDestinationRow(scope) {
  const indent = scope.depth > 0 ? ` style="padding-left:${scope.depth * 28}px"` : "";
  const icon = scope.id === "global" ? "🌐" : (SCOPE_ICONS[scope.type] || "📂");
  const currentLabel = scope.isCurrent
    ? ' <span style="font-size:0.6rem;color:var(--text-faint);margin-left:4px;">(current)</span>'
    : "";

  return `
    <div class="dest${scope.isCurrent ? " cur" : ""}" data-scope-id="${esc(scope.id)}"${indent}>
      <span class="di">${icon}</span>
      <span class="dn">${esc(scope.name)}${currentLabel}</span>
      <span class="dp">${esc(scope.type)}</span>
    </div>`;
}

function closeMoveModal() {
  document.getElementById("moveModal").classList.add("hidden");
}

async function refreshUI() {
  const selectedScopeBefore = selectedScopeId;
  const selectedItemBefore = selectedItem ? itemKey(selectedItem) : null;

  data = await fetchJson("/api/scan");

  selectedScopeId = data.scopes.some((scope) => scope.id === selectedScopeBefore)
    ? selectedScopeBefore
    : getInitialSelectedScopeId();

  if (selectedItemBefore) {
    const nextItem = getItemByKey(selectedItemBefore);
    if (nextItem) {
      selectedItem = nextItem;
      selectedScopeId = nextItem.scopeId;
    } else {
      selectedItem = null;
      detailPreviewKey = null;
    }
  }

  bulkSelected = new Set([...bulkSelected].filter((key) => Boolean(getItemByKey(key))));
  initializeScopeState();
  renderAll();
}

async function doMove(itemRef, toScopeId, skipRefresh = false) {
  const item = resolveItem(itemRef);
  if (!item) return { ok: false, error: "Item not found" };

  const fromScopeId = item.scopeId;
  const response = await fetch("/api/move", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      itemPath: item.path,
      toScopeId,
      category: item.category,
      name: item.name,
    }),
  });
  const result = await response.json();

  if (skipRefresh) return result;

  if (result.ok) {
    const movedKey = `${item.category}::${item.name}::${result.to}`;
    if (selectedItem && itemKey(selectedItem) === itemKey(item)) {
      selectedItem = { ...item, path: result.to, scopeId: toScopeId };
      selectedScopeId = toScopeId;
      detailPreviewKey = null;
    }

    const undoFn = async () => {
      const undoResult = await fetch("/api/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemPath: result.to,
          toScopeId: fromScopeId,
          category: item.category,
          name: item.name,
        }),
      }).then((res) => res.json());

      if (undoResult.ok) {
        if (selectedItem && itemKey(selectedItem) === movedKey) {
          selectedItem = { ...item };
          selectedScopeId = fromScopeId;
          detailPreviewKey = null;
        }
        toast("Move undone");
        await refreshUI();
      } else {
        toast(undoResult.error, true);
      }
    };

    toast(result.message, false, undoFn);
    await refreshUI();
  } else {
    toast(result.error, true);
  }

  return result;
}

async function doDelete(itemRef, skipRefresh = false) {
  const item = resolveItem(itemRef);
  if (!item) return { ok: false, error: "Item not found" };

  let backupContent = null;
  let mcpBackup = null;

  try {
    if (item.category === "mcp") {
      mcpBackup = { name: item.name, config: item.mcpConfig, mcpJsonPath: item.path };
    } else {
      let readPath = item.path;
      if (item.category === "skill") readPath = `${item.path}/SKILL.md`;
      const backup = await fetchJson(`/api/file-content?path=${encodeURIComponent(readPath)}`);
      if (backup.ok) backupContent = backup.content;
    }
  } catch {
    // best effort backup only
  }

  const response = await fetch("/api/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      itemPath: item.path,
      category: item.category,
      name: item.name,
    }),
  });
  const result = await response.json();

  if (skipRefresh) return result;

  if (result.ok) {
    if (selectedItem && itemKey(selectedItem) === itemKey(item)) {
      selectedItem = null;
      detailPreviewKey = null;
    }

    let undoFn = null;
    if (mcpBackup) {
      undoFn = async () => {
        const restoreResult = await fetch("/api/restore-mcp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(mcpBackup),
        }).then((res) => res.json());

        if (restoreResult.ok) {
          toast("Delete undone");
          await refreshUI();
        } else {
          toast(restoreResult.error, true);
        }
      };
    } else if (backupContent) {
      undoFn = async () => {
        const restoreResult = await fetch("/api/restore", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filePath: item.path,
            content: backupContent,
            isDir: item.category === "skill",
          }),
        }).then((res) => res.json());

        if (restoreResult.ok) {
          toast("Delete undone");
          await refreshUI();
        } else {
          toast(restoreResult.error, true);
        }
      };
    }

    toast(result.message, false, undoFn);
    await refreshUI();
  } else {
    toast(result.error, true);
  }

  return result;
}

function updateBulkBar() {
  const bar = document.getElementById("bulkBar");
  const count = bulkSelected.size;
  bar.classList.toggle("hidden", count === 0);
  document.getElementById("bulkCount").textContent = `${count} selected`;
}

function toast(msg, isError = false, undoFn = null) {
  const el = document.getElementById("toast");
  const msgEl = document.getElementById("toastMsg");
  if (toastTimer) clearTimeout(toastTimer);

  if (undoFn) {
    msgEl.innerHTML = `${esc(msg)} <button class="toast-undo" id="toastUndo">Undo</button>`;
    el.className = "toast";
    document.getElementById("toastUndo").onclick = async () => {
      el.classList.add("hidden");
      await undoFn();
    };
    toastTimer = setTimeout(() => el.classList.add("hidden"), 8000);
  } else {
    msgEl.textContent = msg;
    el.className = isError ? "toast error" : "toast";
    toastTimer = setTimeout(() => el.classList.add("hidden"), 4000);
  }
}

function normalizeState() {
  if (!data) return;

  if (!data.scopes.some((scope) => scope.id === selectedScopeId)) {
    selectedScopeId = getInitialSelectedScopeId();
  }

  const visibleScopeId = getFirstVisibleScopeId();
  if (visibleScopeId && !scopeVisibleInSidebar(getScopeById(selectedScopeId))) {
    selectedScopeId = visibleScopeId;
  }

  expandScopePath(selectedScopeId);

  if (selectedItem) {
    const nextItem = getItemByKey(itemKey(selectedItem));
    if (!nextItem || nextItem.scopeId !== selectedScopeId || !itemVisibleInMain(nextItem)) {
      selectedItem = null;
      detailPreviewKey = null;
    } else {
      selectedItem = nextItem;
    }
  }

  bulkSelected = new Set([...bulkSelected].filter((key) => Boolean(getItemByKey(key))));
}

function initializeScopeState() {
  const scopeIds = new Set(data.scopes.map((scope) => scope.id));
  uiState.expandedScopes = new Set([...uiState.expandedScopes].filter((id) => scopeIds.has(id)));

  getRootScopes().forEach((scope) => uiState.expandedScopes.add(scope.id));
  expandScopePath(selectedScopeId);
}

function expandScopePath(scopeId) {
  let current = getScopeById(scopeId);
  while (current) {
    uiState.expandedScopes.add(current.id);
    current = current.parentId ? getScopeById(current.parentId) : null;
  }
}

function getInitialSelectedScopeId() {
  const scopesWithItems = data.scopes
    .filter((scope) => getItemsForScope(scope.id).length > 0)
    .sort((a, b) => {
      const depthDiff = getScopeDepth(b) - getScopeDepth(a);
      if (depthDiff !== 0) return depthDiff;
      return a.name.localeCompare(b.name);
    });

  if (scopesWithItems[0]) return scopesWithItems[0].id;
  return data.scopes[0]?.id || "global";
}

function getRootScopes() {
  return data.scopes.filter((scope) => scope.parentId === null);
}

function getScopeById(scopeId) {
  return data?.scopes.find((scope) => scope.id === scopeId) || null;
}

function getItemsForScope(scopeId) {
  return data.items.filter((item) => item.scopeId === scopeId);
}

function getChildScopes(scopeId) {
  return data.scopes.filter((scope) => scope.parentId === scopeId);
}

function getScopeDepth(scope) {
  let depth = 0;
  let current = scope;
  while (current?.parentId) {
    depth++;
    current = getScopeById(current.parentId);
  }
  return depth;
}

function getScopeChain(scope) {
  const chain = [];
  let current = scope;
  while (current?.parentId) {
    const parent = getScopeById(current.parentId);
    if (!parent) break;
    chain.unshift(parent);
    current = parent;
  }
  return chain;
}

function getRecursiveScopeCount(scopeId) {
  let count = getItemsForScope(scopeId).length;
  for (const child of getChildScopes(scopeId)) {
    count += getRecursiveScopeCount(child.id);
  }
  return count;
}

function getSidebarCategoryCounts(scopeId) {
  const counts = new Map();
  for (const category of CATEGORY_ORDER) counts.set(category, 0);

  for (const item of getItemsForScope(scopeId)) {
    if (searchQuery && !itemMatchesSearch(item)) continue;
    counts.set(item.category, (counts.get(item.category) || 0) + 1);
  }

  return CATEGORY_ORDER
    .map((category) => ({ category, count: counts.get(category) || 0 }))
    .filter((entry) => entry.count > 0);
}

function scopeVisibleInSidebar(scope) {
  if (!scope) return false;
  if (!searchQuery) return true;
  if (scope.name.toLowerCase().includes(searchQuery)) return true;
  if (getItemsForScope(scope.id).some((item) => itemMatchesSearch(item))) return true;
  return getChildScopes(scope.id).some((child) => scopeVisibleInSidebar(child));
}

function getFirstVisibleScopeId() {
  for (const root of getRootScopes()) {
    const found = findVisibleScopeInTree(root);
    if (found) return found;
  }
  return null;
}

function findVisibleScopeInTree(scope) {
  if (!scopeVisibleInSidebar(scope)) return null;
  if (getVisibleItemsForScope(scope.id).length > 0 || scope.name.toLowerCase().includes(searchQuery)) {
    return scope.id;
  }

  for (const child of getChildScopes(scope.id)) {
    const found = findVisibleScopeInTree(child);
    if (found) return found;
  }

  return scope.id;
}

function getVisibleItemsForScope(scopeId) {
  return getItemsForScope(scopeId).filter((item) => itemVisibleInMain(item));
}

function itemVisibleInMain(item) {
  return item.scopeId === selectedScopeId && itemMatchesFilters(item) && itemMatchesSearch(item);
}

function itemMatchesFilters(item) {
  return activeFilters.size === 0 || activeFilters.has(item.category);
}

function itemMatchesSearch(item) {
  if (!searchQuery) return true;
  const text = [
    item.name,
    item.description,
    item.category,
    item.subType,
    item.path,
  ].join(" ").toLowerCase();
  return text.includes(searchQuery);
}

function sortCategoryItems(category, items) {
  const catKey = `${selectedScopeId}::${category}`;
  const sortState = uiState.sortBy[catKey];

  let sorted = [...items];

  // Default sort for memory: by subType then name
  if (!sortState && category === "memory") {
    const order = { project: 0, reference: 1, user: 2, feedback: 3 };
    return sorted.sort((a, b) => {
      const aOrder = order[a.subType] ?? 99;
      const bOrder = order[b.subType] ?? 99;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.name.localeCompare(b.name);
    });
  }

  if (!sortState) return sorted;

  const dir = sortState.dir === "desc" ? -1 : 1;
  if (sortState.field === "size") {
    sorted.sort((a, b) => dir * ((a.sizeBytes || 0) - (b.sizeBytes || 0)));
  } else if (sortState.field === "date") {
    sorted.sort((a, b) => dir * ((a.mtime || "").localeCompare(b.mtime || "")));
  }
  return sorted;
}

function sortArrow(catKey, field) {
  const s = uiState.sortBy[catKey];
  if (!s || s.field !== field) return "↕";
  return s.dir === "asc" ? "↑" : "↓";
}

function canMoveItem(item) {
  return !item.locked && ["memory", "skill", "mcp", "plan"].includes(item.category);
}

function canDeleteItem(item) {
  return !item.locked;
}

function itemKey(item) {
  return `${item.category}::${item.name}::${item.path}`;
}

function getItemByKey(key) {
  return data?.items.find((item) => itemKey(item) === key) || null;
}

function getSelectedItems() {
  return [...bulkSelected]
    .map((key) => getItemByKey(key))
    .filter(Boolean);
}

function resolveItem(itemRef) {
  if (!itemRef) return null;
  if (typeof itemRef === "string") return getItemByKey(itemRef) || data.items.find((item) => item.path === itemRef) || null;
  return getItemByKey(itemKey(itemRef)) || itemRef;
}

function formatShortDate(raw) {
  if (!raw) return "—";
  const date = new Date(`${raw}T00:00:00`);
  if (Number.isNaN(date.getTime())) return raw;
  return SHORT_DATE.format(date);
}

function pluralize(count, singular) {
  return `${count} ${singular}${count === 1 ? "" : "s"}`;
}

function capitalize(text) {
  return text ? text[0].toUpperCase() + text.slice(1) : "";
}

function esc(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cssEscape(value) {
  if (window.CSS?.escape) return window.CSS.escape(value);
  return String(value).replace(/["\\]/g, "\\$&");
}

init();
