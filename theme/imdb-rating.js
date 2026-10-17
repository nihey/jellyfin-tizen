/* theme/imdb-rating.js
   IMDb rating badge on detail pages, from OMDb. The API key comes from the
   local build config (atflix.config.json "omdbApiKey" or ATFLIX_OMDB_API_KEY,
   never committed); without it nothing is shown. Ratings are cached for a week
   to stay well inside OMDb's free daily quota.
*/

(function () {
    'use strict';

    var apiKey = (window.ATFLIX_LOCAL_CONFIG || {}).omdbApiKey;
    if (!apiKey) return;

    var CACHE_PREFIX = 'atflix-imdb-';
    var CACHE_MS = 7 * 24 * 60 * 60 * 1000;
    var current = { page: null, itemId: null, rating: null };

    function log(message, context) {
        if (window.JFLogger) {
            window.JFLogger.info('IMDb', message, context);
        }
    }

    function readCache(imdbId) {
        try {
            var entry = JSON.parse(localStorage.getItem(CACHE_PREFIX + imdbId) || 'null');
            if (entry && Date.now() - entry.at < CACHE_MS) return entry;
        } catch (e) {
            // localStorage may be unavailable
        }
        return null;
    }

    function fetchRating(imdbId) {
        var hit = readCache(imdbId);
        if (hit) return Promise.resolve(hit);

        var url = 'https://www.omdbapi.com/?i=' + encodeURIComponent(imdbId) + '&apikey=' + encodeURIComponent(apiKey);
        return fetch(url).then(function (response) {
            return response.json();
        }).then(function (data) {
            if (data.Response !== 'True') {
                throw new Error(data.Error || 'OMDb lookup failed');
            }
            var entry = {
                rating: data.imdbRating && data.imdbRating !== 'N/A' ? data.imdbRating : null,
                at: Date.now()
            };
            try {
                localStorage.setItem(CACHE_PREFIX + imdbId, JSON.stringify(entry));
            } catch (e) {
                // localStorage may be unavailable
            }
            return entry;
        });
    }

    // jellyfin re-renders the info line (year, runtime, ratings) on every refresh
    function render() {
        if (!current.page || !current.rating) return;
        var info = current.page.querySelector('.itemMiscInfo-primary');
        if (!info || !info.children.length || info.querySelector('.atf-imdb')) return;

        var badge = document.createElement('div');
        badge.className = 'mediaInfoItem atf-imdb';
        badge.innerHTML = '<span class="atf-imdb-logo">IMDb</span><span class="atf-imdb-score"></span>';
        badge.querySelector('.atf-imdb-score').textContent = current.rating;
        info.insertBefore(badge, info.querySelector('.starRatingContainer'));
    }

    function itemIdFromUrl() {
        var match = /[?&]id=([0-9a-f]+)/i.exec(location.hash);
        return match ? match[1] : null;
    }

    document.addEventListener('viewshow', function (e) {
        var page = e.target;
        if (!page || !page.classList || !page.classList.contains('itemDetailPage')) return;

        var apiClient = window.ApiClient;
        var itemId = itemIdFromUrl();
        if (!apiClient || !itemId) return;

        current.page = page;
        current.itemId = itemId;
        current.rating = null;

        if (!page.atfImdbObserver) {
            var info = page.querySelector('.itemMiscInfo-primary');
            if (info) {
                page.atfImdbObserver = new MutationObserver(render);
                page.atfImdbObserver.observe(info, { childList: true });
            }
        }

        apiClient.getItem(apiClient.getCurrentUserId(), itemId).then(function (item) {
            var imdbId = item.ProviderIds && item.ProviderIds.Imdb;
            return imdbId ? fetchRating(imdbId) : null;
        }).then(function (entry) {
            if (!entry || current.itemId !== itemId) return;
            current.rating = entry.rating;
            render();
        }).catch(function (err) {
            log('IMDb rating unavailable', { itemId: itemId, error: err && err.message });
        });
    }, true);
})();
