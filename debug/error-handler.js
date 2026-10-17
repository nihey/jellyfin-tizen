/* debug/error-handler.js
   Global error capture and explicit error UI.
   Hooks window.onerror and unhandled promise rejections and logs them (see the
   debug overlay, * key). jellyfin-web raises many non-fatal ones on the TV's
   older Chromium (e.g. MediaSession 'seekto' is unsupported on Tizen 6), so the
   full-screen error page with retry + details is reserved for a boot that
   never renders a page.
*/

(function () {
    'use strict';

    var BOOT_TIMEOUT_MS = 20000;

    var ERROR_CODES = {
        NETWORK_TIMEOUT: 'E1001',
        NETWORK_ERROR: 'E1002',
        SERVER_ERROR: 'E2001',
        BOOT_FAILURE: 'E3001',
        UNKNOWN_ERROR: 'E9000',
        PROMISE_REJECTION: 'E9001'
    };

    function getErrorCode(error) {
        if (!error) return ERROR_CODES.UNKNOWN_ERROR;
        if (error.atflixCode) return error.atflixCode;
        var msg = (error.message || String(error)).toLowerCase();
        if (msg.indexOf('timeout') !== -1) return ERROR_CODES.NETWORK_TIMEOUT;
        if (msg.indexOf('network') !== -1 || msg.indexOf('fetch') !== -1) return ERROR_CODES.NETWORK_ERROR;
        if (msg.indexOf('server') !== -1 || msg.indexOf('500') !== -1) return ERROR_CODES.SERVER_ERROR;
        return ERROR_CODES.UNKNOWN_ERROR;
    }

    function getFriendlyMessage(error) {
        if (!error) return 'An unexpected error occurred.';
        var msg = error.message || String(error);
        if (msg.indexOf('timeout') !== -1) return 'The request timed out. Please check your connection and try again.';
        if (msg.indexOf('network') !== -1) return 'Network error. Please check your internet connection.';
        if (msg.indexOf('server') !== -1) return 'Server error. Please try again later.';
        return 'Something went wrong. Please try again.';
    }

    function showErrorScreen(error, context) {
        if (!window.JFLogger) {
            console.error('Error handler loaded before logger:', error);
            return;
        }

        var code = getErrorCode(error);
        var friendly = getFriendlyMessage(error);
        var stack = error && error.stack ? error.stack : 'No stack trace available.';

        window.JFLogger.error('ErrorHandler', code + ': ' + friendly, {
            originalError: error ? error.message || String(error) : 'unknown',
            stack: stack,
            context: context || null
        });

        // Remove existing error screen
        var existing = document.querySelector('.jf-error-screen');
        if (existing) existing.remove();

        var screen = document.createElement('div');
        screen.className = 'jf-error-screen';
        screen.innerHTML =
            '<div class="jf-error-code">Error ' + code + '</div>' +
            '<div class="jf-error-title">Oops!</div>' +
            '<div class="jf-error-message">' + friendly + '</div>' +
            '<div class="jf-error-actions">' +
                '<button class="jf-error-retry emby-button">Retry</button>' +
                '<button class="jf-error-details-btn emby-button">Show Details</button>' +
            '</div>' +
            '<pre class="jf-error-details"></pre>';

        document.body.appendChild(screen);

        var detailsPre = screen.querySelector('.jf-error-details');
        detailsPre.textContent = 'Error: ' + (error ? error.message || String(error) : 'unknown') + '\n\n' + stack +
            (context ? '\n\nContext: ' + JSON.stringify(context, null, 2) : '');

        screen.querySelector('.jf-error-retry').addEventListener('click', function () {
            screen.remove();
            window.location.reload();
        });

        screen.querySelector('.jf-error-details-btn').addEventListener('click', function () {
            detailsPre.classList.toggle('visible');
        });

        // Auto-focus retry button for remote
        setTimeout(function () {
            var retryBtn = screen.querySelector('.jf-error-retry');
            if (retryBtn && retryBtn.focus) retryBtn.focus();
        }, 100);
    }

    function showToast(message, type) {
        type = type || 'info';
        if (!window.JFLogger) return;
        window.JFLogger.warn('ErrorHandler', 'Toast: ' + message, { type: type });

        var container = document.querySelector('.jf-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'jf-toast-container';
            document.body.appendChild(container);
        }

        var toast = document.createElement('div');
        toast.className = 'jf-toast jf-toast-' + type + ' jf-toast-enter';
        toast.textContent = message;
        container.appendChild(toast);

        setTimeout(function () {
            toast.classList.remove('jf-toast-enter');
            toast.classList.add('jf-toast-exit');
            setTimeout(function () {
                toast.remove();
            }, 250);
        }, 5000);
    }

    window.JFErrorHandler = {
        showError: showErrorScreen,
        showToast: showToast,
        getErrorCode: getErrorCode
    };

    function logError(error, context) {
        var message = error ? error.message || String(error) : 'unknown';
        if (!window.JFLogger) {
            console.error('Error handler loaded before logger:', error);
            return;
        }
        window.JFLogger.error('ErrorHandler', getErrorCode(error) + ': ' + message, {
            stack: error && error.stack ? error.stack : null,
            context: context || null
        });
    }

    function hasRenderedPage() {
        return !!document.querySelector('.mainAnimatedPage, .page');
    }

    // Hook global errors: log only, they are usually not fatal
    window.onerror = function (message, source, lineno, colno, error) {
        logError(error || new Error(message), { source: source, line: lineno, col: colno });
        return true; // already mirrored to console by the logger
    };

    window.addEventListener('unhandledrejection', function (event) {
        logError(event.reason || new Error('Unhandled promise rejection'), { type: 'unhandledrejection' });
    });

    // Boot watchdog: if jellyfin-web never renders a page, show the full-screen error
    setTimeout(function () {
        if (hasRenderedPage()) return;

        var error = new Error('AT Flix did not finish loading after ' + (BOOT_TIMEOUT_MS / 1000) + 's (no page was rendered).');
        error.atflixCode = ERROR_CODES.BOOT_FAILURE;
        var recentErrors = window.JFLogger ? window.JFLogger.getLogs().filter(function (entry) {
            return entry.level === 'ERROR' || entry.level === 'FATAL';
        }).map(function (entry) {
            return entry.message;
        }) : [];
        showErrorScreen(error, { recentErrors: recentErrors });
    }, BOOT_TIMEOUT_MS);

    if (window.JFLogger) {
        window.JFLogger.info('ErrorHandler', 'Error handler initialized');
    }
})();
