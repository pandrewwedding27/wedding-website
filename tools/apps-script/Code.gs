/**
 * RSVP backend for the wedding site (Google Apps Script, bound to a Google Sheet).
 *
 * Setup: see README.md in this folder. Needs one script property:
 *   SITE_PASSWORD  - the same password guests enter on the site's password screen.
 *
 * Sheets (created by setup()):
 *   RSVPs  - one row per RSVP (group), plus a hidden JSON copy used for "Update my RSVP".
 *   Guests - one row per person, with their events, for headcounts and meal planning.
 */

var OWNER_EMAIL = 'pandrewwedding27@gmail.com';
var RSVP_SHEET = 'RSVPs';
var GUEST_SHEET = 'Guests';
var MAX_GUESTS = 20;
var EVENT_KEYS = ['dinner', 'morning', 'night', 'wedding', 'weekend'];
var GUEST_TYPES = ['adult', 'child', 'baby'];

var RSVP_HEADERS = [
  'ID', 'First submitted', 'Last updated', 'Guests', 'Adults', 'Children', 'Babies', 'Email', 'Phone',
  'Accommodation', 'Own stay', 'Airport help', 'Arrival flight', 'Arrival date', 'Arrival time',
  'Departure flight', 'Departure date', 'Departure time', 'Keys', 'Data'
];
var GUEST_HEADERS = [
  'RSVP ID', 'Name', 'Type', 'Attending', 'Dietary', 'Welcome dinner (Tue)', 'Optional activities (Wed AM)',
  'Evening celebration (Wed PM)', 'Wedding (Thu)', 'Weekend plans (Aug 6-7)', 'Contact'
];

/** Run once from the editor: creates the sheets and triggers the permission prompts. */
function setup() {
  var ss = SpreadsheetApp.getActive();
  ensureSheet_(ss, RSVP_SHEET, RSVP_HEADERS);
  ensureSheet_(ss, GUEST_SHEET, GUEST_HEADERS);
  var first = ss.getSheetByName('Sheet1');
  if (first && first.getLastRow() === 0 && ss.getSheets().length > 2) { ss.deleteSheet(first); }
  MailApp.getRemainingDailyQuota();
}

function ensureSheet_(ss, name, headers) {
  var sheet = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// ---------------------------------------------------------------- web app

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    var raw = e && e.parameter && e.parameter.payload;
    if (!raw || raw.length > 30000) { return json_({result: 'error', message: 'Invalid request.'}); }
    var data = JSON.parse(raw);
    if (!passwordOk_(data.password)) {
      return json_({result: 'error', message: 'Sorry, we couldn’t verify the site password. Please reload the site and try again.'});
    }
    var clean = sanitize_(data);
    if (clean.error) { return json_({result: 'error', message: clean.error}); }
    var outcome = save_(clean);
    if (outcome.error) { return json_({result: 'error', message: outcome.error}); }
    notify_(clean, outcome.updated);
    return json_({result: 'ok', updated: outcome.updated});
  } catch (err) {
    console.error(err);
    return json_({result: 'error', message: 'Something went wrong. Please try again.'});
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.action === 'search') { return searchByName_(p); }
  if (p.action !== 'lookup') { return ContentService.createTextOutput('RSVP service is running.'); }
  if (!passwordOk_(p.password)) { return json_({result: 'error', message: 'Not authorized.'}); }
  var sheet = getSheet_(RSVP_SHEET);
  var found = null;
  if (p.id) {
    found = findById_(sheet, str_(p.id, 80));
  } else {
    var key = keyFromInput_(p.key);
    found = key ? findRow_(sheet, [key]) : null;
  }
  if (!found) { return json_({result: 'notfound'}); }
  var rsvp = JSON.parse(found.values[RSVP_HEADERS.indexOf('Data')]);
  return json_({result: 'ok', rsvp: rsvp});
}

/**
 * Name search for "Update my RSVP". Returns the matching RSVPs' ids (so the page can open one), the matched name,
 * and masked contact hints to help tell similar names apart. Full contact details are only returned by lookup.
 */
function fold_(s) {
  return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function searchByName_(p) {
  if (!passwordOk_(p.password)) { return json_({result: 'error', message: 'Not authorized.'}); }
  var tokens = fold_(str_(p.q, 100)).split(/\s+/).filter(function (t) { return t.length >= 2; });
  if (!tokens.length || tokens.join('').length < 3) { return json_({result: 'ok', matches: []}); }
  var sheet = getSheet_(RSVP_SHEET);
  var last = sheet.getLastRow();
  var matches = [];
  if (last >= 2) {
    var rows = sheet.getRange(2, 1, last - 1, RSVP_HEADERS.length).getValues();
    var iNames = RSVP_HEADERS.indexOf('Guests'), iEmail = RSVP_HEADERS.indexOf('Email'), iPhone = RSVP_HEADERS.indexOf('Phone');
    rows.forEach(function (row) {
      var names = String(row[iNames]).split(', ');
      var hit = names.filter(function (n) {
        var low = fold_(n);
        return tokens.every(function (t) { return low.indexOf(t) !== -1; });
      });
      if (hit.length && matches.length < 5) {
        matches.push({
          id: row[0],
          name: hit[0] + (names.length > 1 ? ' (+' + (names.length - 1) + ')' : ''),
          email: maskEmail_(row[iEmail]),
          phone: maskPhone_(row[iPhone])
        });
      }
    });
  }
  return json_({result: 'ok', matches: matches});
}

function maskEmail_(email) {
  var m = String(email || '').match(/^(.)[^@]*@(.)[^.]*(\..+)$/);
  return m ? m[1] + '***@' + m[2] + '***' + m[3] : '';
}

function maskPhone_(phone) {
  var d = String(phone || '').replace(/\D/g, '');
  return d.length >= 4 ? '***-***-' + d.slice(-4) : '';
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function passwordOk_(given) {
  var expected = PropertiesService.getScriptProperties().getProperty('SITE_PASSWORD');
  return !!expected && given === expected;
}

function getSheet_(name) {
  return SpreadsheetApp.getActive().getSheetByName(name);
}

// ------------------------------------------------------------ validation

function str_(v, max) {
  return String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max || 200);
}

function sanitize_(d) {
  var email = str_(d.email, 120).toLowerCase();
  var phone = str_(d.phone, 40);
  if (!email && !phone) { return {error: 'Please add an email or a phone number.'}; }
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { return {error: 'That email address doesn’t look right.'}; }
  if (phone && phone.replace(/\D/g, '').length < 7) { return {error: 'That phone number looks too short.'}; }
  if (!Array.isArray(d.guests) || d.guests.length < 1 || d.guests.length > MAX_GUESTS) {
    return {error: 'Please add between 1 and ' + MAX_GUESTS + ' guests.'};
  }
  var guests = [];
  for (var i = 0; i < d.guests.length; i++) {
    var g = d.guests[i] || {};
    var name = str_(g.name, 100);
    if (!name) { return {error: 'Please enter a name for every guest.'}; }
    var attending = g.attending !== false;
    guests.push({
      name: name,
      type: GUEST_TYPES.indexOf(g.type) === -1 ? 'adult' : g.type,
      dietary: str_(g.dietary, 200),
      attending: attending,
      events: attending ? (Array.isArray(g.events) ? g.events.filter(function (k) { return EVENT_KEYS.indexOf(k) !== -1; }) : []) : []
    });
  }
  function leg(x) {
    x = x || {};
    return {flight: str_(x.flight, 30), date: str_(x.date, 12), time: str_(x.time, 8)};
  }
  var mode = d.mode === 'update' ? 'update' : 'new';
  return {
    mode: mode,
    updateKey: str_(d.update_key, 120),
    email: email,
    phone: phone,
    guests: guests,
    accommodation: ['provided', 'own'].indexOf(d.accommodation) === -1 ? '' : d.accommodation,
    own_stay: str_(d.own_stay, 200),
    transfer: ['yes', 'maybe', 'no'].indexOf(d.transfer) === -1 ? '' : d.transfer,
    arrival: leg(d.arrival),
    departure: leg(d.departure)
  };
}

// ------------------------------------------------------------- storage

function normEmail_(s) { return 'e:' + String(s).trim().toLowerCase(); }
// Compare phones by their last 10 digits so "+1 555 123 4567" matches "555-123-4567".
function normPhone_(s) { return 'p:' + String(s).replace(/\D/g, '').slice(-10); }

function keyFromInput_(input) {
  var s = str_(input, 120);
  if (!s) { return null; }
  if (s.indexOf('@') !== -1) { return normEmail_(s); }
  return s.replace(/\D/g, '').length >= 7 ? normPhone_(s) : null;
}

function keysFor_(clean) {
  var keys = [];
  if (clean.email) { keys.push(normEmail_(clean.email)); }
  if (clean.phone) { keys.push(normPhone_(clean.phone)); }
  return keys;
}

/** Finds the RSVPs row whose Keys cell contains any of the given keys. */
function findRow_(sheet, keys) {
  var last = sheet.getLastRow();
  if (last < 2) { return null; }
  var rows = sheet.getRange(2, 1, last - 1, RSVP_HEADERS.length).getValues();
  var keyCol = RSVP_HEADERS.indexOf('Keys');
  for (var i = 0; i < rows.length; i++) {
    var stored = String(rows[i][keyCol]).split('|');
    for (var k = 0; k < keys.length; k++) {
      if (stored.indexOf(keys[k]) !== -1) { return {row: i + 2, values: rows[i]}; }
    }
  }
  return null;
}

/** Finds the RSVPs row with the given id. */
function findById_(sheet, id) {
  var last = sheet.getLastRow();
  if (!id || last < 2) { return null; }
  var rows = sheet.getRange(2, 1, last - 1, RSVP_HEADERS.length).getValues();
  for (var i = 0; i < rows.length; i++) {
    if (rows[i][0] === id) { return {row: i + 2, values: rows[i]}; }
  }
  return null;
}

/** Stops spreadsheet formulas from being injected through guest-entered text. */
function safe_(v) {
  return typeof v === 'string' && /^[=+\-@]/.test(v) ? "'" + v : v;
}

function save_(clean) {
  var rsvps = getSheet_(RSVP_SHEET);
  var guests = getSheet_(GUEST_SHEET);
  var keys = keysFor_(clean);
  var now = new Date();

  var existing;
  if (clean.mode === 'update') {
    if (clean.updateKey.indexOf('id:') === 0) {
      existing = findById_(rsvps, clean.updateKey.slice(3));
    } else {
      var oldKey = keyFromInput_(clean.updateKey);
      existing = oldKey ? findRow_(rsvps, [oldKey]) : null;
    }
    if (!existing) { return {error: 'We couldn’t find your original RSVP. Please look it up again.'}; }
    // The new contact details must not belong to a different RSVP.
    var clash = findRow_(rsvps, keys);
    if (clash && clash.row !== existing.row) {
      return {error: 'That email or phone is already used by another RSVP.'};
    }
  } else {
    existing = findRow_(rsvps, keys);
    if (existing) {
      return {error: 'You’ve already RSVP’d with that email or phone. Choose “Update my RSVP” above to make changes.'};
    }
  }

  var id = existing ? existing.values[0] : Utilities.getUuid();
  var firstSubmitted = existing ? existing.values[1] : now;
  var counts = {adult: 0, child: 0, baby: 0};
  clean.guests.forEach(function (g) { if (g.attending) { counts[g.type]++; } });

  var stored = JSON.parse(JSON.stringify(clean));
  delete stored.mode;
  delete stored.updateKey;

  var row = [
    id, firstSubmitted, now,
    clean.guests.map(function (g) { return g.name; }).join(', '),
    counts.adult, counts.child, counts.baby,
    clean.email, clean.phone,
    clean.accommodation, clean.own_stay, clean.transfer,
    clean.arrival.flight, clean.arrival.date, clean.arrival.time,
    clean.departure.flight, clean.departure.date, clean.departure.time,
    keys.join('|'), JSON.stringify(stored)
  ].map(safe_);

  if (existing) {
    rsvps.getRange(existing.row, 1, 1, row.length).setValues([row]);
    removeGuests_(guests, id);
  } else {
    rsvps.appendRow(row);
  }

  clean.guests.forEach(function (g) {
    guests.appendRow([
      id, g.name, g.type, g.attending ? 'Yes' : 'No', g.dietary,
      g.events.indexOf('dinner') !== -1 ? 'Yes' : '',
      g.events.indexOf('morning') !== -1 ? 'Yes' : '',
      g.events.indexOf('night') !== -1 ? 'Yes' : '',
      g.events.indexOf('wedding') !== -1 ? 'Yes' : '',
      g.events.indexOf('weekend') !== -1 ? 'Yes' : '',
      clean.email || clean.phone
    ].map(safe_));
  });
  return {updated: !!existing};
}

function removeGuests_(sheet, id) {
  for (var r = sheet.getLastRow(); r >= 2; r--) {
    if (sheet.getRange(r, 1).getValue() === id) { sheet.deleteRow(r); }
  }
}

// ------------------------------------------------------------- email

function notify_(clean, updated) {
  var lines = [];
  var names = clean.guests.map(function (g) {
    return g.name + ' (' + g.type + (g.attending ? '' : ', can’t make it') + ')';
  });
  lines.push('Guests: ' + names.join(', '));
  lines.push('Contact: ' + [clean.email, clean.phone].filter(String).join(' / '));
  lines.push('Accommodation: ' + (clean.accommodation === 'provided' ? 'Surga / Bebas (provided)' :
    'Own' + (clean.own_stay ? ' – ' + clean.own_stay : '')));
  lines.push('Airport help: ' + (clean.transfer || 'not answered'));
  if (clean.arrival.flight || clean.arrival.date) {
    lines.push('Arrival: ' + [clean.arrival.flight, clean.arrival.date, clean.arrival.time].filter(String).join(' '));
  }
  if (clean.departure.flight || clean.departure.date) {
    lines.push('Departure: ' + [clean.departure.flight, clean.departure.date, clean.departure.time].filter(String).join(' '));
  }
  clean.guests.forEach(function (g) {
    if (g.dietary) { lines.push('Dietary – ' + g.name + ': ' + g.dietary); }
  });
  lines.push('', 'Full list: ' + SpreadsheetApp.getActive().getUrl());
  var subject = (updated ? 'Updated RSVP: ' : 'New RSVP: ') + clean.guests[0].name +
    (clean.guests.length > 1 ? ' +' + (clean.guests.length - 1) : '');
  MailApp.sendEmail(OWNER_EMAIL, subject, lines.join('\n'));
}
