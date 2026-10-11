#!/usr/bin/env python3
"""Fetch award availability from the seats.aero Partner API and write it, encrypted,
to data/flights.enc.json. Run daily by .github/workflows/flights.yml.

Environment:
  SEATS_AERO_API_KEY  seats.aero Pro partner API key
  SITE_PASSWORD       site password; the output is encrypted with a key derived from it
"""
import base64
import datetime
import json
import os
import sys
import urllib.parse
import urllib.request

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

CONFIG = 'data/flights-config.json'
OUT = 'data/flights.enc.json'
API = 'https://seats.aero/partnerapi/search'
TRIPS_API = 'https://seats.aero/partnerapi/trips/'
CABIN_KEYS = {'economy': 'Y', 'premium': 'W', 'business': 'J', 'first': 'F'}
PBKDF2_ITERATIONS = 200_000


def search(api_key, origin, destination, start, end):
    params = urllib.parse.urlencode({
        'origin_airport': origin,
        'destination_airport': destination,
        'start_date': start,
        'end_date': end,
        'order_by': 'lowest_mileage',
        'take': 1000,
    })
    req = urllib.request.Request(f'{API}?{params}', headers={
        'Partner-Authorization': api_key,
        'Accept': 'application/json',
    })
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.load(resp).get('data', [])


def booking_link(api_key, availability_id):
    """Primary booking link (the mileage program's own award search) for an availability."""
    req = urllib.request.Request(TRIPS_API + urllib.parse.quote(availability_id), headers={
        'Partner-Authorization': api_key,
        'Accept': 'application/json',
    })
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            links = json.load(resp).get('booking_links') or []
    except Exception as exc:  # a missing link should never fail the whole run
        print('No booking link for', availability_id, '-', exc, file=sys.stderr)
        return None
    primary = next((l for l in links if l.get('primary')), links[0] if links else None)
    link = primary and primary.get('link')
    return link if link and link.startswith('https://') else None


def summarize(rows, cabins, per_cabin):
    """Cheapest few options per cabin, as plain dicts."""
    out = []
    for cabin in cabins:
        k = CABIN_KEYS[cabin]
        options = [r for r in rows
                   if r.get(f'{k}Available') and int(r.get(f'{k}MileageCost') or 0) > 0]
        options.sort(key=lambda r: int(r[f'{k}MileageCost']))
        for r in options[:per_cabin]:
            out.append({
                'id': r['ID'],
                'cabin': cabin,
                'date': r['Date'],
                'from': r['Route']['OriginAirport'],
                'to': r['Route']['DestinationAirport'],
                'program': r['Source'],
                'miles': int(r[f'{k}MileageCost']),
                'direct': bool(r.get(f'{k}Direct')),
                'airlines': r.get(f'{k}Airlines', ''),
                'seats': r.get(f'{k}RemainingSeats', 0),
            })
    return out


def beyond_limit(start, today):
    return datetime.date.fromisoformat(start) > today + datetime.timedelta(days=60)


def build(config, api_key, today, searcher=search, linker=booking_link):
    """{'origins': {origin_code: {destination_code: {'outbound': [...], 'return': [...]}}}}"""
    links = {}  # availability id -> booking link, so each is fetched once
    result = {'updated': datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds'),
              'origins': {}}
    for origin in config['origins']:
        home = ','.join(origin['airports'])
        per_dest = {}
        for dest in config['destinations']:
            entry = {}
            for leg, (frm, to) in {'outbound': (home, dest['code']), 'return': (dest['code'], home)}.items():
                window = config[leg]
                if config.get('hide_beyond_60_days') and beyond_limit(window['start'], today):
                    entry[leg] = []
                    continue
                rows = searcher(api_key, frm, to, window['start'], window['end'])
                entry[leg] = summarize(rows, config['cabins'], config['results_per_cabin'])
                for option in entry[leg]:
                    if option['id'] not in links:
                        links[option['id']] = linker(api_key, option['id'])
                    option['link'] = links[option['id']]
                    del option['id']
            per_dest[dest['code']] = entry
        result['origins'][origin['code']] = per_dest
    return result


def encrypt(obj, password):
    salt, iv = os.urandom(16), os.urandom(12)
    key = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt,
                     iterations=PBKDF2_ITERATIONS).derive(password.encode())
    ct = AESGCM(key).encrypt(iv, json.dumps(obj).encode(), None)
    b64 = lambda b: base64.b64encode(b).decode()
    return {'v': 1, 'iter': PBKDF2_ITERATIONS, 'salt': b64(salt), 'iv': b64(iv), 'ct': b64(ct)}


def main():
    api_key = os.environ['SEATS_AERO_API_KEY']
    password = os.environ['SITE_PASSWORD']
    with open(CONFIG, encoding='utf-8') as f:
        config = json.load(f)
    if not config['origins']:
        print('No origins configured in', CONFIG, '- nothing to do.')
        return 0
    data = build(config, api_key, datetime.date.today())
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(encrypt(data, password), f)
    print('Wrote', OUT, 'for', ', '.join(data['origins']))
    return 0


if __name__ == '__main__':
    sys.exit(main())
