/* theme/theme-bridge.js
   Reads user theme customization from localStorage and applies CSS custom properties
   to the :root element at runtime. This runs before jellyfin-web loads.
*/

(function () {
    'use strict';

    var STORAGE_KEY = 'at-flix-theme';
    var DEFAULT_THEME = {
        'bg-primary': '#0a0a0f',
        'bg-surface': '#141419',
        'text-primary': '#ffffff',
        'text-secondary': '#a0a0b0',
        'accent-color': '#e50914',
        'card-radius': '6px',
        'focus-scale': '1.08',
        'animation-speed': '1.0',
        'grid-density': 'comfortable'
    };

    function loadTheme() {
        var saved = null;
        try {
            saved = localStorage.getItem(STORAGE_KEY);
        } catch (e) {
            // localStorage may be unavailable
        }

        var theme = DEFAULT_THEME;
        if (saved) {
            try {
                var parsed = JSON.parse(saved);
                // Merge over defaults
                for (var key in parsed) {
                    if (parsed.hasOwnProperty(key)) {
                        theme[key] = parsed[key];
                    }
                }
            } catch (e) {
                // Invalid JSON, use defaults
            }
        }

        return theme;
    }

    function applyTheme(theme) {
        var root = document.documentElement;
        if (!root) return;

        for (var key in theme) {
            if (!theme.hasOwnProperty(key)) continue;
            var varName = '--' + key;
            var value = theme[key];
            root.style.setProperty(varName, value);
        }

        // Apply grid density as data attribute for CSS selectors
        if (theme['grid-density']) {
            root.setAttribute('data-grid-density', theme['grid-density']);
        }
    }

    function saveTheme(theme) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
        } catch (e) {
            // localStorage may be unavailable
        }
    }

    // Expose API for settings UI
    window.JFTheme = {
        get: function (key) {
            var theme = loadTheme();
            return theme[key];
        },
        set: function (key, value) {
            var theme = loadTheme();
            theme[key] = value;
            saveTheme(theme);
            applyTheme(theme);
        },
        reset: function () {
            saveTheme(DEFAULT_THEME);
            applyTheme(DEFAULT_THEME);
        },
        getAll: loadTheme,
        apply: applyTheme
    };

    // Apply immediately on load
    var current = loadTheme();
    applyTheme(current);

    if (window.JFLogger) {
        window.JFLogger.info('ThemeBridge', 'Theme applied', current);
    }
})();
