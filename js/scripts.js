// WhatsApp group invite link (https://chat.whatsapp.com/...). Leave empty to show "coming soon".
var WHATSAPP_URL = 'https://chat.whatsapp.com/CleeuGJev7vLqsTgQHvk2H';

$(document).ready(function () {

    /***************** Waypoints ******************/
    var animations = {
        wp1: 'fadeInLeft', wp2: 'fadeInRight', wp3: 'fadeInLeft', wp4: 'fadeInRight',
        wp5: 'fadeInLeft', wp6: 'fadeInRight', wp7: 'fadeInUp'
    };
    $.each(animations, function (cls, effect) {
        $('.' + cls).each(function () {
            var el = $(this);
            el.waypoint(function () {
                el.addClass('animated ' + effect);
            }, {offset: '75%'});
        });
    });

    /***************** WhatsApp group link ******************/
    if (/^https:\/\/chat\.whatsapp\.com\//.test(WHATSAPP_URL)) {
        $('#whatsapp-join').attr('href', WHATSAPP_URL).prop('hidden', false);
        $('#whatsapp-soon').hide();
    }

    /***************** Nav toggle ******************/
    $('.nav-toggle').click(function (event) {
        $(this).toggleClass('active');
        $('.header-nav').toggleClass('open');
        event.preventDefault();
    });
    $('.header-nav li a').click(function () {
        if ($('.header-nav').hasClass('open')) {
            $('.nav-toggle').removeClass('active');
            $('.header-nav').removeClass('open');
        }
    });

    /***************** Header BG on scroll ******************/
    $(window).scroll(function () {
        var scrolled = $(window).scrollTop() >= 20;
        $('section.navigation').toggleClass('fixed', scrolled);
        $('header').css({
            'border-bottom': scrolled ? 'none' : 'solid 1px rgba(255, 255, 255, 0.2)',
            'padding': scrolled ? '35px 0' : '50px 0'
        });
        $('header .member-actions').css({'top': scrolled ? '26px' : '41px'});
        $('header .navicon').css({'top': scrolled ? '34px' : '48px'});
    });

    /***************** Smooth scrolling ******************/
    $('a[href^="#"]:not([href="#"])').click(function () {
        var target = $(this.hash);
        if (target.length) {
            $('html,body').animate({scrollTop: target.offset().top - 90}, 1000);
            return false;
        }
    });

    /***************** Schedule: horizontal day carousel ******************/
    var track = $('.day-track');
    if (track.length) {
        var panels = track.find('.day-panel');
        var current = function () {
            return Math.round(track[0].scrollLeft / track[0].clientWidth);
        };
        var goTo = function (i) {
            i = Math.max(0, Math.min(panels.length - 1, i));
            track[0].scrollTo({left: i * track[0].clientWidth, behavior: 'smooth'});
        };
        var sync = function () {
            var i = current();
            $('.day-dot').removeClass('active').eq(i).addClass('active');
            $('.day-prev').prop('disabled', i === 0);
            $('.day-next').prop('disabled', i === panels.length - 1);
        };
        track.on('scroll', sync);
        $('.day-prev').click(function () { goTo(current() - 1); });
        $('.day-next').click(function () { goTo(current() + 1); });
        $('.day-dot').click(function () { goTo($(this).data('day')); });
        $(document).keydown(function (e) {
            if ($('.modal.in').length) { return; }
            if (e.which === 37) { goTo(current() - 1); }
            if (e.which === 39) { goTo(current() + 1); }
        });
        // Deep links like schedule.html#day-3 open that day
        var jump = function () {
            var m = location.hash.match(/^#day-(\d+)$/);
            if (m) {
                track[0].scrollTo({left: (+m[1] - 1) * track[0].clientWidth, behavior: 'instant'});
                sync();
            }
        };
        jump();
        window.addEventListener('hashchange', jump);
        sync();
    }

    /***************** Add to calendar ******************/
    $('#add-to-cal').html(createCalendar({
        options: {class: '', id: ''},
        data: {
            title: "Andrew and Paige's Wedding",
            start: new Date('Aug 3, 2027 10:00'),
            end: new Date('Aug 7, 2027 00:00'),
            address: 'Bali, Indonesia',
            description: "We can't wait to celebrate with you in Bali!"
        }
    }));

});

function alertMarkup(type, msg) {
    return '<div class="alert alert-' + type + '" role="alert">' + msg +
        '<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span>&times;</span></button></div>';
}
