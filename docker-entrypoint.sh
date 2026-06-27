#!/bin/sh
set -e

node /app/packages/cli/dist/index.js init-all

exec node /app/packages/mcp-server/dist/bin.js
