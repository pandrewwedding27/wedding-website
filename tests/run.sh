#!/usr/bin/env bash
# Runs every tests/*.test.html in headless Chrome and reports pass/fail. Usage: tests/run.sh
cd "$(dirname "$0")/.." || exit 1
CHROME=$(command -v google-chrome || command -v chromium || command -v chromium-browser)
[ -z "$CHROME" ] && { echo "Chrome/Chromium not found"; exit 1; }
PORT=${PORT:-8765}
python3 -m http.server "$PORT" --bind 127.0.0.1 >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null' EXIT
sleep 1
status=0
for t in tests/*.test.html; do
  out=$("$CHROME" --headless=new --no-sandbox --disable-gpu --virtual-time-budget=60000 \
        --dump-dom "http://127.0.0.1:$PORT/$t" 2>/dev/null)
  python3 -I tests/report.py "$t" <<<"$out" || status=1
done
exit $status
