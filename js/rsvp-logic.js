/* Pure RSVP helpers (no DOM access), kept separate so they can be unit tested. */
var RsvpLogic = (function () {
    // Phone: US/Canada numbers become 555-123-4567; anything starting with + is treated as
    // international and kept as + followed by the digits.
    function formatPhone(raw) {
        var intl = raw.trim().charAt(0) === '+';
        var digits = raw.replace(/\D/g, '');
        if (intl) { return '+' + digits.slice(0, 15); }
        if (digits.length > 10) { return digits.slice(0, 10).replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3') + ' ' + digits.slice(10); }
        if (digits.length > 6) { return digits.replace(/(\d{3})(\d{3})(\d+)/, '$1-$2-$3'); }
        if (digits.length > 3) { return digits.replace(/(\d{3})(\d+)/, '$1-$2'); }
        return digits;
    }

    // An email or a phone number. Anything else typed into the lookup box is treated as a name.
    function looksLikeContact(key) {
        return key.indexOf('@') !== -1 || (/^[\d\s()+.\-]+$/.test(key) && key.replace(/\D/g, '').length >= 7);
    }

    // Returns an error message, or null when the RSVP is ready to send.
    function problem(data) {
        if (data.mode === 'update' && !data.update_key) { return 'Please find your RSVP first, using the email or phone you used.'; }
        if (!data.email && !data.phone) { return 'Please add an email or a phone number so we can reach you.'; }
        if (data.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email)) { return 'That email address doesn’t look right.'; }
        for (var i = 0; i < data.guests.length; i++) {
            if (!data.guests[i].name) { return 'Please enter a name for every guest (or remove the empty one).'; }
        }
        if (!data.accommodation) { return 'Please tell us where you’ll be staying.'; }
        if (!data.transfer) { return 'Please let us know if you’d like help with airport transfers.'; }
        return null;
    }

    function summary(data) {
        var counts = {adult: 0, child: 0, baby: 0};
        data.guests.forEach(function (g) { if (g.attending) { counts[g.type]++; } });
        var parts = [];
        if (counts.adult) { parts.push(counts.adult + (counts.adult === 1 ? ' adult' : ' adults')); }
        if (counts.child) { parts.push(counts.child + (counts.child === 1 ? ' child' : ' children')); }
        if (counts.baby) { parts.push(counts.baby + (counts.baby === 1 ? ' baby' : ' babies')); }
        return parts.length ? parts.join(', ') : 'no one attending';
    }

    return {formatPhone: formatPhone, looksLikeContact: looksLikeContact, problem: problem, summary: summary};
})();
