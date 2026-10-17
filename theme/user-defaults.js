/* theme/user-defaults.js
   AT Flix defaults for per-user jellyfin-web settings. Each is applied only
   while the user has not chosen a value (Settings → Display).
*/

(function () {
    'use strict';

    var DEFAULTS = {
        // Item art behind library and detail pages (jellyfin's default is off)
        enableBackdrops: 'true'
    };

    document.addEventListener('viewshow', function () {
        var apiClient = window.ApiClient;
        var userId = apiClient && apiClient.getCurrentUserId && apiClient.getCurrentUserId();
        if (!userId) return;

        for (var name in DEFAULTS) {
            if (!DEFAULTS.hasOwnProperty(name)) continue;
            var key = userId + '-' + name; // jellyfin-web appSettings key format
            try {
                if (localStorage.getItem(key) === null) {
                    localStorage.setItem(key, DEFAULTS[name]);
                    if (window.JFLogger) {
                        window.JFLogger.info('UserDefaults', 'Applied default ' + name + '=' + DEFAULTS[name]);
                    }
                }
            } catch (e) {
                // localStorage may be unavailable
            }
        }
    }, true);
})();
