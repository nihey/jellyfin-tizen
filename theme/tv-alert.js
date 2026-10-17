/* theme/tv-alert.js
   On Tizen 3-7 jellyfin-web shows alerts with the native alert(): a system popup
   that freezes the app until dismissed (Quick Connect cannot even notice an
   approval while its code is on screen). Replace it with a non-blocking,
   remote-friendly overlay. Other scripts can claim an alert first with
   ATFlixAlert.addInterceptor(fn), where fn(text) returns true if it handled it.
*/

(function () {
    'use strict';

    var BACK_KEYS = [8, 27, 10009]; // Backspace, Escape, Tizen remote Back
    var interceptors = [];
    var queue = [];
    var current = null;
    var previousFocus = null;

    function log(message, context) {
        if (window.JFLogger) {
            window.JFLogger.info('TVAlert', message, context);
        }
    }

    function render(text) {
        var overlay = document.createElement('div');
        overlay.className = 'atf-alert';
        overlay.innerHTML =
            '<div class="atf-alert-box">' +
                '<div class="atf-alert-text"></div>' +
                '<button type="button" class="atf-alert-ok">OK</button>' +
            '</div>';
        overlay.querySelector('.atf-alert-text').textContent = text;
        overlay.querySelector('.atf-alert-ok').addEventListener('click', close);
        document.body.appendChild(overlay);
        current = overlay;
        overlay.querySelector('.atf-alert-ok').focus();
    }

    function close() {
        if (!current) return;
        current.parentNode.removeChild(current);
        current = null;

        if (queue.length) {
            render(queue.shift());
        } else if (previousFocus && previousFocus.focus) {
            previousFocus.focus();
            previousFocus = null;
        }
    }

    // While a popup is open the remote only drives it: OK and Back close it,
    // everything else is swallowed so focus cannot wander behind it.
    window.addEventListener('keydown', function (e) {
        if (!current) return;
        if (e.keyCode === 13 || BACK_KEYS.indexOf(e.keyCode) !== -1) {
            close();
        }
        e.preventDefault();
        e.stopImmediatePropagation();
    }, true);

    window.alert = function (message) {
        var text = message === undefined || message === null ? '' : String(message);

        for (var i = 0; i < interceptors.length; i++) {
            try {
                if (interceptors[i](text) === true) return;
            } catch (e) {
                console.error('[TVAlert] interceptor failed', e);
            }
        }

        log('Alert shown', { text: text });
        if (!document.body) {
            document.addEventListener('DOMContentLoaded', function () {
                window.alert(text);
            });
            return;
        }
        if (current) {
            queue.push(text);
            return;
        }
        previousFocus = document.activeElement;
        render(text);
    };

    window.ATFlixAlert = {
        addInterceptor: function (fn) {
            interceptors.push(fn);
        }
    };
})();
