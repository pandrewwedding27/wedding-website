/* Simple password screen. This only keeps casual visitors out: the hash below is
   visible in the page source. To change the password, set PASS_HASH to
   sha256("andrew-paige-2027:" + yourPassword), e.g.:
     printf 'andrew-paige-2027:newpassword' | sha256sum */
(function () {
    var PASS_HASH = 'a685cbfdd501f357cb8ac18faa4a35926e65fe7791d8357fe8721a4c6ddbd490';
    var SALT = 'andrew-paige-2027:';
    var KEY = 'site-unlocked';

    if (localStorage.getItem(KEY) === PASS_HASH && localStorage.getItem('site-pw')) { return; }

    var root = document.documentElement;
    var style = document.createElement('style');
    style.textContent =
        'html.gated{overflow:hidden}html.gated body{visibility:hidden}' +
        '#gate{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;' +
        'background:linear-gradient(160deg,#5f7a66 0%,#7e977f 55%,#a9b99d 100%);font-family:"Open Sans",sans-serif;color:#fff;text-align:center}' +
        '#gate h1{font-weight:300;font-size:2.6em;margin:0 0 10px}' +
        '#gate p{margin:0 0 25px;color:#fff}' +
        '#gate input{padding:12px 16px;border:none;border-radius:5px;font-size:1em;width:240px;text-align:center;color:#000;background:#fff}' +
        '#gate .show{display:block;margin:12px auto 0;padding:0;border:none;background:none;color:#fff;font-size:.9em;text-decoration:underline;cursor:pointer}' +
        '#gate button{padding:12px 22px;margin-left:8px;border:2px solid #e8ca6f;border-radius:5px;background:#e8ca6f;color:#fff;font-size:1em;cursor:pointer}' +
        '#gate .err{margin-top:15px;color:#f3e6b3;min-height:1.2em}';
    root.appendChild(style);
    root.classList.add('gated');

    function sha256(text) {
        return crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)).then(function (buf) {
            return Array.prototype.map.call(new Uint8Array(buf), function (b) {
                return ('0' + b.toString(16)).slice(-2);
            }).join('');
        });
    }

    var gate = document.createElement('div');
    gate.id = 'gate';
    gate.innerHTML =
        '<form autocomplete="off"><h1>Andrew &amp; Paige</h1><p>Please enter the password from your invitation</p>' +
        '<input type="password" id="gate-pw" placeholder="Password" autofocus>' +
        '<button type="submit">Enter</button>' +
        '<button type="button" class="show" id="gate-show">Show password</button>' +
        '<div class="err" id="gate-err"></div></form>';
    root.appendChild(gate);

    document.getElementById('gate-show').addEventListener('click', function () {
        var input = document.getElementById('gate-pw');
        var hidden = input.type === 'password';
        input.type = hidden ? 'text' : 'password';
        this.textContent = hidden ? 'Hide password' : 'Show password';
        input.focus();
    });

    gate.querySelector('form').addEventListener('submit', function (e) {
        e.preventDefault();
        var entered = document.getElementById('gate-pw').value.trim();
        sha256(SALT + entered).then(function (h) {
            if (h === PASS_HASH) {
                localStorage.setItem(KEY, PASS_HASH);
                localStorage.setItem('site-pw', entered);
                root.classList.remove('gated');
                gate.remove();
            } else {
                document.getElementById('gate-err').textContent = "Sorry, that isn't right. Please try again.";
            }
        });
    });
})();
