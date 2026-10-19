// ============================================================
// ROADMAP TRACKER — Main Application Logic
// State syncs to /api/state when Cloudflare Pages Functions are available, with localStorage fallback.
// ============================================================

const STORAGE_KEY = 'ai-roadmap-v1';
const STORAGE_VERSION = 2;
const CURRENT_ROADMAP_KEY = 'ai-roadmap-current';
const STATE_API_URL = '/api/state';
let serverSyncAvailable = false;
let serverSaveTimer = null;

// ── State ───────────────────────────────────────────────────
let appState = {
  selectedNodeId: null,
  userState: loadUserState(),
  currentRoadmapId: loadCurrentRoadmapId(),
};

// Bind window.ROADMAP_DATA to the currently-active roadmap
// All existing code reads ROADMAP_DATA.phases / .meta — this keeps it working unchanged
function bindCurrentRoadmap() {
  const found = (window.ROADMAPS || []).find(r => r.id === appState.currentRoadmapId);
  window.ROADMAP_DATA = found || window.ROADMAPS[0];
  appState.currentRoadmapId = window.ROADMAP_DATA.id;
}

function loadCurrentRoadmapId() {
  try {
    const id = localStorage.getItem(CURRENT_ROADMAP_KEY);
    if (id && (window.ROADMAPS || []).some(r => r.id === id)) return id;
  } catch {}
  return (window.ROADMAPS && window.ROADMAPS[0] && window.ROADMAPS[0].id) || null;
}

function saveCurrentRoadmapId(id) {
  try { localStorage.setItem(CURRENT_ROADMAP_KEY, id); } catch {}
}

// ── localStorage Helpers ────────────────────────────────────
function loadUserState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultUserState();
    const parsed = JSON.parse(raw);
    // Migrate v1 → v2: v1 nodes had {status, notes, lastUpdated}; v2 adds resources/concepts
    if (parsed.version === 1) {
      parsed.version = 2;
      // No structural changes needed — resources/concepts default to {} / [] on first access
      saveUserStateRaw(parsed);
    }
    if (parsed.version !== STORAGE_VERSION) return createDefaultUserState();
    return parsed;
  } catch {
    return createDefaultUserState();
  }
}

function saveUserStateRaw(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function createDefaultUserState() {
  return { version: STORAGE_VERSION, nodes: {} };
}

function saveUserState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState.userState));
  scheduleServerSave();
}

function isValidUserState(state) {
  return state && state.version === STORAGE_VERSION && state.nodes && typeof state.nodes === 'object';
}

function hasTrackedState(state) {
  return isValidUserState(state) && Object.keys(state.nodes).length > 0;
}

async function hydrateUserState() {
  const localState = loadUserState();
  appState.userState = localState;

  try {
    const res = await fetch(STATE_API_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error(`State API returned ${res.status}`);
    const serverState = await res.json();
    if (!isValidUserState(serverState)) throw new Error('Invalid server state');

    serverSyncAvailable = true;
    if (hasTrackedState(serverState)) {
      appState.userState = serverState;
      saveUserStateRaw(serverState);
      return;
    }

    if (hasTrackedState(localState)) {
      appState.userState = localState;
      scheduleServerSave(0);
    }
  } catch {
    serverSyncAvailable = false;
  }
}

function scheduleServerSave(delay = 300) {
  if (!serverSyncAvailable) return;
  clearTimeout(serverSaveTimer);
  serverSaveTimer = setTimeout(() => {
    saveUserStateToServer(appState.userState);
  }, delay);
}

async function saveUserStateToServer(state) {
  try {
    const res = await fetch(STATE_API_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state)
    });
    if (!res.ok) throw new Error(`State API returned ${res.status}`);
    serverSyncAvailable = true;
  } catch {
    serverSyncAvailable = false;
  }
}

function getNodeState(nodeId) {
  const stored = appState.userState.nodes[nodeId];
  if (!stored) return { status: 'not-started', notes: '', resources: {}, concepts: [], lastUpdated: new Date().toISOString() };
  // Ensure v1 nodes (migrated) always have the new fields
  return { resources: {}, concepts: [], ...stored };
}

function setNodeStatus(nodeId, status) {
  const current = getNodeState(nodeId);
  appState.userState.nodes[nodeId] = { ...current, status, lastUpdated: new Date().toISOString() };
  saveUserState();
  refreshNodeCard(nodeId);
  refreshProgressBars();
  // Update panel header if this node is open
  if (appState.selectedNodeId === nodeId) {
    updatePanelStatusButtons(status);
  }
}

let notesDebounceTimer = null;
function setNodeNotes(nodeId, notes) {
  const current = getNodeState(nodeId);
  appState.userState.nodes[nodeId] = { ...current, notes, lastUpdated: new Date().toISOString() };
  clearTimeout(notesDebounceTimer);
  notesDebounceTimer = setTimeout(() => {
    saveUserState();
    showSavedIndicator();
  }, 300);
}

function toggleResourceDone(nodeId, resourceId) {
  const state = getNodeState(nodeId);
  const resources = { ...state.resources };
  resources[resourceId] = !resources[resourceId];
  appState.userState.nodes[nodeId] = { ...state, resources, lastUpdated: new Date().toISOString() };
  saveUserState();
  const done = resources[resourceId];
  // Direct DOM update — avoid re-rendering the panel so notes textarea is untouched
  const btn = document.getElementById(`res-check-${resourceId}`);
  const row = document.getElementById(`res-row-${resourceId}`);
  if (btn) {
    btn.className = done
      ? 'res-checkbox w-5 h-5 rounded flex-shrink-0 flex items-center justify-center transition-colors bg-green-600 border border-green-600'
      : 'res-checkbox w-5 h-5 rounded flex-shrink-0 flex items-center justify-center transition-colors border border-gray-300 hover:border-gray-500 bg-white';
    btn.innerHTML = done
      ? `<svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>`
      : '';
  }
  if (row) row.style.opacity = done ? '0.5' : '1';
  // Update the resource count chip on the node card
  refreshNodeCardSubProgress(nodeId);
}

function toggleConceptDone(nodeId, conceptIndex) {
  const state = getNodeState(nodeId);
  const concepts = [...(state.concepts || [])];
  while (concepts.length <= conceptIndex) concepts.push(false);
  concepts[conceptIndex] = !concepts[conceptIndex];
  appState.userState.nodes[nodeId] = { ...state, concepts, lastUpdated: new Date().toISOString() };
  saveUserState();
  const done = concepts[conceptIndex];
  // Direct DOM update
  const li = document.getElementById(`concept-${nodeId}-${conceptIndex}`);
  if (!li) return;
  const checkbox = li.querySelector('.concept-checkbox');
  const text = li.querySelector('.concept-text');
  if (checkbox) {
    checkbox.className = done
      ? 'concept-checkbox w-4 h-4 rounded border flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors bg-green-600 border-green-600'
      : 'concept-checkbox w-4 h-4 rounded border border-gray-300 flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors hover:border-gray-500';
    checkbox.innerHTML = done
      ? `<svg class="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>`
      : '';
  }
  if (text) text.className = done ? 'concept-text line-through text-gray-400' : 'concept-text text-gray-700';
}

// ── Progress Calculation ────────────────────────────────────
function getAllNodes() {
  const nodes = [];
  for (const phase of ROADMAP_DATA.phases) {
    if (phase.granularity === 'week') {
      for (const week of phase.weeks) {
        for (const node of week.nodes) nodes.push(node);
      }
    } else {
      for (const month of phase.months) {
        for (const node of month.nodes) nodes.push(node);
      }
    }
  }
  return nodes;
}

function getPhaseNodes(phaseId) {
  const phase = ROADMAP_DATA.phases.find(p => p.id === phaseId);
  if (!phase) return [];
  const nodes = [];
  if (phase.granularity === 'week') {
    for (const week of phase.weeks) {
      for (const node of week.nodes) nodes.push(node);
    }
  } else {
    for (const month of phase.months) {
      for (const node of month.nodes) nodes.push(node);
    }
  }
  return nodes;
}

function calcProgress(nodes) {
  const total = nodes.length;
  const completed = nodes.filter(n => getNodeState(n.id).status === 'completed').length;
  const inProgress = nodes.filter(n => getNodeState(n.id).status === 'in-progress').length;
  return { total, completed, inProgress, pct: total ? Math.round((completed / total) * 100) : 0 };
}

// ── Icon Helpers ─────────────────────────────────────────────
const RESOURCE_ICONS = {
  video: `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 0a10 10 0 100 20A10 10 0 0010 0zm-2 14.5V5.5l7 4.5-7 4.5z"/></svg>`,
  article: `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4h12v2H4V4zm0 4h12v2H4V8zm0 4h8v2H4v-2z"/><rect x="2" y="2" width="16" height="16" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>`,
  book: `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4 7.962 7.962 0 0010 4.804v8.392A7.967 7.967 0 0014.5 12c.79 0 1.546.115 2.25.33V5.332A5.97 5.97 0 0014.5 5c-1.17 0-2.27.331-3.2.904L11 6.04V14.5a7.962 7.962 0 00-1-.196V4.804z"/></svg>`,
  course: `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zm5.99 7.176A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0z"/></svg>`,
  tool: `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>`,
  github: `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>`
};

const STATUS_CONFIG = {
  'not-started': { label: 'Not Started', color: 'text-gray-500', bg: 'bg-gray-100', border: 'border-gray-300', dot: 'bg-gray-400' },
  'in-progress': { label: 'In Progress', color: 'text-blue-700', bg: 'bg-blue-50',  border: 'border-blue-400', dot: 'bg-blue-500' },
  'completed':   { label: 'Completed',   color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-500', dot: 'bg-green-500' }
};

// ── Render Helpers ───────────────────────────────────────────
function renderStatusDot(status) {
  const cfg = STATUS_CONFIG[status];
  if (status === 'completed') {
    return `<div class="w-5 h-5 rounded-full flex items-center justify-center ${cfg.dot}">
      <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
    </div>`;
  }
  if (status === 'in-progress') {
    return `<div class="w-5 h-5 rounded-full flex items-center justify-center ${cfg.dot}">
      <div class="w-2 h-2 rounded-full bg-white animate-pulse"></div>
    </div>`;
  }
  return `<div class="w-5 h-5 rounded-full border-2 border-gray-500"></div>`;
}

function renderProgressBar(pct, colorClass = 'bg-blue-500') {
  return `<div class="h-1.5 bg-gray-200 rounded-full overflow-hidden flex-1">
    <div class="${colorClass} h-full rounded-full transition-all duration-500" style="width:${pct}%"></div>
  </div>`;
}

function renderProgressRing(pct, size = 48, stroke = 4) {
  const r = (size - stroke * 2) / 2;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;
  const color = pct === 100 ? '#16a34a' : pct > 0 ? '#2563eb' : '#4b5563';
  return `<svg width="${size}" height="${size}" class="transform -rotate-90">
    <circle cx="${size/2}" cy="${size/2}" r="${r}" stroke="#e5e7eb" stroke-width="${stroke}" fill="none"/>
    <circle cx="${size/2}" cy="${size/2}" r="${r}" stroke="${color}" stroke-width="${stroke}" fill="none"
      stroke-dasharray="${dash} ${c}" stroke-linecap="round" class="transition-all duration-500"/>
  </svg>`;
}

function renderCostBadge(cost) {
  const map = {
    'free': 'bg-green-50 text-green-700 border border-green-300',
    'paid': 'bg-red-50 text-red-700 border border-red-300',
    'free-tier': 'bg-yellow-50 text-yellow-700 border border-yellow-300'
  };
  const labels = { 'free': 'Free', 'paid': 'Paid', 'free-tier': 'Free Tier' };
  return `<span class="text-xs px-1.5 py-0.5 rounded ${map[cost] || ''}">${labels[cost] || cost}</span>`;
}

function renderResourceTypeLabel(type) {
  const map = {
    video: 'text-red-400',
    article: 'text-sky-400',
    book: 'text-purple-400',
    course: 'text-orange-400',
    tool: 'text-teal-400',
    github: 'text-gray-300'
  };
  return `<span class="${map[type] || 'text-gray-400'}">${RESOURCE_ICONS[type] || ''}</span>`;
}

// ── Node Card Rendering ─────────────────────────────────────
function renderNodeCard(node) {
  const state = getNodeState(node.id);
  const { status } = state;
  const cfg = STATUS_CONFIG[status];
  const isSelected = appState.selectedNodeId === node.id;
  const isProject = node.isProject;

  const borderColor = isProject
    ? (status === 'completed' ? 'border-l-green-500' : status === 'in-progress' ? 'border-l-blue-500' : 'border-l-amber-400')
    : (status === 'completed' ? 'border-l-green-500' : status === 'in-progress' ? 'border-l-blue-500' : 'border-l-gray-300');

  const bgColor = isSelected
    ? (isProject ? 'bg-amber-50' : 'bg-gray-100')
    : cfg.bg;

  const ringClass = isSelected ? 'ring-2 ring-gray-900/10' : '';

  return `<div
    id="node-${node.id}"
    class="node-card border-l-4 ${borderColor} ${bgColor} ${ringClass} rounded-r-lg px-4 py-3 cursor-pointer transition-all duration-200 hover:brightness-110 select-none"
    onclick="selectNode('${node.id}')"
    data-node-id="${node.id}"
  >
    <div class="flex items-center gap-3">
      ${renderStatusDot(status)}
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          ${isProject ? `<span class="text-xs font-bold text-amber-600 uppercase tracking-wider">Project #${node.projectNumber}</span>` : node.dayLabel ? `<span class="text-xs text-gray-400 font-mono">${node.dayLabel}</span>` : ''}
        </div>
        <div class="text-sm font-medium text-gray-800 truncate">${node.shortTitle}</div>
      </div>
      <div class="flex items-center gap-2 flex-shrink-0">
        ${(() => {
          if (!node.resources || !node.resources.length) return '';
          const nodeState = getNodeState(node.id);
          const doneCount = Object.values(nodeState.resources || {}).filter(Boolean).length;
          const total = node.resources.length;
          const color = doneCount === total ? 'text-green-600' : doneCount > 0 ? 'text-blue-600' : 'text-gray-400';
          return `<span id="res-count-${node.id}" class="text-xs ${color}">${doneCount}/${total}</span>`;
        })()}
        <svg class="w-4 h-4 text-gray-400 transition-transform duration-200 ${isSelected ? 'rotate-90' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
      </div>
    </div>
  </div>`;
}

function refreshNodeCard(nodeId) {
  const el = document.getElementById(`node-${nodeId}`);
  if (!el) return;
  const node = findNode(nodeId);
  if (!node) return;
  el.outerHTML = renderNodeCard(node);
}

// Lightweight update — only swaps the sub-progress chip without full card re-render
function refreshNodeCardSubProgress(nodeId) {
  const chip = document.getElementById(`res-count-${nodeId}`);
  if (!chip) return;
  const node = findNode(nodeId);
  if (!node || !node.resources || !node.resources.length) return;
  const state = getNodeState(nodeId);
  const doneCount = Object.values(state.resources || {}).filter(Boolean).length;
  const total = node.resources.length;
  const color = doneCount === total ? 'text-green-600' : doneCount > 0 ? 'text-blue-600' : 'text-gray-400';
  chip.className = `text-xs ${color}`;
  chip.textContent = `${doneCount}/${total}`;
}

function findNode(nodeId) {
  for (const phase of ROADMAP_DATA.phases) {
    if (phase.granularity === 'week') {
      for (const week of phase.weeks) {
        for (const node of week.nodes) if (node.id === nodeId) return node;
      }
    } else {
      for (const month of phase.months) {
        for (const node of month.nodes) if (node.id === nodeId) return node;
      }
    }
  }
  return null;
}

// ── Week Group Rendering ────────────────────────────────────
function renderWeekGroup(week) {
  const nodes = week.nodes;
  const { pct, completed, total } = calcProgress(nodes);
  const progressColor = pct === 100 ? 'bg-green-500' : 'bg-blue-500';

  return `<div class="week-group mb-3">
    <div class="flex items-center gap-3 mb-2 px-1">
      <div class="flex flex-col gap-0.5 flex-1">
        <div class="flex items-center gap-2">
          <span class="text-xs font-bold text-gray-500 uppercase tracking-wider">${week.title}</span>
          <span class="text-xs text-gray-400">${week.days}</span>
          <span class="text-xs text-gray-400 ml-auto">${completed}/${total}</span>
        </div>
        ${renderProgressBar(pct, progressColor)}
      </div>
    </div>
    <div class="space-y-1.5 pl-0" id="week-nodes-${week.id}">
      ${nodes.map((node, i) => `
        <div class="relative">
          ${i < nodes.length - 1 ? '<div class="absolute left-[14px] top-[40px] w-0.5 h-[calc(100%+6px)] bg-gray-300/70 z-0"></div>' : ''}
          <div class="relative z-10">${renderNodeCard(node)}</div>
        </div>
      `).join('')}
    </div>
  </div>`;
}

// ── Month Group Rendering ───────────────────────────────────
function renderMonthGroup(month) {
  const nodes = month.nodes;
  const { pct, completed, total } = calcProgress(nodes);
  const isExpanded = true; // all expanded by default

  return `<div class="month-group mb-3" id="month-${month.id}">
    <div class="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
      <button
        class="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors"
        onclick="toggleMonth('${month.id}')"
      >
        <div class="flex-1">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-sm font-semibold text-gray-800">${month.title}</span>
            <span class="text-xs text-gray-500">— ${month.subtitle}</span>
          </div>
          <div class="flex items-center gap-2 mt-1.5">
            ${renderProgressBar(pct, pct === 100 ? 'bg-green-500' : 'bg-blue-500')}
            <span class="text-xs text-gray-500 flex-shrink-0">${completed}/${total}</span>
          </div>
        </div>
        <svg id="month-chevron-${month.id}" class="w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
      </button>
      <div id="month-content-${month.id}" class="${isExpanded ? '' : 'hidden'} px-3 pb-3 space-y-1.5">
        ${nodes.map((node, i) => `
          <div class="relative">
            ${i < nodes.length - 1 ? '<div class="absolute left-[14px] top-[40px] w-0.5 h-[calc(100%+6px)] bg-gray-300/70 z-0"></div>' : ''}
            <div class="relative z-10">${renderNodeCard(node)}</div>
          </div>
        `).join('')}
      </div>
    </div>
  </div>`;
}

function toggleMonth(monthId) {
  const content = document.getElementById(`month-content-${monthId}`);
  const chevron = document.getElementById(`month-chevron-${monthId}`);
  content.classList.toggle('hidden');
  chevron.classList.toggle('rotate-90');
}

// ── Phase Section Rendering ─────────────────────────────────
function renderPhaseSection(phase) {
  const nodes = getPhaseNodes(phase.id);
  const { pct, completed, total } = calcProgress(nodes);
  const phaseColors = {
    'phase-1': { ring: '#3b82f6', text: 'text-blue-600', badge: 'bg-blue-50 text-blue-700 border-blue-300' },
    'phase-2': { ring: '#8b5cf6', text: 'text-purple-600', badge: 'bg-purple-50 text-purple-700 border-purple-300' }
  };
  const colors = phaseColors[phase.id] || phaseColors['phase-1'];

  let childrenHtml = '';
  if (phase.granularity === 'week') {
    childrenHtml = phase.weeks.map(w => renderWeekGroup(w)).join('');
  } else {
    childrenHtml = phase.months.map(m => renderMonthGroup(m)).join('');
  }

  return `<div class="phase-section mb-10" id="${phase.id}">
    <div class="flex items-start gap-4 mb-4">
      <div class="relative flex-shrink-0">
        ${renderProgressRing(pct, 52, 4)}
        <div class="absolute inset-0 flex flex-col items-center justify-center">
          <span class="text-xs font-bold ${colors.text}">${pct}%</span>
        </div>
      </div>
      <div class="flex-1 pt-1">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-xs font-bold uppercase tracking-wider border rounded px-2 py-0.5 ${colors.badge}">${phase.title}</span>
          <h2 class="text-lg font-bold text-gray-900">${phase.subtitle}</h2>
        </div>
        <p class="text-sm text-gray-500 mt-0.5">${phase.description}</p>
        <div class="flex items-center gap-2 mt-2">
          ${renderProgressBar(pct, pct === 100 ? 'bg-green-500' : phase.id === 'phase-2' ? 'bg-purple-500' : 'bg-blue-500')}
          <span class="text-xs text-gray-500 flex-shrink-0">${completed}/${total} completed</span>
        </div>
      </div>
    </div>
    <div class="pl-0">
      ${childrenHtml}
    </div>
  </div>`;
}

// ── Detail Panel ─────────────────────────────────────────────
function renderDetailPanel(node) {
  if (!node) return '';
  const state = getNodeState(node.id);
  const { status, notes } = state;

  // Group resources by type
  const typeOrder = ['course', 'video', 'article', 'book', 'tool', 'github'];
  const grouped = {};
  for (const type of typeOrder) {
    const items = (node.resources || []).filter(r => r.type === type);
    if (items.length) grouped[type] = items;
  }
  const typeLabels = { course: 'Courses', video: 'Videos', article: 'Articles & Docs', book: 'Books', tool: 'Tools', github: 'GitHub Repos' };

  const resourcesHtml = Object.keys(grouped).length === 0
    ? `<p class="text-sm text-gray-500 italic">No resources yet — add links to data.js to populate this section.</p>`
    : Object.entries(grouped).map(([type, items]) => `
        <div class="mb-4">
          <h4 class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">${typeLabels[type]}</h4>
          <div class="space-y-2">
            ${items.map(r => {
              const done = state.resources[r.id] === true;
              return `<div id="res-row-${r.id}" class="flex items-start gap-2" style="opacity:${done ? '0.5' : '1'}">
                <a href="${r.url}" target="_blank" rel="noopener noreferrer"
                  class="flex-1 flex items-start gap-2.5 p-2.5 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-gray-300 transition-colors group min-w-0">
                  <span class="${getResourceTypeColor(r.type)} mt-0.5 flex-shrink-0">${RESOURCE_ICONS[r.type] || ''}</span>
                  <div class="flex-1 min-w-0">
                    <div class="text-sm ${done ? 'line-through text-gray-400' : 'text-gray-800 group-hover:text-gray-900'} transition-colors leading-snug">${r.title}</div>
                    <div class="flex items-center gap-2 mt-1 flex-wrap">
                      ${r.author ? `<span class="text-xs text-gray-500">${r.author}</span>` : ''}
                      ${r.duration ? `<span class="text-xs text-gray-400">· ${r.duration}</span>` : ''}
                      ${renderCostBadge(r.cost)}
                      ${r.note ? `<span class="text-xs text-amber-600 italic">★ ${r.note}</span>` : ''}
                    </div>
                  </div>
                  <svg class="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                </a>
                <button
                  id="res-check-${r.id}"
                  onclick="toggleResourceDone('${node.id}', '${r.id}')"
                  title="${done ? 'Mark as not done' : 'Mark as done'}"
                  class="${done
                    ? 'res-checkbox w-5 h-5 rounded flex-shrink-0 flex items-center justify-center transition-colors bg-green-600 border border-green-600 mt-2.5'
                    : 'res-checkbox w-5 h-5 rounded flex-shrink-0 flex items-center justify-center transition-colors border border-gray-300 hover:border-gray-500 bg-white mt-2.5'}"
                >
                  ${done ? `<svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>` : ''}
                </button>
              </div>`;
            }).join('')}
          </div>
        </div>
      `).join('');

  return `
    <div class="flex flex-col h-full">
      <!-- Panel Header -->
      <div class="flex-shrink-0 border-b border-gray-200 p-4">
        <div class="flex items-start justify-between gap-2 mb-3">
          <div class="flex-1">
            ${node.isProject ? `<div class="text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">Project #${node.projectNumber}</div>` : node.dayLabel ? `<div class="text-xs font-mono text-gray-400 mb-1">${node.dayLabel}</div>` : ''}
            <h3 class="text-base font-bold text-gray-900 leading-snug">${node.title}</h3>
          </div>
          <button onclick="closePanel()" class="text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0 mt-1">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <!-- Status Toggle -->
        <div class="flex gap-1.5" id="status-buttons">
          ${['not-started', 'in-progress', 'completed'].map(s => {
            const cfg = STATUS_CONFIG[s];
            const isActive = status === s;
            return `<button
              onclick="setNodeStatus('${node.id}', '${s}')"
              class="flex-1 text-xs py-1.5 px-2 rounded-lg font-medium transition-all duration-150 border ${isActive ? cfg.bg + ' ' + cfg.color + ' ' + cfg.border : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'}"
              data-status="${s}"
            >${cfg.label}</button>`;
          }).join('')}
        </div>
      </div>

      <!-- Scrollable content -->
      <div class="flex-1 overflow-y-auto p-4 space-y-5">

        <!-- Description -->
        <p class="text-sm text-gray-600 leading-relaxed">${node.description}</p>

        <!-- Key Concepts -->
        ${node.concepts && node.concepts.length > 0 ? `
          <div>
            <div class="flex items-center justify-between mb-2">
              <h4 class="text-xs font-bold text-gray-500 uppercase tracking-wider">Key Concepts</h4>
              <span class="text-xs text-gray-400">${state.concepts.filter(Boolean).length}/${node.concepts.length}</span>
            </div>
            <ul class="space-y-1.5">
              ${node.concepts.map((c, i) => {
                const done = state.concepts[i] === true;
                return `<li
                  id="concept-${node.id}-${i}"
                  class="flex items-start gap-2 text-sm cursor-pointer group select-none"
                  onclick="toggleConceptDone('${node.id}', ${i})"
                >
                  <div class="${done
                    ? 'concept-checkbox w-4 h-4 rounded border flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors bg-green-600 border-green-600'
                    : 'concept-checkbox w-4 h-4 rounded border border-gray-300 flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors hover:border-gray-500'}">
                    ${done ? `<svg class="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>` : ''}
                  </div>
                  <span class="${done ? 'concept-text line-through text-gray-400' : 'concept-text text-gray-700'}">${c}</span>
                </li>`;
              }).join('')}
            </ul>
          </div>
        ` : ''}

        <!-- Practice Prompt -->
        ${node.practicePrompt ? `
          <div class="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div class="text-xs font-bold text-amber-700 uppercase tracking-wider mb-1.5">Practice Exercise</div>
            <p class="text-sm text-amber-800">${node.practicePrompt}</p>
          </div>
        ` : ''}

        <!-- Hands-On Assignment (with pitfalls / interview gotchas) -->
        ${node.assignment ? `
          <div class="bg-indigo-50 border border-indigo-200 rounded-lg p-3.5">
            <div class="flex items-baseline justify-between mb-1.5 gap-2 flex-wrap">
              <div class="text-xs font-bold text-indigo-700 uppercase tracking-wider">Hands-On Assignment</div>
              ${node.assignment.time ? `<span class="text-xs text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded">⏱ ${node.assignment.time}</span>` : ''}
            </div>
            ${node.assignment.title ? `<h5 class="text-sm font-semibold text-gray-900 mb-1.5">${node.assignment.title}</h5>` : ''}
            ${node.assignment.objective ? `<p class="text-sm text-gray-700 leading-relaxed mb-2.5">${node.assignment.objective}</p>` : ''}

            ${node.assignment.steps && node.assignment.steps.length ? `
              <div class="text-xs font-bold text-gray-500 uppercase tracking-wider mt-3 mb-1.5">Steps</div>
              <ol class="list-decimal pl-5 text-sm text-gray-700 space-y-1">
                ${node.assignment.steps.map(s => `<li>${s}</li>`).join('')}
              </ol>
            ` : ''}

            ${node.assignment.pitfalls && node.assignment.pitfalls.length ? `
              <div class="text-xs font-bold text-red-700 uppercase tracking-wider mt-3 mb-1.5 flex items-center gap-1">
                <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"/></svg>
                Pitfalls &amp; Interview Gotchas
              </div>
              <ul class="text-sm text-gray-700 space-y-1.5">
                ${node.assignment.pitfalls.map(p => `<li class="pl-2.5 border-l-2 border-red-300 leading-snug">${p}</li>`).join('')}
              </ul>
            ` : ''}
          </div>
        ` : ''}

        <!-- Resources -->
        <div>
          <h4 class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Resources</h4>
          ${resourcesHtml}
        </div>

        <!-- Notes -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <h4 class="text-xs font-bold text-gray-500 uppercase tracking-wider">Personal Notes</h4>
            <span id="notes-saved" class="text-xs text-green-400 opacity-0 transition-opacity duration-300">Saved ✓</span>
          </div>
          <textarea
            id="notes-textarea"
            class="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-gray-400 resize-none h-32"
            placeholder="Write your notes here… reminders, key takeaways, questions to revisit…"
            oninput="setNodeNotes('${node.id}', this.value)"
          >${notes || ''}</textarea>
        </div>
      </div>
    </div>
  `;
}

function getResourceTypeColor(type) {
  const map = {
    video: 'text-red-500', article: 'text-sky-600', book: 'text-purple-600',
    course: 'text-orange-500', tool: 'text-teal-600', github: 'text-gray-600'
  };
  return map[type] || 'text-gray-500';
}

function showSavedIndicator() {
  const el = document.getElementById('notes-saved');
  if (!el) return;
  el.style.opacity = '1';
  setTimeout(() => { el.style.opacity = '0'; }, 1500);
}

function updatePanelStatusButtons(activeStatus) {
  const container = document.getElementById('status-buttons');
  if (!container) return;
  container.querySelectorAll('button').forEach(btn => {
    const s = btn.dataset.status;
    const cfg = STATUS_CONFIG[s];
    const isActive = s === activeStatus;
    btn.className = `flex-1 text-xs py-1.5 px-2 rounded-lg font-medium transition-all duration-150 border ${isActive ? cfg.bg + ' ' + cfg.color + ' ' + cfg.border : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'}`;
  });
}

// ── Interaction ──────────────────────────────────────────────
function selectNode(nodeId) {
  const prev = appState.selectedNodeId;
  appState.selectedNodeId = nodeId;

  // Update previously selected card
  if (prev && prev !== nodeId) refreshNodeCard(prev);
  // Update current card
  refreshNodeCard(nodeId);

  const node = findNode(nodeId);
  const panel = document.getElementById('detail-panel');
  const panelContent = document.getElementById('detail-panel-content');

  panelContent.innerHTML = renderDetailPanel(node);
  panel.classList.remove('translate-x-full');
  panel.classList.add('translate-x-0');

  // On mobile, prevent body scroll
  if (window.innerWidth < 768) {
    document.body.style.overflow = 'hidden';
  }
}

function closePanel() {
  const prev = appState.selectedNodeId;
  appState.selectedNodeId = null;
  if (prev) refreshNodeCard(prev);

  const panel = document.getElementById('detail-panel');
  panel.classList.remove('translate-x-0');
  panel.classList.add('translate-x-full');
  document.body.style.overflow = '';
}

// ── Progress Bar Refresh ─────────────────────────────────────
function refreshProgressBars() {
  // Re-render the entire roadmap isn't ideal for large pages,
  // instead we update just the progress elements
  const allNodes = getAllNodes();
  const { pct: overallPct, completed, total } = calcProgress(allNodes);

  const overallBar = document.getElementById('overall-progress-bar');
  const overallLabel = document.getElementById('overall-progress-label');
  const overallPctEl = document.getElementById('overall-progress-pct');
  if (overallBar) overallBar.style.width = `${overallPct}%`;
  if (overallLabel) overallLabel.textContent = `${completed}/${total}`;
  if (overallPctEl) overallPctEl.textContent = `${overallPct}%`;

  // Re-render phases to update rings and sub-bars
  for (const phase of ROADMAP_DATA.phases) {
    const phaseEl = document.getElementById(phase.id);
    if (phaseEl) phaseEl.outerHTML = renderPhaseSection(phase);
  }
}

// ── Reset Progress ───────────────────────────────────────────
function resetProgress() {
  if (!confirm('Reset all progress and notes? This cannot be undone.')) return;
  appState.userState = createDefaultUserState();
  saveUserState();
  closePanel();
  init();
}

// ── Roadmap Switching ───────────────────────────────────────
function switchRoadmap(roadmapId) {
  if (roadmapId === appState.currentRoadmapId) return;
  appState.currentRoadmapId = roadmapId;
  saveCurrentRoadmapId(roadmapId);
  bindCurrentRoadmap();
  // Close any open panel — its node belongs to the previous roadmap
  if (appState.selectedNodeId) closePanel();
  init();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Hero Section ────────────────────────────────────────────
function renderHero() {
  const meta = window.ROADMAP_DATA.meta;
  return `
    <h1 class="text-2xl font-bold text-gray-900 mb-1">${meta.title}</h1>
    <p class="text-gray-500 text-sm leading-relaxed max-w-2xl">${meta.description}</p>
    <div class="flex items-center gap-4 mt-4 flex-wrap">
      <div class="flex items-center gap-1.5 text-xs text-gray-500">
        <span class="w-3 h-3 rounded-full bg-gray-300 inline-block"></span> Not Started
      </div>
      <div class="flex items-center gap-1.5 text-xs text-blue-600">
        <span class="w-3 h-3 rounded-full bg-blue-500 inline-block"></span> In Progress
      </div>
      <div class="flex items-center gap-1.5 text-xs text-green-600">
        <span class="w-3 h-3 rounded-full bg-green-500 inline-block"></span> Completed
      </div>
      <div class="flex items-center gap-1.5 text-xs text-amber-600">
        <span class="w-3 h-3 rounded border border-amber-400 inline-block"></span> Milestone Project
      </div>
    </div>
  `;
}

// ── Overall Progress Render ──────────────────────────────────
function renderTopNav() {
  const allNodes = getAllNodes();
  const { pct, completed, total } = calcProgress(allNodes);
  const roadmaps = window.ROADMAPS || [];
  const currentId = appState.currentRoadmapId;

  const tabsHtml = roadmaps.length > 1 ? `
    <div class="flex gap-1 mt-2 border-t border-gray-200 pt-2 -mx-4 px-4 overflow-x-auto">
      ${roadmaps.map(r => {
        const isActive = r.id === currentId;
        const rNodes = getAllNodesFor(r);
        const rProg = calcProgress(rNodes);
        return `<button
          onclick="switchRoadmap('${r.id}')"
          class="flex-shrink-0 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${isActive
            ? 'bg-blue-50 text-blue-700 border border-blue-300'
            : 'text-gray-600 hover:bg-gray-100 border border-transparent'}"
        >
          <span>${r.meta.title}</span>
          <span class="text-xs ${isActive ? 'text-blue-600' : 'text-gray-400'}">${rProg.completed}/${rProg.total}</span>
        </button>`;
      }).join('')}
    </div>
  ` : '';

  return `
    <div class="flex items-center justify-between gap-4 flex-wrap">
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/></svg>
          </div>
          <div>
            <div class="text-sm font-bold text-gray-900">${ROADMAP_DATA.meta.title}</div>
            <div class="text-xs text-gray-500">${ROADMAP_DATA.meta.subtitle}</div>
          </div>
        </div>
      </div>
      <div class="flex items-center gap-3 flex-1 max-w-xs">
        <div class="flex-1">
          <div class="flex items-center justify-between mb-1">
            <span class="text-xs text-gray-500">Overall Progress</span>
            <span id="overall-progress-label" class="text-xs text-gray-500">${completed}/${total}</span>
          </div>
          <div class="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div id="overall-progress-bar" class="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500" style="width:${pct}%"></div>
          </div>
        </div>
        <span id="overall-progress-pct" class="text-sm font-bold text-gray-900 w-10 text-right">${pct}%</span>
      </div>
      <button onclick="resetProgress()" class="text-xs text-gray-400 hover:text-gray-700 transition-colors px-2 py-1 rounded border border-gray-200 hover:border-gray-400">Reset</button>
    </div>
    ${tabsHtml}
  `;
}

// Helper: get all nodes for an arbitrary roadmap (not just the current one)
function getAllNodesFor(roadmap) {
  const nodes = [];
  for (const phase of (roadmap.phases || [])) {
    if (phase.granularity === 'week') {
      for (const week of (phase.weeks || [])) {
        for (const node of week.nodes) nodes.push(node);
      }
    } else {
      for (const month of (phase.months || [])) {
        for (const node of month.nodes) nodes.push(node);
      }
    }
  }
  return nodes;
}

// ── Keyboard Navigation ──────────────────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && appState.selectedNodeId) closePanel();
});

// ── Init ─────────────────────────────────────────────────────
function init() {
  bindCurrentRoadmap();

  // Render nav
  document.getElementById('top-nav').innerHTML = renderTopNav();

  // Render hero (reflects the active roadmap's meta)
  const heroEl = document.getElementById('hero');
  if (heroEl) heroEl.innerHTML = renderHero();

  // Render all phases
  const roadmapContainer = document.getElementById('roadmap-container');
  roadmapContainer.innerHTML = ROADMAP_DATA.phases.map(renderPhaseSection).join('');
}

// Boot
document.addEventListener('DOMContentLoaded', async () => {
  await hydrateUserState();
  init();
});
