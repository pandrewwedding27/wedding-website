/* Travel page: flight search links (Google Flights, Skyscanner) plus the daily
   award-availability summary, which is stored encrypted in data/flights.enc.json. */
(function () {
    var section = document.getElementById('flights');
    if (!section) { return; }

    var PROGRAMS = {
        aeroplan: 'Air Canada Aeroplan', alaska: 'Alaska Mileage Plan', american: 'American AAdvantage',
        delta: 'Delta SkyMiles', united: 'United MileagePlus', flyingblue: 'Flying Blue',
        virginatlantic: 'Virgin Atlantic', singapore: 'Singapore KrisFlyer', qantas: 'Qantas',
        velocity: 'Virgin Australia Velocity', emirates: 'Emirates Skywards', etihad: 'Etihad Guest',
        qatar: 'Qatar Privilege Club', turkish: 'Turkish Miles&Smiles', lufthansa: 'Lufthansa Miles&More',
        jetblue: 'JetBlue TrueBlue', eurobonus: 'SAS EuroBonus', finnair: 'Finnair Plus'
    };

    function esc(s) {
        return String(s).replace(/[&<>"']/g, function (c) {
            return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c];
        });
    }

    function yymmdd(iso) { return iso.slice(2, 4) + iso.slice(5, 7) + iso.slice(8, 10); }

    function googleUrl(origin, dest, out, back) {
        return 'https://www.google.com/travel/flights?q=' + encodeURIComponent(
            'Flights from ' + origin + ' to ' + dest + ' on ' + out + ' through ' + back);
    }

    function skyscannerUrl(origin, dest, out, back) {
        return 'https://www.skyscanner.com/transport/flights/' + origin.toLowerCase() + '/' +
            dest.toLowerCase() + '/' + yymmdd(out) + '/' + yymmdd(back) + '/';
    }

    function niceDate(iso) {
        var p = iso.split('-');
        return new Date(+p[0], +p[1] - 1, +p[2]).toLocaleDateString('en-US',
            {weekday: 'short', month: 'short', day: 'numeric'});
    }

    function fmtOptions(options) {
        if (!options || !options.length) { return '<div class="award none">No award seats found in our search. This may not be accurate &ndash; try ' +
            '<a href="https://seats.aero" target="_blank" rel="noopener">seats.aero</a> or the airline\'s own site.</div>'; }
        return options.map(function (o) {
            var program = PROGRAMS[o.program] || o.program;
            var inner =
                '<span class="badge-cabin ' + esc(o.cabin) + '">' + esc(o.cabin) + '</span>' +
                '<div class="award-main"><div class="award-route">' + esc(o.from) + ' <i class="fa fa-long-arrow-right"></i> ' +
                esc(o.to) + (o.direct ? ' <span class="badge-direct">Nonstop</span>' : '') + '</div>' +
                '<div class="award-meta">' + niceDate(o.date) + ' &middot; ' + esc(program) +
                (o.airlines ? ' &middot; ' + esc(o.airlines) : '') + '</div></div>' +
                '<div class="award-pts">' + o.miles.toLocaleString() + '<small>pts</small></div>';
            var url = o.link && /^https:\/\//.test(o.link) ? o.link : null;
            return url ?
                '<a class="award ' + esc(o.cabin) + ' award-link" target="_blank" rel="noopener" href="' + esc(url) +
                    '" title="Open ' + esc(program) + ' to book">' + inner + '<span class="award-go"><i class="fa fa-external-link"></i></span></a>' :
                '<div class="award ' + esc(o.cabin) + '">' + inner + '</div>';
        }).join('');
    }

    var awardData = null;
    var destLabels = {};

    function cheapestEconomy(code, leg) {
        var best = null;
        var byDest = awardData && awardData.origins[code];
        Object.keys(byDest || {}).forEach(function (dest) {
            (byDest[dest][leg] || []).forEach(function (o) {
                if (o.cabin === 'economy' && (!best || o.miles < best.miles)) {
                    best = o; best.dest = dest;
                }
            });
        });
        return best;
    }

    function bestTile(title, o) {
        if (!o) {
            return '<div class="best-tile none"><div class="best-title">' + title +
                '</div><div class="best-empty">No economy award seats found</div></div>';
        }
        var program = PROGRAMS[o.program] || o.program;
        var city = destLabels[o.dest] || o.dest;
        return '<div class="best-tile"><div class="best-title">' + title + '</div>' +
            '<div class="best-pts">' + o.miles.toLocaleString() + '<small>pts</small></div>' +
            '<div class="best-route">' + esc(o.from) + ' <i class="fa fa-long-arrow-right"></i> ' + esc(o.to) +
            (o.direct ? ' <span class="badge-direct">Nonstop</span>' : '') + '</div>' +
            '<div class="award-meta">' + niceDate(o.date) + ' &middot; ' + esc(program) +
            (o.dest !== 'DPS' ? ' &middot; via ' + esc(city) : '') + '</div></div>';
    }

    function renderBest(code) {
        var box = document.getElementById('flight-best');
        if (!awardData || !code) { box.hidden = true; return; }
        var go = cheapestEconomy(code, 'outbound'), back = cheapestEconomy(code, 'return');
        var total = go && back ? '<div class="best-total">Round trip from <strong>' +
            (go.miles + back.miles).toLocaleString() + ' pts</strong> in economy' +
            ((go.dest !== 'DPS' || back.dest !== 'DPS') ?
                '<div class="best-note">Flights that don\'t end in Bali don\'t include the onward hop to Bali.</div>' : '') +
            '</div>' : '';
        box.innerHTML = '<div class="best-head"><i class="fa fa-trophy"></i> Cheapest economy award seats</div>' +
            '<div class="best-tiles">' + bestTile('Going', go) + bestTile('Returning', back) + '</div>' + total;
        box.hidden = false;
    }

    function b64(s) { return Uint8Array.from(atob(s), function (c) { return c.charCodeAt(0); }); }

    function decrypt(enc, password) {
        return crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey'])
            .then(function (base) {
                return crypto.subtle.deriveKey(
                    {name: 'PBKDF2', salt: b64(enc.salt), iterations: enc.iter, hash: 'SHA-256'},
                    base, {name: 'AES-GCM', length: 256}, false, ['decrypt']);
            })
            .then(function (key) { return crypto.subtle.decrypt({name: 'AES-GCM', iv: b64(enc.iv)}, key, b64(enc.ct)); })
            .then(function (pt) { return JSON.parse(new TextDecoder().decode(pt)); });
    }

    function loadAwards() {
        var password = localStorage.getItem('site-pw');
        if (!password) { return Promise.resolve(null); }
        return fetch('data/flights.enc.json', {cache: 'no-cache'})
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (enc) { return enc ? decrypt(enc, password) : null; })
            .catch(function () { return null; });
    }

    fetch('data/flights-config.json', {cache: 'no-cache'})
        .then(function (r) { return r.json(); })
        .then(function (config) {
            if (!config.origins.length) { return; }
            var out = config.outbound.start, back = config['return'].end;

            document.getElementById('flight-origins').innerHTML = config.origins.map(function (o) {
                var card = function (d) {
                    var onward = d.featured ? '' : '<a class="btn-flight" target="_blank" rel="noopener" href="' +
                        googleUrl(d.label, 'Bali', config.outbound.end, config.outbound.end) +
                        '"><i class="fa fa-plane"></i> Onward to Bali</a>';
                    return '<div class="col-md-6 flight-col"><div class="flight-dest" data-origin="' + esc(o.code) +
                        '" data-dest="' + esc(d.code) + '" data-featured="' + (d.featured ? '1' : '0') + '">' +
                        '<div class="flight-dest-head"><i class="fa fa-plane"></i> ' + esc(o.label) + ' to ' + esc(d.label) +
                        ' <span>(' + esc(d.code) + ')</span></div>' +
                        '<div class="flight-dest-body">' +
                        '<div class="flight-links"><div class="pay-label"><i class="fa fa-usd"></i> Pay with cash</div><a class="btn-flight" target="_blank" rel="noopener" href="' +
                        googleUrl(o.label, d.label, out, back) + '"><i class="fa fa-google"></i> Google Flights</a>' +
                        '<a class="btn-flight" target="_blank" rel="noopener" href="' +
                        skyscannerUrl(o.code, d.code, out, back) + '"><i class="fa fa-search"></i> Skyscanner</a>' +
                        onward + '</div><div class="flight-awards"></div></div></div></div>';
                };
                var featured = config.destinations.filter(function (d) { return d.featured; }).map(card).join('');
                var others = config.destinations.filter(function (d) { return !d.featured; }).map(card).join('');
                return '<div class="flight-card" data-origin="' + esc(o.code) + '" hidden>' +
                    '<div class="row">' + featured + '</div>' +
                    (others ? '<h5 class="flight-more" hidden>Other connecting airports to try</h5>' +
                        '<div class="row flight-others">' + others + '</div>' : '') + '</div>';
            }).join('');

            config.destinations.forEach(function (d) { destLabels[d.code] = d.label; });
            var select = document.getElementById('flight-from');
            select.innerHTML = '<option value="">Where are you flying from?</option>' +
                config.origins.map(function (o) {
                    return '<option value="' + esc(o.code) + '">' + esc(o.label) + '</option>';
                }).join('');
            var showOrigin = function (code) {
                document.querySelectorAll('.flight-card').forEach(function (card) {
                    card.hidden = card.dataset.origin !== code;
                });
                localStorage.setItem('flight-from', code);
                renderBest(code);
            };
            select.addEventListener('change', function () { showOrigin(select.value); });
            var saved = localStorage.getItem('flight-from');
            if (saved && config.origins.some(function (o) { return o.code === saved; })) {
                select.value = saved;
                showOrigin(saved);
            }

            var hubs = config.destinations.filter(function (d) { return d.code !== 'DPS'; }).map(function (a) {
                return '<li><strong>' + esc(a.code) + '</strong> &ndash; ' + esc(a.label) + '</li>';
            }).join('');
            if (hubs) {
                document.getElementById('flight-hubs').innerHTML =
                    '<h5>Good airports to search</h5>' +
                    '<p>Flights straight to Bali can be pricey or scarce. Try searching to one of these airports ' +
                    'instead, then continuing on to Bali (DPS):</p><ul class="hub-list">' + hubs + '</ul>';
            }
            section.hidden = false;

            loadAwards().then(function (data) {
                if (!data) { return; }
                var fresh = FlightsLogic.freshness(data.updated, Date.now());
                var stamp = new Date(data.updated).toLocaleString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                    hour: 'numeric', minute: '2-digit', timeZoneName: 'short'
                });
                var chip = document.getElementById('flight-searched');

                // Data a week or more old is hidden rather than shown as if it were current.
                if (fresh.expired) {
                    awardData = null;
                    renderBest('');
                    document.querySelectorAll('.flight-awards').forEach(function (el) {
                        el.innerHTML = '<div class="award none">Award seat data is out of date, so we’ve hidden it. ' +
                            'Use the cash links above, or check <a href="https://seats.aero" target="_blank" rel="noopener">seats.aero</a>.</div>';
                    });
                    document.querySelectorAll('.flight-others, .flight-more').forEach(function (el) { el.hidden = true; });
                    chip.innerHTML = '<i class="fa fa-exclamation-triangle"></i> Award seat data was last updated <strong>' +
                        esc(stamp) + '</strong> and is hidden until it refreshes';
                    chip.classList.add('stale');
                    chip.hidden = false;
                    return;
                }

                awardData = data;
                renderBest(select.value);
                document.querySelectorAll('.flight-dest').forEach(function (el) {
                    var byDest = data.origins[el.dataset.origin];
                    var entry = byDest && byDest[el.dataset.dest];
                    if (!entry) { return; }
                    if (el.dataset.featured === '0' && !entry.outbound.length && !entry['return'].length) {
                        el.parentNode.hidden = true;
                        return;
                    }
                    if (el.dataset.featured === '0') {
                        var heading = el.closest('.flight-card').querySelector('.flight-more');
                        if (heading) { heading.hidden = false; }
                    }
                    el.querySelector('.flight-awards').innerHTML =
                        '<div class="award-label"><i class="fa fa-star"></i> Pay with points &middot; outbound</div>' +
                        fmtOptions(entry.outbound) +
                        '<div class="award-label"><i class="fa fa-star"></i> Pay with points &middot; return</div>' +
                        fmtOptions(entry['return']);
                });
                chip.innerHTML = '<i class="fa fa-clock-o"></i> Award seats searched <strong>' + esc(stamp) +
                    '</strong> (' + fresh.ago + ')';
                chip.classList.toggle('stale', fresh.warn);
                chip.hidden = false;
                document.getElementById('flight-updated').textContent = stamp;
                document.getElementById('flight-credit').hidden = false;
            });
        });
})();
