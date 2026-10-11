/* How old is the award-seat data? Kept separate from the page code so it can be unit tested. */
var FlightsLogic = (function () {
    var WARN_AFTER_DAYS = 3;     // show the "searched N days ago" chip in amber
    var EXPIRE_AFTER_DAYS = 7;   // stop showing award seats altogether

    function freshness(updatedIso, nowMs) {
        var then = Date.parse(updatedIso);
        if (isNaN(then)) {
            return {ageDays: Infinity, ago: 'a long time ago', warn: true, expired: true};
        }
        var ageDays = Math.max(0, Math.floor((nowMs - then) / 86400000));
        var ago = ageDays === 0 ? 'today' : (ageDays === 1 ? 'yesterday' : ageDays + ' days ago');
        return {ageDays: ageDays, ago: ago, warn: ageDays >= WARN_AFTER_DAYS, expired: ageDays >= EXPIRE_AFTER_DAYS};
    }

    return {freshness: freshness, WARN_AFTER_DAYS: WARN_AFTER_DAYS, EXPIRE_AFTER_DAYS: EXPIRE_AFTER_DAYS};
})();
