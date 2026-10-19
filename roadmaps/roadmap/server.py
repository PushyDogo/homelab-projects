#!/usr/bin/env python3
"""Local preview server for the roadmap tracker: static files plus the same api/state
endpoint that Cloudflare Pages provides in production, backed by a SQLite file.

Standard library only, so it runs without Node or Wrangler:  python3 roadmap/server.py
  WEB_DIR   static app (index.html, app.js, styles.css)   default: ./web next to this file
  DATA_DIR  roadmap content served under /data/           default: $WEB_DIR/data
  FONTS_DIR font files served under /fonts/               default: $WEB_DIR/fonts
  STATE_DB  SQLite file holding progress                  default: ./state.db next to this file
  PORT      listen port                                   default: 8090
  UPSTREAM_URL  optional: the api/state URL of the deployed site. When set, the preview reads
            and writes your real progress (newest copy wins) instead of a separate local copy.
"""
import json
import os
import sqlite3
import threading
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
WEB_DIR = os.environ.get("WEB_DIR", os.path.join(HERE, "web"))
DATA_DIR = os.environ.get("DATA_DIR", os.path.join(WEB_DIR, "data"))
FONTS_DIR = os.environ.get("FONTS_DIR", os.path.join(WEB_DIR, "fonts"))
STATE_DB = os.environ.get("STATE_DB", os.path.join(HERE, "state.db"))
UPSTREAM_URL = os.environ.get("UPSTREAM_URL", "").strip()
ASSET_DIRS = {"/data/": DATA_DIR, "/fonts/": FONTS_DIR}
PORT = int(os.environ.get("PORT", "8090"))

STATE_VERSION = 3
STATE_ID = "default"
MAX_BODY = 1024 * 1024

db_lock = threading.Lock()
db = sqlite3.connect(STATE_DB, check_same_thread=False)
db.execute(
    "CREATE TABLE IF NOT EXISTS tracker_state ("
    "id TEXT PRIMARY KEY, state_json TEXT NOT NULL, "
    "updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"
)
db.commit()


def default_state():
    return {"version": STATE_VERSION, "updatedAt": 0, "modules": {}}


def is_valid_state(state):
    return (
        isinstance(state, dict)
        and state.get("version") == STATE_VERSION
        and isinstance(state.get("modules"), dict)
    )


def load_state():
    with db_lock:
        row = db.execute(
            "SELECT state_json FROM tracker_state WHERE id = ?", (STATE_ID,)
        ).fetchone()
    if not row:
        return default_state()
    try:
        state = json.loads(row[0])
    except ValueError:
        return default_state()
    return state if is_valid_state(state) else default_state()


def save_state(state):
    with db_lock:
        db.execute(
            "INSERT INTO tracker_state (id, state_json, updated_at) "
            "VALUES (?, ?, CURRENT_TIMESTAMP) "
            "ON CONFLICT(id) DO UPDATE SET state_json = excluded.state_json, "
            "updated_at = CURRENT_TIMESTAMP",
            (STATE_ID, json.dumps(state)),
        )
        db.commit()


def upstream_get():
    try:
        req = urllib.request.Request(UPSTREAM_URL, headers={"User-Agent": "roadmap-tracker"})
        state = json.loads(urllib.request.urlopen(req, timeout=4).read())
        return state if is_valid_state(state) else None
    except Exception:
        return None


def upstream_put(state):
    try:
        req = urllib.request.Request(
            UPSTREAM_URL, data=json.dumps(state).encode(), method="PUT",
            headers={"Content-Type": "application/json", "User-Agent": "roadmap-tracker"})
        urllib.request.urlopen(req, timeout=6).read()
    except Exception as exc:
        print(f"upstream push failed: {exc}", flush=True)


def synced_state():
    """Local state, reconciled with the upstream copy when one is configured."""
    local = load_state()
    if not UPSTREAM_URL:
        return local
    remote = upstream_get()
    if remote is None:
        return local
    if remote.get("updatedAt", 0) > local.get("updatedAt", 0):
        save_state(remote)
        return remote
    if local.get("updatedAt", 0) > remote.get("updatedAt", 0):
        threading.Thread(target=upstream_put, args=(local,), daemon=True).start()
    return local


class Handler(SimpleHTTPRequestHandler):
    server_version = "roadmap-tracker"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=WEB_DIR, **kwargs)

    def translate_path(self, path):
        # /data/* and /fonts/* are served from their own directories so they can ship
        # separately from the app.
        clean = path.split("?", 1)[0].split("#", 1)[0]
        for prefix, directory in ASSET_DIRS.items():
            if clean.startswith(prefix):
                return os.path.join(directory, os.path.basename(clean))
        return super().translate_path(path)

    def end_headers(self):
        # Content changes on every deploy; always revalidate.
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def send_json(self, payload, status=200):
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        route = self.path.split("?", 1)[0]
        if route == "/healthz":
            return self.send_json({"ok": True})
        if route == "/api/state":
            return self.send_json(synced_state())
        return super().do_GET()

    def do_PUT(self):
        if self.path.split("?", 1)[0] != "/api/state":
            return self.send_json({"error": "Not found"}, 404)
        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0 or length > MAX_BODY:
            return self.send_json({"error": "Invalid body size"}, 400)
        try:
            state = json.loads(self.rfile.read(length))
        except ValueError:
            return self.send_json({"error": "Invalid JSON body"}, 400)
        if not is_valid_state(state):
            return self.send_json({"error": "Invalid state payload"}, 400)
        save_state(state)
        if UPSTREAM_URL:
            threading.Thread(target=upstream_put, args=(state,), daemon=True).start()
        return self.send_json({"ok": True})

    def log_message(self, fmt, *args):
        # Keep probe noise out of the pod logs.
        if args and isinstance(args[0], str) and "/healthz" in args[0]:
            return
        super().log_message(fmt, *args)


if __name__ == "__main__":
    print(f"roadmap tracker on :{PORT}  web={WEB_DIR}  data={DATA_DIR}  db={STATE_DB}  upstream={UPSTREAM_URL or "none"}", flush=True)
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
