/* theme/login.js
   Sign-in screen: Quick Connect code on the left, password form on the right.

   It drives jellyfin-web's own Quick Connect button (so jellyfin keeps doing the
   polling and the actual login) and reads the code from the alert jellyfin shows
   it in (see theme/tv-alert.js). If the server has Quick Connect off, only the
   password form is shown.
*/

(function () {
    'use strict';

    var QC_POLL_MS = 5000; // jellyfin-web polls the Quick Connect status every 5s
    var MIN_CODE_LIFETIME_MS = 30000; // renew an expired code only if it lived this long
    var QC_END_ALERT_MS = 3000; // jellyfin alerts right after it stops polling on failure

    var STRINGS = {
        en: {
            phoneTitle: 'Sign in with your phone',
            phoneHint: 'On your phone or computer, open Jellyfin → Settings → Quick Connect and enter:',
            starting: 'Getting a code…',
            waiting: 'Waiting for approval…',
            renewing: 'The code expired, getting a new one…',
            or: 'or',
            passwordTitle: 'Sign in with password'
        },
        pt: {
            phoneTitle: 'Entrar com o celular',
            phoneHint: 'No celular ou computador, abra o Jellyfin → Configurações → Conexão Rápida e digite:',
            starting: 'Gerando código…',
            waiting: 'Aguardando aprovação…',
            renewing: 'O código expirou, gerando outro…',
            or: 'ou',
            passwordTitle: 'Entrar com senha'
        }
    };

    // state: idle → requested (button clicked) → code (code on screen)
    var qc = { page: null, state: 'idle', codeAt: 0, pollEndedAt: 0, pollTimers: [], observer: null };

    function strings() {
        var lang = (document.documentElement.getAttribute('lang') || navigator.language || 'en').toLowerCase();
        return STRINGS[lang.split('-')[0]] || STRINGS.en;
    }

    function log(message, context) {
        if (window.JFLogger) {
            window.JFLogger.info('Login', message, context);
        }
    }

    // Remember jellyfin's Quick Connect polling timers so they can be stopped when
    // the user signs in with a password or leaves; otherwise the abandoned code
    // expires minutes later and jellyfin pops an error over whatever is on screen.
    var nativeSetInterval = window.setInterval;
    var nativeClearInterval = window.clearInterval;
    window.setInterval = function (fn, delay) {
        var id = nativeSetInterval.apply(window, arguments);
        if (qc.state === 'requested' && delay === QC_POLL_MS) {
            qc.pollTimers.push(id);
        }
        return id;
    };

    // jellyfin clears its polling timer itself when the code is approved, expires
    // or fails; only an alert right after that is about Quick Connect
    window.clearInterval = function (id) {
        var index = qc.pollTimers.indexOf(id);
        if (index !== -1) {
            qc.pollTimers.splice(index, 1);
            qc.pollEndedAt = Date.now();
        }
        return nativeClearInterval.apply(window, arguments);
    };

    function stopPolling() {
        var timers = qc.pollTimers;
        qc.pollTimers = [];
        for (var i = 0; i < timers.length; i++) {
            nativeClearInterval(timers[i]);
        }
    }

    function enhance(page) {
        if (page.classList.contains('atf-login')) return;

        var s = strings();
        var content = page.firstElementChild;
        page.classList.add('atf-login');

        var columns = document.createElement('div');
        columns.className = 'atf-login-columns';
        columns.innerHTML =
            '<div class="atf-qc hide">' +
                '<h2 class="atf-login-title atf-qc-title"></h2>' +
                '<p class="atf-qc-hint"></p>' +
                '<div class="atf-qc-code"></div>' +
                '<div class="atf-qc-status"><span class="atf-qc-dot"></span><span class="atf-qc-status-text"></span></div>' +
            '</div>' +
            '<div class="atf-login-divider hide"><span></span></div>' +
            '<div class="atf-login-password"><h2 class="atf-login-title atf-password-title"></h2></div>';
        columns.querySelector('.atf-qc-title').textContent = s.phoneTitle;
        columns.querySelector('.atf-qc-hint').textContent = s.phoneHint;
        columns.querySelector('.atf-login-divider span').textContent = s.or;
        columns.querySelector('.atf-password-title').textContent = s.passwordTitle;

        // jellyfin looks its elements up with view.querySelector, so moving them is safe
        var passwordColumn = columns.querySelector('.atf-login-password');
        while (content.firstChild) {
            passwordColumn.appendChild(content.firstChild);
        }
        content.appendChild(columns);
    }

    function setQuickConnectVisible(visible) {
        if (!qc.page) return;
        qc.page.querySelector('.atf-qc').classList.toggle('hide', !visible);
        qc.page.querySelector('.atf-login-divider').classList.toggle('hide', !visible);
    }

    function setStatus(text) {
        if (qc.page) {
            qc.page.querySelector('.atf-qc-status-text').textContent = text;
        }
    }

    function showCode(code) {
        var box = qc.page.querySelector('.atf-qc-code');
        box.innerHTML = '';
        for (var i = 0; i < code.length; i++) {
            if (i === 3) {
                var gap = document.createElement('span');
                gap.className = 'atf-qc-gap';
                box.appendChild(gap);
            }
            var digit = document.createElement('span');
            digit.textContent = code.charAt(i);
            box.appendChild(digit);
        }
        setStatus(strings().waiting);
        setQuickConnectVisible(true);
    }

    function requestCode() {
        var button = qc.page && qc.page.querySelector('.btnQuick');
        if (!button || button.classList.contains('hide')) return;

        stopPolling();
        qc.state = 'requested';
        setStatus(strings().starting);
        log('Requesting a Quick Connect code');
        button.click();
    }

    // jellyfin un-hides its Quick Connect button once the server says it is enabled
    function startWhenEnabled(page) {
        var button = page.querySelector('.btnQuick');
        if (!button) return;
        if (!button.classList.contains('hide')) {
            requestCode();
            return;
        }
        qc.observer = new MutationObserver(function () {
            if (button.classList.contains('hide')) return;
            qc.observer.disconnect();
            qc.observer = null;
            if (qc.page === page && qc.state === 'idle') {
                requestCode();
            }
        });
        qc.observer.observe(button, { attributes: true, attributeFilter: ['class'] });
    }

    window.ATFlixAlert.addInterceptor(function (text) {
        if (!qc.page || qc.state === 'idle') return false;

        var match = /\b(\d{6})\b/.exec(text);
        if (qc.state === 'requested' && match) {
            qc.state = 'code';
            qc.codeAt = Date.now();
            log('Quick Connect code shown');
            showCode(match[1]);
            return true;
        }

        if (qc.state === 'requested') {
            // Initiating failed: fall back to the password form only
            log('Quick Connect unavailable', { message: text });
            qc.state = 'idle';
            setQuickConnectVisible(false);
            return true;
        }

        if (Date.now() - qc.pollEndedAt > QC_END_ALERT_MS) {
            return false; // unrelated alert, e.g. after a password attempt
        }

        // Polling stopped: the code expired or Quick Connect was turned off
        log('Quick Connect code ended', { message: text });
        stopPolling();
        qc.state = 'idle';
        if (Date.now() - qc.codeAt > MIN_CODE_LIFETIME_MS) {
            setStatus(strings().renewing);
            setTimeout(requestCode, 1000);
        } else {
            setQuickConnectVisible(false);
        }
        return true;
    });

    document.addEventListener('viewshow', function (e) {
        var page = e.target;
        if (!page || page.id !== 'loginPage') return;

        enhance(page);
        qc.page = page;
        qc.state = 'idle';
        startWhenEnabled(page);
    }, true);

    document.addEventListener('viewhide', function (e) {
        if (!qc.page || e.target !== qc.page) return;

        stopPolling();
        if (qc.observer) {
            qc.observer.disconnect();
            qc.observer = null;
        }
        qc.page = null;
        qc.state = 'idle';
    }, true);
})();
