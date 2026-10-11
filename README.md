# wedding-website
Andrew & Paige's wedding site (Bali, August 3–6, 2027). A static single-page site for GitHub Pages.

Layout and styling are adapted from [rampatra/wedding-website](https://github.com/rampatra/wedding-website)
(GPL-3.0), so this repo is covered by the same license terms if published.

## Run locally
```
python3 -m http.server 8000
```
Then open http://localhost:8000.

## Customizing
- Content: `index.html`
- Colors/hero overrides: `css/custom.css` (base template styles are in `css/styles.min.css`)
- RSVP storage: set `RSVP_ENDPOINT` in `js/rsvp.js` (e.g. a Google Apps Script web app)

## Flights (Travel page)
`data/flights-config.json` lists the departure airports (`origins`), destination, and date windows. With no
origins the Flights section stays hidden. Each origin gets Google Flights and Skyscanner links.

A daily GitHub Action (`.github/workflows/flights.yml`) runs `tools/fetch_flights.py`, which pulls award
availability from the seats.aero Partner API and commits it **encrypted** with the site password to
`data/flights.enc.json`. The page decrypts it in the browser after the password screen.

Setup: add repo secrets `SEATS_AERO_API_KEY` and `SITE_PASSWORD` (same value as the site password, and update
the secret whenever the password changes). Note seats.aero's terms limit public display of flights more than
60 days out; set `hide_beyond_60_days` to `true` in the config to follow that rule.

## Tests
`tests/run.sh` runs the unit tests in headless Chrome: RSVP helper logic (`js/rsvp-logic.js`), the real RSVP page
with the network mocked, and the Google Apps Script (`tools/apps-script/Code.gs`) against in-memory stand-ins for
Sheets and Mail. Needs Chrome/Chromium and Python 3; no installs.

## Phone screenshots
`tests/phone_screenshots.py` emulates iPhone SE, iPhone 14, Pixel 7 and iPad mini in Chrome, screenshots every page,
flags horizontal overflow, and checks that every mobile-menu item is tappable with a fake browser bottom bar over
the screen. Setup: `python3 -m venv .venv-phone && .venv-phone/bin/pip install playwright`, then
`.venv-phone/bin/python tests/phone_screenshots.py` (images go to `tests/phone-shots/`). It is not Safari's engine,
so still confirm important fixes on a real iPhone.
