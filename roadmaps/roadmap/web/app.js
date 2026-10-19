// ============================================================
// ROADMAP TRACKER — application logic
// Plain JavaScript, no libraries and no build step: Cloudflare Pages serves web/ as it is.
// Progress syncs to api/state (functions/api/state.js, stored in D1), with localStorage as the fallback.
// Content lives in data/*.js; nothing in this file needs editing to change the roadmap.
// ============================================================

const R = window.ROADMAP;
const STORAGE_KEY = 'ai-roadmap-v3';
const STORAGE_VERSION = 3;
const THEME_KEY = 'ai-roadmap-theme';
const STATE_API_URL = 'api/state';

const STATUS = { todo: 'Not started', doing: 'In progress', done: 'Completed' };
const RESOURCE_KINDS = {
  video: 'Video', course: 'Course', book: 'Book', doc: 'Docs',
  article: 'Article', paper: 'Paper', code: 'Code', tool: 'Tool'
};
const STAGE_BLOCKS = ['b-lime', 'b-yellow', 'b-coral', 'b-teal'];

const ICONS = {
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  auto: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 3v18" /><path d="M12 7a5 5 0 0 1 0 10z" fill="currentColor"/></svg>',
  light: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  dark: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/></svg>'
};

// ── State ───────────────────────────────────────────────────
let userState = loadLocalState();
let serverSyncAvailable = false;
let serverSaveTimer = null;
let ui = { tracks: new Set(), status: 'all', query: '' };

function defaultState() {
  return { version: STORAGE_VERSION, updatedAt: 0, modules: {} };
}

function isValidState(s) {
  return s && s.version === STORAGE_VERSION && s.modules && typeof s.modules === 'object' && !Array.isArray(s.modules);
}

function loadLocalState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return isValidState(parsed) ? parsed : defaultState();
  } catch {
    return defaultState();
  }
}

function saveState() {
  userState.updatedAt = Date.now();
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(userState)); } catch {}
  scheduleServerSave();
}

// Newest copy wins: the server is the source of truth unless this browser has later edits
// (made while the server was unreachable).
async function hydrateState() {
  try {
    const res = await fetch(STATE_API_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error(`State API returned ${res.status}`);
    const serverState = await res.json();
    if (!isValidState(serverState)) throw new Error('Invalid server state');
    serverSyncAvailable = true;
    if ((serverState.updatedAt || 0) >= (userState.updatedAt || 0)) {
      userState = serverState;
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(userState)); } catch {}
    } else {
      scheduleServerSave(0);
    }
  } catch {
    serverSyncAvailable = false;
  }
}

function scheduleServerSave(delay = 400) {
  clearTimeout(serverSaveTimer);
  serverSaveTimer = setTimeout(pushState, delay);
}

async function pushState() {
  try {
    const res = await fetch(STATE_API_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userState)
    });
    if (!res.ok) throw new Error(`State API returned ${res.status}`);
    serverSyncAvailable = true;
  } catch {
    serverSyncAvailable = false;
  }
  renderHeader();
}

// ── Theme ───────────────────────────────────────────────────
function getTheme() {
  try { return localStorage.getItem(THEME_KEY) || 'auto'; } catch { return 'auto'; }
}

function applyTheme(theme) {
  const dark = theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}

function setTheme(theme) {
  try { localStorage.setItem(THEME_KEY, theme); } catch {}
  applyTheme(theme);
  renderHeader();
}

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => applyTheme(getTheme()));

// ── Content helpers ─────────────────────────────────────────
const MODULES = [];
const MODULE_BY_ID = {};
const STAGE_BY_ID = {};
for (const stage of R.stages) {
  STAGE_BY_ID[stage.id] = stage;
  for (const m of stage.modules) {
    m.stage = stage;
    MODULES.push(m);
    MODULE_BY_ID[m.id] = m;
  }
}

// Checkbox keys are derived from the item text, so reordering content never shifts progress.
function hashKey(prefix, text) {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) >>> 0;
  return prefix + h.toString(36);
}

function itemsOf(m) {
  return {
    topics: (m.topics || []).map(t => ({ key: hashKey('t', t), text: t })),
    questions: (m.questions || []).map(q => ({ key: hashKey('q', q), text: q })),
    exercises: (m.exercises || []).map(e => ({ key: hashKey('e', e.t), text: `${e.t}: ${e.d}`, ...e })),
    resources: (m.resources || []).map(r => ({ key: hashKey('r', r.u), text: `${r.t} ${r.u}`, ...r }))
  };
}

function moduleState(id) {
  return { status: 'todo', checks: {}, ...(userState.modules[id] || {}) };
}

// Questions and exercises are the work that counts; topics and resources are aids.
function moduleWork(m) {
  const { questions, exercises } = itemsOf(m);
  const checks = moduleState(m.id).checks;
  const all = [...questions, ...exercises];
  return { total: all.length, done: all.filter(i => checks[i.key]).length };
}

function calcProgress(modules) {
  const total = modules.length;
  const done = modules.filter(m => moduleState(m.id).status === 'done').length;
  return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
}

function hoursOf(modules) {
  return modules.reduce((acc, m) => [acc[0] + (m.h ? m.h[0] : 0), acc[1] + (m.h ? m.h[1] : 0)], [0, 0]);
}

function hoursLabel(m) {
  return m.h ? `${m.h[0]}–${m.h[1]}h` : '';
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Escapes, then turns `backticks` into <code> and **bold** into <b>.
function fmt(s) {
  return esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
}

function plain(s) {
  return String(s).replace(/`/g, '').replace(/\*\*/g, '');
}

function matchesFilters(m) {
  if (ui.tracks.size && !ui.tracks.has(m.track)) return false;
  if (ui.status !== 'all' && moduleState(m.id).status !== ui.status) return false;
  if (ui.query) {
    const hay = [m.title, m.summary, ...(m.topics || []), ...(m.exercises || []).map(e => e.t)].join(' ').toLowerCase();
    if (!ui.query.toLowerCase().split(/\s+/).every(w => hay.includes(w))) return false;
  }
  return true;
}

// ── Routing ─────────────────────────────────────────────────
// #/ overview · #/stage/<id> one stage · #/m/<id> one module
function route() {
  const h = location.hash.replace(/^#\/?/, '');
  const [kind, id] = h.split('/');
  if (kind === 'stage' && STAGE_BY_ID[id]) return { view: 'stage', id };
  if (kind === 'm' && MODULE_BY_ID[id]) return { view: 'module', id };
  return { view: 'home' };
}

// ── Mutations ───────────────────────────────────────────────
function setStatus(id, status) {
  userState.modules[id] = { ...moduleState(id), status, updated: new Date().toISOString() };
  saveState();
  render();
}

// Ticking a box patches the page in place: a full re-render would drop any text selection.
function toggleCheck(id, key, row) {
  const s = moduleState(id);
  const checks = { ...s.checks };
  if (checks[key]) delete checks[key]; else checks[key] = 1;
  const status = s.status === 'todo' && Object.keys(checks).length ? 'doing' : s.status;
  userState.modules[id] = { ...s, checks, status, updated: new Date().toISOString() };
  saveState();

  const on = !!checks[key];
  row.classList.toggle('item-on', on);
  row.querySelector('.box').setAttribute('aria-checked', on);
  const m = MODULE_BY_ID[id];
  const it = itemsOf(m);
  for (const [name, list] of Object.entries(it)) {
    const el = document.getElementById('count-' + name);
    if (el) el.textContent = `${list.filter(i => checks[i.key]).length}/${list.length}`;
  }
  if (status !== s.status) renderStatusToggle(id);
  renderHeader();
  renderSidebar();
}

function resetProgress() {
  if (!confirm('Reset all progress? This cannot be undone.')) return;
  userState = defaultState();
  saveState();
  render();
}

// ── Rendering: header and sidebar ───────────────────────────
function renderHeader() {
  const p = calcProgress(MODULES);
  const theme = getTheme();
  document.getElementById('header').innerHTML = `
    <a class="logo" href="#/" aria-label="Overview">AI</a>
    <a class="brand" href="#/">AI Engineering Roadmap</a>
    <div class="header-progress">
      <div class="header-progress-label"><span>Modules complete</span><span>${p.done}/${p.total}</span></div>
      <div class="bar"><span style="width:${p.pct}%"></span></div>
    </div>
    <span class="sync ${serverSyncAvailable ? 'sync-ok' : ''}" title="Where progress is stored">${serverSyncAvailable ? 'Synced' : 'This browser only'}</span>
    <div class="theme" role="group" aria-label="Theme">
      ${[['auto', 'Follow system'], ['light', 'Light'], ['dark', 'Dark']].map(([id, label]) =>
        `<button class="${theme === id ? 'theme-on' : ''}" data-act="theme" data-id="${id}" title="${label}" aria-label="${label}">${ICONS[id]}</button>`).join('')}
    </div>`;
}

function renderSidebar() {
  const r = route();
  const activeStage = r.view === 'stage' ? r.id : r.view === 'module' ? MODULE_BY_ID[r.id].stage.id : null;
  document.getElementById('sidebar').innerHTML = `
    <a class="nav ${r.view === 'home' ? 'nav-on' : ''}" href="#/"><span class="nav-num">★</span><span class="nav-label">Overview</span></a>
    <div class="nav-sep">Stages</div>
    ${R.stages.map(s => {
      const p = calcProgress(s.modules);
      return `<a class="nav ${activeStage === s.id ? 'nav-on' : ''} ${p.pct === 100 ? 'nav-done' : ''}" href="#/stage/${s.id}">
        <span class="nav-num">${s.n}</span>
        <span class="nav-label">${esc(s.title)}<br><span class="nav-count">${p.done}/${p.total} modules</span></span>
      </a>`;
    }).join('')}`;
}

// ── Rendering: overview ─────────────────────────────────────
function moduleCard(m) {
  const s = moduleState(m.id);
  const w = moduleWork(m);
  const envs = [...new Set((m.exercises || []).map(e => e.env))];
  return `<a class="card clickable mod track-${m.track} st-${s.status}" href="#/m/${m.id}">
    <span class="mod-status" title="${STATUS[s.status]}"></span>
    <span class="mod-main">
      <span class="pills">
        <span class="pill pill-track">${esc(R.tracks[m.track].name)}</span>
        ${m.project ? '<span class="pill pill-project">Project</span>' : ''}
        ${envs.map(e => `<span class="pill pill-env" title="${esc(R.envs[e].blurb)}">${esc(R.envs[e].name)}</span>`).join('')}
      </span>
      <span class="mod-title">${esc(m.title)}</span>
      <span class="mod-summary">${fmt(m.summary)}</span>
    </span>
    <span class="mod-side"><b>${w.done}/${w.total}</b>tasks<br>${hoursLabel(m)}</span>
  </a>`;
}

function renderHome() {
  const p = calcProgress(MODULES);
  const [lo, hi] = hoursOf(MODULES);
  const work = MODULES.reduce((a, m) => { const w = moduleWork(m); return [a[0] + w.done, a[1] + w.total]; }, [0, 0]);
  const doing = MODULES.filter(m => moduleState(m.id).status === 'doing');
  // Next up: first untouched modules whose prerequisites are complete.
  const ready = MODULES.filter(m => moduleState(m.id).status === 'todo' &&
    (m.needs || []).every(n => moduleState(n).status === 'done'));
  const picks = [...doing, ...ready].slice(0, Math.max(doing.length, 3));
  const current = R.stages.find(s => calcProgress(s.modules).pct < 100) || R.stages[R.stages.length - 1];

  return `
    <h1 class="title">${esc(R.meta.title)}</h1>
    <p class="lead">${fmt(R.meta.description)}</p>

    <div class="blocks">
      <div class="block b-lime"><div class="kicker">Modules complete</div><div class="block-big">${p.done}/${p.total}</div><div class="block-sub">${p.pct}% of the roadmap</div></div>
      <div class="block b-coral"><div class="kicker">Questions and exercises</div><div class="block-big">${work[0]}/${work[1]}</div><div class="block-sub">answered in the vault or built</div></div>
      <div class="block b-teal"><div class="kicker">Current stage</div><div class="block-big">Stage ${current.n}</div><div class="block-sub">${esc(current.title)}</div></div>
      <div class="block b-yellow"><div class="kicker">Estimated effort</div><div class="block-big">${lo}–${hi}h</div><div class="block-sub">no deadline</div></div>
    </div>

    <h2 class="section-title">${doing.length ? 'Continue' : 'Start here'}</h2>
    <div class="grid">
      ${picks.map(m => {
        const w = moduleWork(m);
        return `<a class="card clickable next-card track-${m.track}" href="#/m/${m.id}">
          <span class="pills"><span class="pill pill-track">${esc(R.tracks[m.track].name)}</span><span class="kicker">${moduleState(m.id).status === 'doing' ? 'In progress' : 'Next up'} · Stage ${m.stage.n}</span></span>
          <div class="next-title">${esc(m.title)}</div>
          <div class="meta">${w.done}/${w.total} tasks · ${hoursLabel(m)}</div>
        </a>`;
      }).join('')}
    </div>

    <h2 class="section-title">Stages</h2>
    <div class="grid">
      ${R.stages.map(s => {
        const sp = calcProgress(s.modules);
        const [slo, shi] = hoursOf(s.modules);
        return `<a class="card clickable stage-card" href="#/stage/${s.id}">
          <div class="kicker">Stage ${s.n} · ${esc(s.level)}</div>
          <h3>${esc(s.title)}</h3>
          <p>${fmt(s.blurb)}</p>
          <div class="bar"><span style="width:${sp.pct}%"></span></div>
          <div class="meta"><span>${sp.done}/${sp.total} modules</span><span>${slo}–${shi}h</span></div>
        </a>`;
      }).join('')}
    </div>

    <details class="card howto">
      <summary>How to use this</summary>
      <ol>${R.meta.howTo.map(h => `<li>${fmt(h)}</li>`).join('')}</ol>
    </details>

    <div class="foot">
      <span>Content v${esc(R.meta.version)} · reviewed ${esc(R.meta.reviewed)} · skills evidence in <code>JDs/2026-10/SKILLS-MATRIX.md</code></span>
      <button class="link" data-act="reset">Reset progress</button>
    </div>`;
}

// ── Rendering: stage ────────────────────────────────────────
function stageModulesHtml(stage) {
  const visible = stage.modules.filter(matchesFilters);
  return visible.length ? visible.map(moduleCard).join('') : '<p class="empty">No modules match these filters.</p>';
}

function renderStage(stage) {
  const p = calcProgress(stage.modules);
  const [lo, hi] = hoursOf(stage.modules);
  const tracksHere = [...new Set(stage.modules.map(m => m.track))];
  return `
    <div class="kicker">Stage ${stage.n} · ${esc(stage.level)} · ${p.done}/${p.total} modules · ${lo}–${hi}h</div>
    <h1 class="title">${esc(stage.title)}</h1>
    <p class="lead">${fmt(stage.blurb)}</p>
    <div class="outcome"><b>You can move on when:</b> ${fmt(stage.outcome)}</div>

    <div class="controls">
      <div class="toggle">
        ${[['all', 'All'], ['todo', 'Not started'], ['doing', 'In progress'], ['done', 'Completed']].map(([id, label]) =>
          `<button class="${ui.status === id ? 'toggle-on' : ''}" data-act="statusfilter" data-id="${id}">${label}</button>`).join('')}
      </div>
      ${tracksHere.length > 1 ? tracksHere.map(id =>
        `<button class="chip track-${id} ${ui.tracks.has(id) ? 'chip-on' : ''}" data-act="track" data-id="${id}">${esc(R.tracks[id].name)}</button>`).join('') : ''}
      <input class="search" type="search" id="search" placeholder="Search this stage…" value="${esc(ui.query)}" />
    </div>
    <div class="mods" id="mods">${stageModulesHtml(stage)}</div>`;
}

// ── Rendering: module page ──────────────────────────────────
function itemRow(m, item, bodyHtml) {
  const on = !!moduleState(m.id).checks[item.key];
  return `<li class="item ${on ? 'item-on' : ''}" data-key="${item.key}">
    <button class="box" data-act="check" data-id="${m.id}" data-key="${item.key}" role="checkbox" aria-checked="${on}" aria-label="Mark done"></button>
    <div class="item-text">${bodyHtml}</div>
    <div class="item-tools">
      <button class="icon-btn" data-act="copy" data-text="${esc(plain(item.text))}" title="Copy" aria-label="Copy">${ICONS.copy}</button>
      <a class="icon-btn" href="https://www.google.com/search?q=${encodeURIComponent(plain(item.searchText || item.text))}" target="_blank" rel="noopener noreferrer" title="Search the web" aria-label="Search the web">${ICONS.search}</a>
    </div>
  </li>`;
}

function section(name, cls, title, hint, list, checks, rowsHtml, toolsHtml) {
  if (!list.length) return '';
  return `<section class="card sec ${cls}">
    <div class="sec-head">
      <h2>${title}</h2>
      <span class="sec-count" id="count-${name}">${list.filter(i => checks[i.key]).length}/${list.length}</span>
      <div class="sec-tools">${toolsHtml || ''}</div>
    </div>
    ${hint ? `<p class="sec-hint">${hint}</p>` : ''}
    <ul class="items">${rowsHtml}</ul>
  </section>`;
}

function statusToggleHtml(m) {
  const status = moduleState(m.id).status;
  return `<div class="toggle ${status === 'done' ? 'status-done' : ''}" id="status-toggle">
    ${Object.entries(STATUS).map(([id, label]) =>
      `<button class="${status === id ? 'toggle-on' : ''}" data-act="status" data-id="${m.id}" data-status="${id}">${label}</button>`).join('')}
  </div>`;
}

function renderStatusToggle(id) {
  const el = document.getElementById('status-toggle');
  if (el) el.outerHTML = statusToggleHtml(MODULE_BY_ID[id]);
}

function renderModule(m) {
  const s = moduleState(m.id);
  const it = itemsOf(m);
  const needs = (m.needs || []).map(n => MODULE_BY_ID[n]).filter(Boolean);
  const idx = MODULES.indexOf(m);
  const prev = MODULES[idx - 1], next = MODULES[idx + 1];
  const copyAll = name => `<button class="btn btn-ghost" data-act="copylist" data-id="${m.id}" data-list="${name}">${ICONS.copy} Copy all</button>`;

  // Exercise searches use the title only; the full instruction is too long to be a useful query.
  it.exercises.forEach(e => { e.searchText = e.t; });
  it.resources.forEach(r => { r.searchText = r.t; r.text = `${r.t}: ${r.u}`; });

  return `
    <div class="crumbs"><a href="#/">Overview</a><span>›</span><a href="#/stage/${m.stage.id}">Stage ${m.stage.n} · ${esc(m.stage.title)}</a></div>

    <div class="card module-head track-${m.track}">
      <div class="pills">
        <span class="pill pill-track">${esc(R.tracks[m.track].name)}</span>
        ${m.project ? '<span class="pill pill-project">Project</span>' : ''}
        <span class="pill pill-env">${hoursLabel(m)}</span>
      </div>
      <h1 class="title">${esc(m.title)}</h1>
      <p>${fmt(m.summary)}</p>
      ${m.why ? `<p class="why"><b>Why it matters:</b> ${fmt(m.why)}</p>` : ''}
      ${needs.length ? `<div class="needs"><span class="kicker">Builds on</span>${needs.map(n => `<a class="need st-${moduleState(n.id).status}" href="#/m/${n.id}">${esc(n.title)}</a>`).join('')}</div>` : ''}
      <div class="module-actions">${statusToggleHtml(m)}</div>
    </div>

    ${section('topics', '', 'What to learn', '', it.topics, s.checks,
      it.topics.map(t => itemRow(m, t, `<span class="t">${fmt(t.text)}</span>`)).join(''), copyAll('topics'))}

    ${section('questions', 'sec-q', 'Answer in your notes', 'Write the answers in the vault from memory, then tick them here.', it.questions, s.checks,
      it.questions.map(q => itemRow(m, q, `<span class="t">${fmt(q.text)}</span>`)).join(''),
      `${copyAll('questions')}<button class="btn" data-act="stub" data-id="${m.id}">${ICONS.copy} Copy note stub</button>`)}
    ${(m.notes || []).length && it.questions.length ? `<p class="suggested"><b>Suggested notes:</b> ${m.notes.map(esc).join(' · ')}</p>` : ''}

    ${section('exercises', 'sec-ex', m.project ? 'Project deliverables' : 'Hands-on', '', it.exercises, s.checks,
      it.exercises.map(e => itemRow(m, e, `<b>${fmt(e.t)}</b> <span class="pill pill-env" title="${esc(R.envs[e.env].blurb)}">${esc(R.envs[e.env].name)}</span><span class="detail">${fmt(e.d)}</span>`)).join(''), copyAll('exercises'))}

    ${section('resources', '', 'Resources', '', it.resources, s.checks,
      it.resources.map(r => itemRow(m, r, `<span class="res-kind">${esc(RESOURCE_KINDS[r.k] || r.k)}</span> <a href="${esc(r.u)}" target="_blank" rel="noopener noreferrer">${esc(r.t)}</a>${r.n ? `<span class="res-note">${fmt(r.n)}</span>` : ''}`)).join(''))}

    <div class="pager">
      ${prev ? `<a class="btn btn-ghost" href="#/m/${prev.id}">← ${esc(prev.title)}</a>` : '<span></span>'}
      ${next ? `<a class="btn btn-ghost" href="#/m/${next.id}">${esc(next.title)} →</a>` : ''}
    </div>`;
}

// ── Clipboard ───────────────────────────────────────────────
// Matches 09-Templates/Study Note.md in the vault, with the questions pre-filled.
function noteStub(m) {
  const tags = ['AI-Engineering', m.stage.tag].filter((t, i, a) => t && a.indexOf(t) === i);
  const indices = ['01-AI Engineering', m.stage.index].filter(Boolean).map(i => `[[${i}]]`).join(' ');
  return [
    '---', 'tags:', ...tags.map(t => `  - ${t}`), '---',
    '##### Source: ', `##### Relevant Indices: ${indices}`, '', '',
    '### Content', '',
    '#### Questions', ...(m.questions || []).map(q => `- ${q}`), '',
    '#### Next Reads: ', ''
  ].join('\n');
}

function listAsMarkdown(m, name) {
  if (name === 'exercises') return (m.exercises || []).map(e => `- [ ] **${e.t}** — ${e.d}`).join('\n');
  return (m[name] || []).map(t => `- ${t}`).join('\n');
}

// navigator.clipboard needs HTTPS or localhost; fall back to a hidden textarea when the
// page is opened over plain HTTP (for example the local preview from another device).
async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch {}
  ta.remove();
  return ok;
}

let toastTimer = null;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('toast-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('toast-on'), 2000);
}

// ── Render and events ───────────────────────────────────────
function render() {
  const r = route();
  renderHeader();
  renderSidebar();
  document.getElementById('main').innerHTML =
    r.view === 'module' ? renderModule(MODULE_BY_ID[r.id]) :
    r.view === 'stage' ? renderStage(STAGE_BY_ID[r.id]) : renderHome();
  document.title = r.view === 'module' ? `${MODULE_BY_ID[r.id].title} · AI Engineering Roadmap`
    : r.view === 'stage' ? `${STAGE_BY_ID[r.id].title} · AI Engineering Roadmap` : 'AI Engineering Roadmap';
}

function refreshStageList() {
  const r = route();
  const el = document.getElementById('mods');
  if (r.view === 'stage' && el) el.innerHTML = stageModulesHtml(STAGE_BY_ID[r.id]);
}

document.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const { act, id, key, status, text, list } = el.dataset;
  if (act === 'status') setStatus(id, status);
  else if (act === 'check') toggleCheck(id, key, el.closest('.item'));
  else if (act === 'reset') resetProgress();
  else if (act === 'theme') setTheme(id);
  else if (act === 'copy') toast(await copyText(text) ? 'Copied' : 'Copy failed');
  else if (act === 'copylist') toast(await copyText(listAsMarkdown(MODULE_BY_ID[id], list)) ? 'Copied as a Markdown list' : 'Copy failed');
  else if (act === 'stub') toast(await copyText(noteStub(MODULE_BY_ID[id])) ? 'Note stub copied — paste it into Obsidian' : 'Copy failed');
  else if (act === 'track') {
    if (ui.tracks.has(id)) ui.tracks.delete(id); else ui.tracks.add(id);
    el.classList.toggle('chip-on');
    refreshStageList();
  } else if (act === 'statusfilter') {
    ui.status = id;
    el.parentElement.querySelectorAll('button').forEach(b => b.classList.toggle('toggle-on', b === el));
    refreshStageList();
  }
});

document.addEventListener('input', (e) => {
  if (e.target.id !== 'search') return;
  ui.query = e.target.value.trim();
  refreshStageList();
});

window.addEventListener('hashchange', () => {
  ui = { tracks: new Set(), status: 'all', query: '' };
  render();
  window.scrollTo(0, 0);
});

// ── Boot ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  render();
  await hydrateState();
  render();
});
