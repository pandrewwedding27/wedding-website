#!/usr/bin/env python3
"""Screenshots of the site as it looks on phones/tablets, plus a check that every item in the mobile menu can
actually be tapped when a browser bottom bar (like Safari's) covers the bottom of the screen.

Setup (once):   python3 -m venv .venv-phone && .venv-phone/bin/pip install playwright
Run:            .venv-phone/bin/python tests/phone_screenshots.py [--out tests/phone-shots]

Uses your installed Google Chrome with phone emulation (screen size, pixel ratio, touch, user agent). It is NOT
Safari's rendering engine, so confirm important fixes on a real iPhone, but it catches layout and overlap bugs.
"""
import argparse
import subprocess
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
PAGES = ['index', 'our-story', 'schedule', 'accommodations', 'travel', 'transportation', 'explore-bali',
         'faq', 'communication', 'rsvp', 'gifts']
# name -> (width, height, pixel ratio)
DEVICES = {
    'iphone-se': (375, 667, 2),       # older/small iPhone
    'iphone-14': (390, 844, 3),
    'pixel-7': (412, 915, 2.6),
    'ipad-mini': (768, 1024, 2),
}
BOTTOM_BAR = 84   # px covered by Safari's toolbar when it is showing (approx.)
UNLOCK = """
localStorage.setItem('site-unlocked', 'a685cbfdd501f357cb8ac18faa4a35926e65fe7791d8357fe8721a4c6ddbd490');
localStorage.setItem('site-pw', 'screenshots');
"""
FAKE_BAR = f"""
const bar = document.createElement('div');
bar.id = 'fake-browser-bar';
bar.style.cssText = 'position:fixed;left:0;right:0;bottom:0;height:{BOTTOM_BAR}px;background:rgba(220,40,40,.55);' +
  'z-index:2147483647;color:#fff;font:12px sans-serif;text-align:center;padding-top:6px';
bar.textContent = 'browser bottom bar';
document.documentElement.appendChild(bar);
"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default=str(ROOT / 'tests' / 'phone-shots'))
    ap.add_argument('--port', type=int, default=8766)
    ap.add_argument('--devices', default=','.join(DEVICES))
    ap.add_argument('--pages', default=','.join(PAGES))
    args = ap.parse_args()
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    server = subprocess.Popen([sys.executable, '-m', 'http.server', str(args.port), '--bind', '127.0.0.1'],
                              cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1)
    base = f'http://127.0.0.1:{args.port}'
    problems = []
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(channel='chrome')
            for dev in args.devices.split(','):
                w, h, dpr = DEVICES[dev]
                ctx = browser.new_context(viewport={'width': w, 'height': h}, device_scale_factor=dpr,
                                          is_mobile=True, has_touch=True)
                ctx.add_init_script(UNLOCK)
                page = ctx.new_page()
                for name in args.pages.split(','):
                    page.goto(f'{base}/{name}.html')
                    page.wait_for_timeout(500)
                    page.screenshot(path=str(out / f'{dev}-{name}.png'), full_page=True)

                    # horizontal overflow = content wider than the screen
                    overflow = page.evaluate('document.documentElement.scrollWidth - window.innerWidth')
                    if overflow > 1:
                        problems.append(f'{dev} {name}: page is {overflow}px wider than the screen')

                # mobile menu with a fake browser bottom bar: is every item tappable?
                page.goto(f'{base}/index.html')
                page.wait_for_timeout(400)
                page.evaluate(FAKE_BAR)
                toggle = page.query_selector('.nav-toggle')
                if toggle and toggle.is_visible():
                    toggle.click()
                    page.wait_for_timeout(900)
                    nav = page.query_selector('.header-nav')
                    page.evaluate('document.querySelector(".header-nav").scrollTop = 1e6')
                    page.wait_for_timeout(300)
                    page.screenshot(path=str(out / f'{dev}-menu-scrolled-to-bottom.png'))
                    links = page.query_selector_all('.header-nav a')
                    blocked = []
                    for link in links:
                        link.scroll_into_view_if_needed()
                        box = link.bounding_box()
                        cx, cy = box['x'] + box['width'] / 2, box['y'] + box['height'] / 2
                        hit = page.evaluate(
                            '([x, y]) => { const el = document.elementFromPoint(x, y); '
                            'return el ? (el.closest("a") ? el.closest("a").textContent.trim() : el.id || el.tagName) : null; }',
                            [cx, cy])
                        if (hit or '').strip().lower() != link.text_content().strip().lower():
                            blocked.append(f'{link.text_content().strip()} (covered by {hit})')
                    if blocked:
                        problems.append(f'{dev}: menu items not tappable: ' + ', '.join(blocked))
                    print(f'{dev}: menu has {len(links)} items; blocked: {blocked or "none"}')
                else:
                    print(f'{dev}: desktop-style nav (no hamburger)')
                ctx.close()
            browser.close()
    finally:
        server.terminate()

    print(f'\nScreenshots saved in {out}')
    if problems:
        print('\nPROBLEMS:')
        for p in problems:
            print(' -', p)
        sys.exit(1)
    print('No overflow or blocked-menu problems found.')


if __name__ == '__main__':
    main()
