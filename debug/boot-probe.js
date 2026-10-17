/* boot-probe.js
   CSS-safe-mode toggle (press 0 on remote during boot).
   A boot that never renders a page is reported by the watchdog in error-handler.js.
*/

(function () {
    'use strict';

    // Log that we booted
    if (window.console) {
        console.log('[ATFLIX] Boot probe active. Press 0 to disable custom CSS.');
    }

    // Safe-mode toggle: press "0" key during first 5 seconds to disable theme CSS
    var safeMode = false;
    var bootTime = Date.now();

    function disableThemeCss() {
        if (safeMode) return;
        safeMode = true;
        var links = document.querySelectorAll('link[rel="stylesheet"]');
        for (var i = 0; i < links.length; i++) {
            var href = links[i].getAttribute('href') || '';
            if (href.indexOf('theme/') !== -1 && href.indexOf('boot-probe') === -1) {
                links[i].disabled = true;
            }
        }
        var probe = document.createElement('div');
        probe.id = 'atflix-boot-probe';
        probe.textContent = 'SAFE MODE: custom CSS disabled. Reload to re-enable.';
        document.documentElement.appendChild(probe);
        if (window.console) {
            console.log('[ATFLIX] Safe mode activated — theme CSS disabled');
        }
    }

    document.addEventListener('keydown', function (e) {
        if (e.key === '0' || e.keyCode === 48) {
            var elapsed = Date.now() - bootTime;
            if (elapsed < 5000) {
                disableThemeCss();
            }
        }
    });
})();
