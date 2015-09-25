// Polyfills the `orientationchange` event.
// Exposes Touch, OS, HD and Orientation properties on `Mobify.config`.
// x-desktop, x-ios, x-android, x-blackberry, x-webos, x-nokia
// x-notouch, x-touch
// x-landscape, x-portrait
// x-sd, x-hd x-hd15 x-hd20
//
// TODO: Windows Phone
// http://windowsteamblog.com/windows_phone/b/wpdev/archive/2011/03/22/targeting-mobile-optimized-css-at-windows-phone-7.aspx
(function(window, document, $) {

// ###
// # Orientation
// ###

// Android `orientation` support is broken.
$.support.orientation = 'orientation' in window && 'onorientationchange' in window
    && !/android/i.test(navigator.userAgent);

var prevWidth
  , prevOrientation
    // Returns 'landscape' or 'portrait' based on the current orientation.
    getOrientation = function() {
        var docEl = document.documentElement;
        return ($.support.orientation
                    // 0 in portrait, 1 in landscape
                    ? orientation % 180 
                    // false in portrait, true in landscape
                    : docEl.clientWidth > docEl.clientHeight)
                ? 'landscape'
                : 'portrait';
    }

    // Some Android browsers (HTC Sensation) don't update widths immediately,
    // so wait to trigger the event.
  , orientationHandler = function() {
        function triggerEvent() {
            var width = document.documentElement.clientWidth
              , orientation;

            if (width == prevWidth) {
                return setTimeout(triggerEvent, 250);
            }

            prevWidth = width;
            
            orientation = getOrientation();
            if (orientation != prevOrientation) {
                prevOrientation = orientation;
                $(window).trigger('orientationchange');
            }
        }

        triggerEvent();
    }

// Polyfill `orientationchange` event.
$.event.special.orientationchange = {
    setup: function() {
        if ($.support.orientation) return false;
        $(window).bind('resize', orientationHandler);
    },
    teardown: function() {
        if ($.support.orientation) return false;
        $(window).unbind('resize', orientationHandler);
    },
    add: function(handleObj) {
        var handler = handleObj.handler;
        handleObj.handler = function(e) {
            e.orientation = getOrientation();
            return handler.apply(this, arguments);
        };
    }
}

// ###
// # Device Properties
// ###

var $test = $('<div>', {id: 'mc-test'})
  , style = $test[0].style

    // Touch:
  , touch = 'ontouchend' in document

    // OS: ios, android, nokia, blackberry, webos, desktop
  , osMatch = /(ip(od|ad|hone)|android|nokia|blackberry|webos)/gi.exec(navigator.userAgent)
  , os = (osMatch && (osMatch[2] ? 'ios' : osMatch[1].toLowerCase())) || 'desktop'

    // Device Pixel Ratio: 1, 1.5, 2.0
  , dpr = 1
  , q = [
        'screen and (-webkit-min-device-pixel-ratio:1.5)', 
        'screen and (-webkit-min-device-pixel-ratio:2)',
    ];

// Use `devicePixelRatio` if available, falling back to querying using
// `matchMedia` or manual media queries.
if ('devicePixelRatio' in window) {
    dpr = devicePixelRatio
} else if (window.matchMedia) {
    dpr = (matchMedia(q[1]).matches && 2) || (matchMedia(q[0]).matches && 1.5);
} else {
    var testHTML = '<style>'
            + '@media ' + q[0] + '{#mc-test{color:red}}'
            + '@media ' + q[1] + '{#mc-test{color:blue}}'
            + '</style>'
      , color
      , m;
    
    $test.hide().html(testHTML).appendTo(document.documentElement);

    color = $test.css('color');

    $test.remove();

    // red  - rgb(255,0,0) - q[0] - 1.5
    // blue - rgb(0,0,255) - q[1] - 2.0
    if (m = /255(\))?/gi.exec(color)) {
        dpr = (m[1] && 2) || 1.5;
    }
}


// ###
// # Mobify.config
// ###

// Expose Touch, OS, HD and Orientation properties on `Mobify.config` for
// use in templating.

var config = Mobify.config;
config.os = os;
config.touch = touch;
config.orientation = getOrientation();

if (dpr > 1) {
    config.HD = '@2x';
    config.pixelRatio = dpr;
} else {
    config.HD = '';
}

// ###
// # Mobify.enhance
// ###

// Update orientation class on `orientationchange`.
// Add classes for Touch, OS, HD and Orientation to the HTML element.
// .os
// .orientation
// .touch or .no-touch

// ???
// .sd or .hd .hd15 .hd2
// .dpr1 .dpr15 .dpr2
Mobify.enhance = function() {
    
    var prevOrientation = getOrientation()
      , classes = [os, (!touch ? 'no' : '') + 'touch', prevOrientation];

    if (dpr > 1) {
        classes.push('hd' + (dpr + '').replace(/[^\w]/, ''), 'hd');
    } else {
        classes.push('sd');
    }

    $('html').addClass('x-' + classes.join(' x-'));

    $(window).bind('orientationchange', function() {
        var orientation = getOrientation();
        $('html').removeClass('x-' + prevOrientation).addClass('x-' + orientation);
        prevOrientation = orientation;
    })
};

})(this, document, Mobify.$);