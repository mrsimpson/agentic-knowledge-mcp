#!/bin/sh
set -e

CONFIG="/knowledge/.knowledge/config.yaml"

if [ ! -f "$CONFIG" ]; then
  echo "ERROR: $CONFIG not found. Mount your .knowledge directory." >&2
  exit 1
fi

# Extract docset IDs from config.yaml and init each (init is safe to re-run: skips if already initialized)
grep -E '^\s+- id:' "$CONFIG" | sed 's/.*id: *//' | tr -d '\r' | while read -r id; do
  echo "Init docset: $id" >&2
  # Send all init output to stderr; stdout must stay clean for the MCP JSON-RPC stream
  node /app/packages/cli/dist/index.js init "$id" 1>&2 2>&1 || true
done

exec node /app/packages/mcp-server/dist/bin.js
