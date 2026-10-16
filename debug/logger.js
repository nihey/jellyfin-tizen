/* debug/logger.js
   Structured logging utility for AT Flix.
   Maintains a rolling buffer of the last 100 log entries.
   Levels: DEBUG, INFO, WARN, ERROR, FATAL
*/

(function () {
    'use strict';

    var MAX_LOGS = 100;
    var logs = [];

    var LEVELS = {
        DEBUG: 0,
        INFO: 1,
        WARN: 2,
        ERROR: 3,
        FATAL: 4
    };

    var LEVEL_NAMES = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];

    function nowISO() {
        return new Date().toISOString();
    }

    function formatLog(level, module, message, context) {
        var ts = nowISO();
        var ctxStr = context ? '\n  Context: ' + JSON.stringify(context) : '';
        return '[' + ts + '] [' + level + '] [' + module + '] ' + message + ctxStr;
    }

    function log(levelNum, module, message, context) {
        var level = LEVEL_NAMES[levelNum] || 'INFO';
        var entry = {
            timestamp: nowISO(),
            level: level,
            module: module,
            message: message,
            context: context || null
        };

        logs.push(entry);
        if (logs.length > MAX_LOGS) {
            logs.shift();
        }

        // Also mirror to console for development
        var formatted = formatLog(level, module, message, context);
        if (levelNum >= LEVELS.ERROR) {
            console.error(formatted);
        } else if (levelNum === LEVELS.WARN) {
            console.warn(formatted);
        } else {
            console.log(formatted);
        }
    }

    window.JFLogger = {
        debug: function (module, message, context) {
            log(LEVELS.DEBUG, module, message, context);
        },
        info: function (module, message, context) {
            log(LEVELS.INFO, module, message, context);
        },
        warn: function (module, message, context) {
            log(LEVELS.WARN, module, message, context);
        },
        error: function (module, message, context) {
            log(LEVELS.ERROR, module, message, context);
        },
        fatal: function (module, message, context) {
            log(LEVELS.FATAL, module, message, context);
        },
        getLogs: function () {
            return logs.slice();
        },
        clear: function () {
            logs = [];
        },
        getLastN: function (n) {
            return logs.slice(-n);
        }
    };

    window.JFLogger.info('Logger', 'Logger initialized');
})();
