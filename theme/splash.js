/* theme/splash.js
   Dismisses the boot animation (theme/components/splash.css) once jellyfin has
   rendered its first page, but never before the intro has played.
*/

(function () {
    'use strict';

    var INTRO_MS = 1700; // intro animation length (splash.css)
    var EXIT_MS = 500; // atf-fade-out / atf-zoom-out
    var MAX_MS = 20000; // matches the boot watchdog in debug/error-handler.js
    var dismissed = false;

    function dismiss() {
        var splash = document.getElementById('atf-splash');
        if (dismissed || !splash) return;
        dismissed = true;

        splash.classList.add('atf-splash-done');
        setTimeout(function () {
            if (splash.parentNode) {
                splash.parentNode.removeChild(splash);
            }
        }, EXIT_MS);
    }

    function dismissAfterIntro() {
        // ATFLIX_SPLASH_AT is stamped by an inline script right after the splash markup
        var shownAt = window.ATFLIX_SPLASH_AT || 0;
        setTimeout(dismiss, Math.max(0, shownAt + INTRO_MS - performance.now()));
    }

    document.addEventListener('viewshow', dismissAfterIntro, true);
    setTimeout(dismiss, MAX_MS);
})();
