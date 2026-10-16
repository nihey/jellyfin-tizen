/* debug/debug-overlay.js
   Toggle-able debug overlay triggered by the * (star) key on Samsung remote.
   Shows last 100 logs, focused element info, and basic performance metrics.
*/

(function () {
    'use strict';

    var overlay = null;
    var logsContainer = null;
    var focusedInfo = null;
    var perfInfo = null;
    var isVisible = false;
    var refreshInterval = null;

    function createOverlay() {
        if (overlay) return;

        overlay = document.createElement('div');
        overlay.className = 'jf-debug-overlay hidden';
        overlay.innerHTML =
            '<div class="jf-debug-header">' +
                '<span class="jf-debug-title">Debug Console</span>' +
                '<button class="jf-debug-close">&#10005;</button>' +
            '</div>' +
            '<div class="jf-debug-meta">' +
                '<span class="jf-debug-focused">Focus: none</span>' +
                '<span class="jf-debug-perf" style="margin-left:24px;">Perf: --</span>' +
            '</div>' +
            '<div class="jf-debug-logs"></div>';

        document.body.appendChild(overlay);

        logsContainer = overlay.querySelector('.jf-debug-logs');
        focusedInfo = overlay.querySelector('.jf-debug-focused');
        perfInfo = overlay.querySelector('.jf-debug-perf');

        overlay.querySelector('.jf-debug-close').addEventListener('click', hideOverlay);

        // Prevent remote navigation from escaping the overlay
        overlay.addEventListener('keydown', function (e) {
            if (e.key === 'Back' || e.key === 'Escape' || e.keyCode === 27 || e.keyCode === 10009) {
                e.preventDefault();
                e.stopPropagation();
                hideOverlay();
            }
        });
    }

    function renderLogs() {
        if (!logsContainer || !window.JFLogger) return;

        var entries = window.JFLogger.getLastN(100);
        var html = '';
        for (var i = 0; i < entries.length; i++) {
            var entry = entries[i];
            var levelClass = '';
            if (entry.level === 'ERROR' || entry.level === 'FATAL') levelClass = 'jf-debug-log-error';
            else if (entry.level === 'WARN') levelClass = 'jf-debug-log-warn';
            else if (entry.level === 'DEBUG') levelClass = 'jf-debug-log-debug';

            html += '<div class="jf-debug-log ' + levelClass + '">' +
                '[' + entry.level + '] [' + entry.module + '] ' + entry.message +
                '</div>';
        }
        logsContainer.innerHTML = html;
        logsContainer.scrollTop = logsContainer.scrollHeight;
    }

    function updateFocusedInfo() {
        if (!focusedInfo) return;
        var active = document.activeElement;
        if (active && active !== document.body) {
            var tag = active.tagName.toLowerCase();
            var cls = active.className ? '.' + active.className.split(' ').join('.') : '';
            var id = active.id ? '#' + active.id : '';
            var rect = active.getBoundingClientRect();
            focusedInfo.textContent = 'Focus: ' + tag + id + cls +
                ' | ' + Math.round(rect.left) + ',' + Math.round(rect.top) +
                ' ' + Math.round(rect.width) + 'x' + Math.round(rect.height);
        } else {
            focusedInfo.textContent = 'Focus: none';
        }
    }

    function updatePerfInfo() {
        if (!perfInfo) return;
        var mem = performance && performance.memory ?
            'Heap: ' + Math.round(performance.memory.usedJSHeapSize / 1048576) + 'MB' : '';
        var timing = 'Nav: ' + (performance && performance.timing ?
            (performance.timing.loadEventEnd - performance.timing.navigationStart) + 'ms' : '--');
        perfInfo.textContent = 'Perf: ' + timing + (mem ? ' | ' + mem : '');
    }

    function showOverlay() {
        if (!overlay) createOverlay();
        if (!overlay) return;
        overlay.classList.remove('hidden');
        isVisible = true;
        renderLogs();
        updateFocusedInfo();
        updatePerfInfo();

        if (refreshInterval) clearInterval(refreshInterval);
        refreshInterval = setInterval(function () {
            renderLogs();
            updateFocusedInfo();
            updatePerfInfo();
        }, 500);

        if (window.JFLogger) {
            window.JFLogger.info('DebugOverlay', 'Overlay opened');
        }
    }

    function hideOverlay() {
        if (!overlay) return;
        overlay.classList.add('hidden');
        isVisible = false;
        if (refreshInterval) {
            clearInterval(refreshInterval);
            refreshInterval = null;
        }
        if (window.JFLogger) {
            window.JFLogger.info('DebugOverlay', 'Overlay closed');
        }
    }

    function toggleOverlay() {
        if (isVisible) hideOverlay();
        else showOverlay();
    }

    window.JFDebugOverlay = {
        show: showOverlay,
        hide: hideOverlay,
        toggle: toggleOverlay
    };

    // Hook star key via tizen.tvinputdevice in tizen.js
    // We also add a fallback key listener for debugging on emulator/browser
    document.addEventListener('keydown', function (e) {
        // Star key keyCode varies by device; common values:
        // Tizen star key = 170 (or 56 with shift)
        // We also support F12 for desktop debugging
        if (e.key === '*' || e.keyCode === 170 || e.keyCode === 56 && e.shiftKey || e.keyCode === 123) {
            e.preventDefault();
            toggleOverlay();
        }
    });

    if (window.JFLogger) {
        window.JFLogger.info('DebugOverlay', 'Debug overlay initialized (* key to toggle)');
    }
})();
