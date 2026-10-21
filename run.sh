#!/usr/bin/env bash
# Auto-restart loop. Usage: OWNER_USERNAME=Omar PORT=3000 ./run.sh
cd "$(dirname "$0")"
while true; do
  node src/server.js >> server.log 2>&1
  echo "[$(date)] server exited ($?), restarting in 2s" >> server.log
  sleep 2
done
