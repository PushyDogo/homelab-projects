// Must match STORAGE_VERSION in roadmap/web/app.js and STATE_VERSION in roadmap/server.py.
const STORAGE_VERSION = 3;
// The old tracker's progress stays in the 'default' row; the new roadmap uses its own.
const STATE_ID = 'roadmap-v3';

function defaultState() {
  return { version: STORAGE_VERSION, updatedAt: 0, modules: {} };
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}

function isValidState(state) {
  return (
    state &&
    state.version === STORAGE_VERSION &&
    state.modules &&
    typeof state.modules === 'object' &&
    !Array.isArray(state.modules)
  );
}

function getDb(env) {
  if (!env.DB) {
    throw new Error('Missing D1 binding: DB');
  }
  return env.DB;
}

export async function onRequestGet({ env }) {
  const db = getDb(env);
  const row = await db
    .prepare('SELECT state_json FROM tracker_state WHERE id = ?')
    .bind(STATE_ID)
    .first();

  if (!row) {
    return jsonResponse(defaultState());
  }

  try {
    const state = JSON.parse(row.state_json);
    return jsonResponse(isValidState(state) ? state : defaultState());
  } catch {
    return jsonResponse(defaultState());
  }
}

export async function onRequestPut({ request, env }) {
  let state;
  try {
    state = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  if (!isValidState(state)) {
    return jsonResponse({ error: 'Invalid state payload' }, 400);
  }

  const db = getDb(env);
  await db
    .prepare(`
      INSERT INTO tracker_state (id, state_json, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        state_json = excluded.state_json,
        updated_at = CURRENT_TIMESTAMP
    `)
    .bind(STATE_ID, JSON.stringify(state))
    .run();

  return jsonResponse({ ok: true });
}

export function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      Allow: 'GET, PUT, OPTIONS'
    }
  });
}
