/* Tiny test runner: test(name, fn) where fn may be async. Results are written to #results as JSON so that
   tests/run.sh can read them from a headless browser. */
(function () {
    var tests = [];
    window.test = function (name, fn) { tests.push({name: name, fn: fn}); };
    window.assert = function (cond, msg) { if (!cond) { throw new Error(msg || 'assertion failed'); } };
    window.eq = function (actual, expected, msg) {
        var a = JSON.stringify(actual), b = JSON.stringify(expected);
        if (a !== b) { throw new Error((msg ? msg + ': ' : '') + 'expected ' + b + ' but got ' + a); }
    };
    window.sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

    window.addEventListener('load', async function () {
        var results = [];
        for (var i = 0; i < tests.length; i++) {
            try { await tests[i].fn(); results.push({name: tests[i].name, ok: true}); }
            catch (e) { results.push({name: tests[i].name, ok: false, error: String(e && e.message || e)}); }
        }
        var pre = document.createElement('pre');
        pre.id = 'results';
        pre.textContent = JSON.stringify(results);
        document.body.appendChild(pre);
    });
})();
