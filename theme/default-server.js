/* theme/default-server.js
   Preloads a Jellyfin server on a fresh install, so the app opens on its
   sign-in screen. The server comes from the local build config
   (atflix.config.json or ATFLIX_DEFAULT_SERVER, never committed), injected by
   the build into window.ATFLIX_LOCAL_CONFIG. A server the user already added
   is left alone.
*/

(function () {
    'use strict';

    var CREDENTIALS_KEY = 'jellyfin_credentials'; // jellyfin-apiclient storage key
    var MANUAL_CONNECTION = 2; // jellyfin-apiclient ConnectionMode.Manual
    var server = (window.ATFLIX_LOCAL_CONFIG || {}).defaultServer;

    if (!server || !server.Id) return;

    try {
        var credentials = JSON.parse(localStorage.getItem(CREDENTIALS_KEY) || '{}');
        if (credentials.Servers && credentials.Servers.length) return;

        credentials.Servers = [{
            Id: server.Id,
            Name: server.Name,
            ManualAddress: server.ManualAddress,
            LastConnectionMode: MANUAL_CONNECTION,
            DateLastAccessed: Date.now()
        }];
        localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(credentials));

        if (window.JFLogger) {
            window.JFLogger.info('DefaultServer', 'Preloaded server ' + server.Name);
        }
    } catch (e) {
        // localStorage may be unavailable; the user can still add the server
    }
})();
