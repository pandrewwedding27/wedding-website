"""Reads the #results JSON out of a dumped test page (stdin) and prints a summary. Exit 1 on any failure."""
import html
import json
import re
import sys

name = sys.argv[1]
page = sys.stdin.read()
m = re.search(r'<pre id="results">(.*?)</pre>', page, re.S)
if not m:
    print(f'{name}: NO RESULTS (page did not finish running)')
    sys.exit(1)
results = json.loads(html.unescape(m.group(1)))
failed = [r for r in results if not r['ok']]
print(f'{name}: {len(results) - len(failed)}/{len(results)} passed')
for r in failed:
    print(f'  FAIL {r["name"]}\n       {r["error"]}')
sys.exit(1 if failed else 0)
