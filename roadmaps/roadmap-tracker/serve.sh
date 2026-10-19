#!/bin/bash
# Local Cloudflare Pages dev server for the roadmap tracker.
# Requires Wrangler. Runs on the port Wrangler selects unless configured separately.
cd "$(dirname "$0")/.."
npm run dev
