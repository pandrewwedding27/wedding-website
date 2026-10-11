/* RSVP form: builds guest rows, validates, and posts to a Google Apps Script web app. */

// Google Apps Script web app URL that stores RSVPs in a Google Sheet. Leave empty for preview mode.
var RSVP_ENDPOINT = 'https://script.google.com/macros/s/AKfycby-8soesu50RYMkkIm60oz36ZsgArBBE-aYwQTurSz9bnMSlJl8YJGQgDJeZYzNpsUT/exec';

(function () {
    var form = document.getElementById('rsvp-form');
    if (!form) { return; }

    // [key, linked name, rest of label, checked by default, page the name links to]
    var EVENTS = [
        ['dinner', 'Welcome dinner', ' (Tue, Aug 3)', true, 'schedule.html#day-1'],
        ['morning', 'Optional activities', ' (Wed morning, Aug 4)', false, 'schedule.html#day-2'],
        ['night', 'Evening celebration', ' (Wed night, Aug 4)', true, 'schedule.html#day-2'],
        ['wedding', 'Wedding', ' (Thu, Aug 5)', true, 'schedule.html#day-3'],
        ['weekend', 'Weekend plans', ' (Aug 6–7)', false, 'faq.html#weekend-plans']
    ];
    var DRAFT_KEY = 'rsvp-draft';
    var TYPES = [['adult', 'Adult'], ['child', 'Child (2–16)'], ['baby', 'Baby (under 2)']];

    var list = document.getElementById('guest-list');
    var count = 0;

    function addGuest() {
        var n = ++count;
        var isFirst = list.children.length === 0;
        var card = document.createElement('div');
        card.className = 'guest-card';
        card.innerHTML =
            '<div class="guest-head"><strong>' + (isFirst ? 'You' : 'Guest') + '</strong>' +
            (isFirst ? '' : '<button type="button" class="guest-remove" aria-label="Remove guest"><i class="fa fa-times"></i></button>') +
            '</div>' +
            '<div class="row">' +
            '<div class="col-sm-7"><div class="form-input-group"><i class="fa fa-user"></i>' +
            '<input class="g-name" placeholder="Full name"></div></div>' +
            '<div class="col-sm-5"><div class="form-input-group"><i class="fa fa-child"></i>' +
            '<select class="g-type">' + TYPES.map(function (t) {
                return '<option value="' + t[0] + '">' + t[1] + '</option>';
            }).join('') + '</select></div></div></div>' +
            '<div class="form-input-group"><i class="fa fa-cutlery"></i>' +
            '<input class="g-diet" placeholder="Dietary restrictions or allergies (optional)"></div>' +
            '<div class="guest-events">' + EVENTS.map(function (e) {
                return '<label class="event-check"><input type="checkbox" class="g-event" value="' + e[0] + '"' +
                    (e[3] ? ' checked' : '') + '> <a href="' + e[4] + '" target="_blank" rel="noopener">' + e[1] + '</a>' + e[2] + '</label>';
            }).join('') +
            '<label class="event-check decline"><input type="checkbox" class="g-decline"> Can’t make it</label></div>';
        list.appendChild(card);
    }

    list.addEventListener('click', function (e) {
        var btn = e.target.closest('.guest-remove');
        if (btn) { btn.closest('.guest-card').remove(); }
    });

    list.addEventListener('change', function (e) {
        if (e.target.classList.contains('g-decline')) {
            var card = e.target.closest('.guest-card');
            card.querySelectorAll('.g-event').forEach(function (box) {
                box.disabled = e.target.checked;
                if (e.target.checked) { box.checked = false; }
            });
        }
    });

    document.getElementById('add-guest').addEventListener('click', addGuest);

    // Conditional fields
    document.getElementById('rsvp-accommodation').addEventListener('change', function () {
        document.getElementById('own-stay').hidden = this.value !== 'own';
    });
    document.getElementById('rsvp-transfer').addEventListener('change', function () {
        document.getElementById('flight-info').hidden = !(this.value === 'yes' || this.value === 'maybe');
    });

    var phoneInput = document.getElementById('rsvp-phone');
    phoneInput.addEventListener('input', function () {
        var before = phoneInput.value;
        var caret = phoneInput.selectionStart;
        var digitsBeforeCaret = before.slice(0, caret).replace(/\D/g, '').length;
        var formatted = RsvpLogic.formatPhone(before);
        if (formatted === before) { return; }
        phoneInput.value = formatted;
        // put the caret after the same number of digits it was after before
        var pos = 0, seen = 0;
        while (pos < formatted.length && seen < digitsBeforeCaret) {
            if (/\d/.test(formatted.charAt(pos))) { seen++; }
            pos++;
        }
        phoneInput.setSelectionRange(pos, pos);
    });

    function field(name) { return (form.elements[name] && form.elements[name].value || '').trim(); }

    function collect() {
        var guests = Array.prototype.map.call(list.querySelectorAll('.guest-card'), function (card) {
            return {
                name: card.querySelector('.g-name').value.trim(),
                type: card.querySelector('.g-type').value,
                dietary: card.querySelector('.g-diet').value.trim(),
                attending: !card.querySelector('.g-decline').checked,
                events: Array.prototype.filter.call(card.querySelectorAll('.g-event'), function (b) { return b.checked; })
                    .map(function (b) { return b.value; })
            };
        });
        return {
            email: field('email'),
            phone: field('phone'),
            guests: guests,
            accommodation: field('accommodation'),
            own_stay: field('own_stay'),
            transfer: field('transfer'),
            arrival: {flight: field('arrival_flight'), date: field('arrival_date'), time: field('arrival_time')},
            departure: {flight: field('departure_flight'), date: field('departure_date'), time: field('departure_time')},
            mode: mode,
            update_key: updateKey,
            password: localStorage.getItem('site-pw') || ''
        };
    }

    // --- New RSVP / Update my RSVP
    var mode = 'new';
    var updateKey = '';
    var found = false;

    function setMode(next, key, keepBody) {
        mode = next;
        updateKey = key || '';
        document.querySelectorAll('.rsvp-tab').forEach(function (tab) {
            tab.classList.toggle('active', tab.dataset.mode === next);
        });
        document.getElementById('rsvp-lookup').hidden = next !== 'update';
        found = next === 'update' && !!updateKey;
        document.getElementById('rsvp-body').hidden = next === 'update' && !found && !keepBody;
        form.querySelector('.rsvp-btn').textContent = next === 'update' ? 'Update RSVP' : 'Submit RSVP';
        if (next === 'update' && updateKey && updateKey.indexOf('id:') !== 0) { document.getElementById('lookup-key').value = updateKey; }
    }

    document.querySelectorAll('.rsvp-tab').forEach(function (tab) {
        tab.addEventListener('click', function () {
            setMode(tab.dataset.mode, '', false);
            document.getElementById('alert-wrapper').innerHTML = '';
            saveDraft();
        });
    });

    function esc(text) { return $('<div>').text(text).html(); }

    // Loads a saved RSVP into the form. `params` is {key: email-or-phone} or {id: rsvp id};
    // `updateKeyValue` is what the server will use to find the same RSVP when the guest saves.
    function loadRsvp(params, updateKeyValue, status, notFoundMessage) {
        status.innerHTML = alertMarkup('info', 'Looking for your RSVP…');
        $.getJSON(RSVP_ENDPOINT, $.extend({action: 'lookup', password: localStorage.getItem('site-pw') || ''}, params))
            .done(function (res) {
                if (res && res.result === 'ok' && res.rsvp) {
                    applyState(res.rsvp);
                    setMode('update', updateKeyValue, true);
                    document.getElementById('rsvp-body').hidden = false;
                    status.innerHTML = alertMarkup('success', 'Found it! Update anything below and press Update RSVP.');
                    saveDraft();
                } else {
                    status.innerHTML = alertMarkup('danger', notFoundMessage);
                }
            })
            .fail(function () {
                status.innerHTML = alertMarkup('danger', '<strong>Sorry!</strong> Something went wrong. Please try again.');
            });
    }

    function searchByName(name, status) {
        if (!RSVP_ENDPOINT) {
            status.innerHTML = alertMarkup('info', '<strong>Preview only.</strong> Name search isn’t connected yet.');
            return;
        }
        status.innerHTML = alertMarkup('info', 'Searching…');
        $.getJSON(RSVP_ENDPOINT, {action: 'search', q: name, password: localStorage.getItem('site-pw') || ''})
            .done(function (res) {
                var matches = (res && res.matches) || [];
                if (!matches.length) {
                    status.innerHTML = alertMarkup('danger', 'We couldn’t find an RSVP under that name. Try another spelling, ' +
                        'or use your email or phone. If you haven’t RSVP’d yet, switch to “New RSVP”.');
                    return;
                }
                // An older version of the Google script finds names but can't open them; fall back to hints.
                if (matches.some(function (m) { return !m.id; })) {
                    var lines = matches.map(function (m) {
                        return '<li><strong>' + esc(m.name) + '</strong> &ndash; RSVP’d with ' +
                            esc([m.email, m.phone].filter(String).join(' or ') || 'no contact on file') + '</li>';
                    }).join('');
                    status.innerHTML = alertMarkup('info', 'We found you! Please type the full email or phone from the hint ' +
                        'into the box above and press “Find my RSVP”.<ul class="lookup-matches">' + lines + '</ul>');
                    return;
                }
                if (matches.length === 1) {
                    loadRsvp({id: matches[0].id}, 'id:' + matches[0].id, status, 'We couldn’t open that RSVP. Please try again.');
                    return;
                }
                var items = matches.map(function (m) {
                    var hints = [m.email, m.phone].filter(String).join(' or ');
                    return '<li><button type="button" class="match-open" data-id="' + esc(m.id) + '"><strong>' + esc(m.name) +
                        '</strong><span>' + esc(hints) + '</span></button></li>';
                }).join('');
                status.innerHTML = alertMarkup('info', 'We found a few matches. Which one is you?' +
                    '<ul class="lookup-matches">' + items + '</ul>');
            })
            .fail(function () {
                status.innerHTML = alertMarkup('danger', '<strong>Sorry!</strong> Name search isn’t working right now. ' +
                    'Please try your email or phone number instead.');
            });
    }

    document.getElementById('lookup-status').addEventListener('click', function (e) {
        var btn = e.target.closest('.match-open');
        if (btn) {
            loadRsvp({id: btn.dataset.id}, 'id:' + btn.dataset.id, this, 'We couldn’t open that RSVP. Please try again.');
        }
    });

    document.getElementById('lookup-btn').addEventListener('click', function () {
        var key = document.getElementById('lookup-key').value.trim();
        var status = document.getElementById('lookup-status');
        if (!key) { status.innerHTML = alertMarkup('danger', 'Enter the email or phone you used, or your name.'); return; }

        // Anything that isn't an email or a phone number is treated as a name search.
        if (!RsvpLogic.looksLikeContact(key)) { searchByName(key, status); return; }

        if (!RSVP_ENDPOINT) {
            status.innerHTML = alertMarkup('info', '<strong>Preview only.</strong> Lookups aren’t connected yet, ' +
                'so the form below is blank. Once RSVPs are live, your answers will fill in here.');
            setMode('update', key, true);
            document.getElementById('rsvp-body').hidden = false;
            return;
        }
        loadRsvp({key: key}, key, status, 'We couldn’t find an RSVP with that email or phone. ' +
            'Check the spelling, or switch to “New RSVP”.');
    });

    // --- keep the form filled in across navigation (e.g. following an event link, then Back)
    function saveDraft() {
        try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(collect())); } catch (err) { /* private mode */ }
    }

    function setField(name, value) {
        if (form.elements[name] && value) { form.elements[name].value = value; }
    }

    function applyState(draft) {
        list.innerHTML = '';
        draft.guests.forEach(function () { addGuest(); });
        var cards = list.querySelectorAll('.guest-card');
        draft.guests.forEach(function (g, i) {
            var card = cards[i];
            card.querySelector('.g-name').value = g.name;
            card.querySelector('.g-type').value = g.type;
            card.querySelector('.g-diet').value = g.dietary;
            card.querySelectorAll('.g-event').forEach(function (box) {
                box.checked = g.events.indexOf(box.value) !== -1;
            });
            if (!g.attending) {
                card.querySelector('.g-decline').checked = true;
                card.querySelectorAll('.g-event').forEach(function (box) { box.disabled = true; });
            }
        });
        ['email', 'phone', 'accommodation', 'own_stay', 'transfer'].forEach(function (k) { setField(k, draft[k]); });
        var a = draft.arrival || {}, d = draft.departure || {};
        setField('arrival_flight', a.flight); setField('arrival_date', a.date); setField('arrival_time', a.time);
        setField('departure_flight', d.flight); setField('departure_date', d.date); setField('departure_time', d.time);
        document.getElementById('own-stay').hidden = draft.accommodation !== 'own';
        document.getElementById('flight-info').hidden = !(draft.transfer === 'yes' || draft.transfer === 'maybe');
    }

    function restoreDraft() {
        var draft = null;
        try { draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || 'null'); } catch (err) { draft = null; }
        if (!draft || !draft.guests || !draft.guests.length) { addGuest(); return; }
        applyState(draft);
        setMode(draft.mode || 'new', draft.update_key || '', true);
    }

    restoreDraft();
    form.addEventListener('input', saveDraft);
    form.addEventListener('change', saveDraft);
    list.addEventListener('click', function () { setTimeout(saveDraft, 0); });
    document.getElementById('add-guest').addEventListener('click', function () { setTimeout(saveDraft, 0); });
    window.addEventListener('pagehide', saveDraft);

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        var alertBox = document.getElementById('alert-wrapper');
        var data = collect();
        var err = RsvpLogic.problem(data);
        if (err) {
            alertBox.innerHTML = alertMarkup('danger', err);
            return;
        }

        if (!RSVP_ENDPOINT) {
            if (window.console) { console.log('RSVP preview payload', data); }
            alertBox.innerHTML = alertMarkup('info',
                '<strong>Preview only &ndash; nothing was saved.</strong> This would record ' + RsvpLogic.summary(data) +
                '. RSVPs aren’t connected yet.');
            return;
        }

        alertBox.innerHTML = alertMarkup('info', '<strong>Just a sec!</strong> We are saving your RSVP.');
        $.post(RSVP_ENDPOINT, {payload: JSON.stringify(data)})
            .done(function (res) {
                if (res && res.result === 'error') {
                    alertBox.innerHTML = alertMarkup('danger', res.message);
                } else {
                    alertBox.innerHTML = '';
                    sessionStorage.removeItem(DRAFT_KEY);
                    $('#rsvp-modal h3').text(data.mode === 'update' ? 'RSVP updated!' : 'Thank you!');
                    $('#rsvp-modal').modal('show');
                }
            })
            .fail(function () {
                alertBox.innerHTML = alertMarkup('danger', '<strong>Sorry!</strong> There was an issue saving your RSVP. Please try again.');
            });
    });
})();
