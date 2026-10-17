/* boot-probe.js
   Injects a visible probe element immediately to confirm JS is executing.
   Also adds a CSS-safe-mode toggle (press 0 on remote during boot).
*/

(function () {
    'use strict';

    // Inject probe element
    var probe = document.createElement('div');
    probe.id = 'atflix-boot-probe';
    probe.textContent = 'AT Flix booting...';
    document.documentElement.appendChild(probe);

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
        probe.textContent = 'SAFE MODE: custom CSS disabled. Reload to re-enable.';
        probe.style.background = '#ffaa00';
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

    // Hide probe after 3 seconds if app seems to be loading
    setTimeout(function () {
        if (!safeMode) {
            probe.classList.add('hidden');
        }
    }, 3000);

    // Global safety: if body stays black for 10 seconds, show warning
    setTimeout(function () {
        if (!safeMode) {
            var bodyBg = window.getComputedStyle(document.body).backgroundColor;
            var hasContent = document.body.innerHTML.length > 500;
            if (!hasContent) {
                probe.classList.remove('hidden');
                probe.textContent = 'WARNING: No content detected. Press 0 to disable theme CSS.';
                probe.style.background = '#ffaa00';
                if (window.console) {
                    console.warn('[ATFLIX] No content detected after 10s — possible CSS blocking issue');
                }
            }
        }
    }, 10000);
})();
