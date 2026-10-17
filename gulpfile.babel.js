import fs from 'fs';
import gulp from 'gulp';
import gulpif from 'gulp-if';
import { deleteAsync as del } from 'del';
import dom from 'gulp-dom';
import path from 'path';
import scan from 'gulp-scan';
import { Transform } from 'stream';

// Allow overriding of jellyfin-web directory
let WEB_DIR = process.env.JELLYFIN_WEB_DIR || 'node_modules/jellyfin-web/dist';
WEB_DIR = path.resolve(WEB_DIR);
console.info('Using jellyfin-web from', WEB_DIR);

const DISCARD_UNUSED_FONTS = !!process.env.DISCARD_UNUSED_FONTS;

const paths = {
    assets: {
        src: [
            WEB_DIR + '/**/*',
            '!' + WEB_DIR + '/index.html'
        ],
        dest: 'www/'
    },
    index: {
        src: WEB_DIR + '/index.html',
        dest: 'www/'
    }
};

// Clean the www directory
function clean() {
    return del([
        'www'
    ]);
}

// Search for used fonts and add them to assets
function searchFonts() {
    if (!DISCARD_UNUSED_FONTS) return Promise.resolve('skipped');

    const assets = paths.assets.src;

    assets.push('!' + WEB_DIR + '/*.woff2');

    return gulp.src(WEB_DIR + '/main*.js')
        .pipe(scan({
            term: /[a-z0-9._-]*\.woff2/gi,
            fn: function (match) {
                const font = WEB_DIR + '/' + match;
                if (!assets.includes(font) && fs.existsSync(font)) {
                    console.debug(`Found font ${match}`);
                    assets.push(font);
                }
            }
        }));
}

// jellyfin-web's accent blue -> AT Flix accent variables (theme/variables.css)
const ACCENT_COLORS = [
    [/#00a4d[bc]\b/gi, 'var(--accent-color, #e50914)'],
    [/#0cb0e8\b/gi, 'var(--accent-hover, #f6121d)'],
    [/#44bae1\b/gi, 'var(--accent-light, #ff4d55)'],
    [/#007ea8\b/gi, 'var(--accent-dark, #b20710)'],
    [/#(00455c|1c4c5c)\b/gi, 'var(--accent-darker, #5c0409)'],
    [/rgba\(\s*0\s*,\s*164\s*,\s*220\s*,\s*([\d.]+)\s*\)/gi, 'rgba(229, 9, 20, $1)']
];

// Recolor jellyfin-web CSS; other selectable themes keep their own palettes
function recolorCss() {
    return new Transform({
        objectMode: true,
        transform(file, encoding, callback) {
            const relative = file.relative.split(path.sep).join('/');
            const otherTheme = relative.startsWith('themes/') && !relative.startsWith('themes/dark/');
            if (file.isBuffer() && file.extname === '.css' && !otherTheme) {
                let css = file.contents.toString('utf8');
                for (const [pattern, replacement] of ACCENT_COLORS) {
                    css = css.replace(pattern, replacement);
                }
                file.contents = Buffer.from(css, 'utf8');
            }
            callback(null, file);
        }
    });
}

// Copy jellyfin-web assets (CSS recolored)
function copy() {
    return gulp.src(paths.assets.src, { encoding: false })
        .pipe(recolorCss())
        .pipe(gulp.dest(paths.assets.dest));
}

// Copy theme and debug assets
function copyLocalAssets() {
    return gulp.src(['theme/**/*', 'debug/**/*'], { encoding: false, base: '.' })
        .pipe(gulp.dest(paths.assets.dest));
}

// Add required tags to index.html
function modifyIndex() {
    return gulp.src(paths.index.src)
        .pipe(dom(function() {
            // inject boot-probe CSS FIRST (so we can see if app is loading)
            const bootProbeCss = 'theme/boot-probe.css';
            if (fs.existsSync(bootProbeCss)) {
                const bootProbeLink = this.createElement('link');
                bootProbeLink.setAttribute('rel', 'stylesheet');
                bootProbeLink.setAttribute('href', bootProbeCss);
                this.head.insertBefore(bootProbeLink, this.head.firstChild);
                console.debug('Injected boot-probe CSS');
            }

            // inject CSP meta tag
            const meta = this.createElement('meta');
            meta.setAttribute('http-equiv', 'Content-Security-Policy');
            meta.setAttribute('content', 'default-src * \'self\' \'unsafe-inline\' \'unsafe-eval\' data: gap: file: filesystem: ws: wss:;');
            this.head.appendChild(meta);

            // inject theme CSS files
            const themeCss = [
                'theme/variables.css',
                'theme/fonts.css',
                'theme/animations.css',
                'theme/cinematic.css',
                'theme/components/cards.css',
                'theme/components/navigation.css',
                'theme/components/detail.css',
                'theme/components/overlays.css',
                'theme/components/login.css'
            ];
            themeCss.forEach((cssPath) => {
                if (fs.existsSync(cssPath)) {
                    const link = this.createElement('link');
                    link.setAttribute('rel', 'stylesheet');
                    link.setAttribute('href', cssPath);
                    this.head.appendChild(link);
                    console.debug('Injected theme CSS:', cssPath);
                } else {
                    console.warn('Theme CSS not found:', cssPath);
                }
            });

            // Search for injected main.bundle
            let apploader = this.querySelector('script[src^=main]');

            if (apploader) {
                console.debug('Found injected main.bundle');
                apploader.setAttribute('defer', '');
            } else {
                // Search for injected apploader
                apploader = this.body.querySelector('script[src*="apploader"]');

                if (apploader) {
                    console.debug('Found injected apploader');
                    apploader.setAttribute('defer', '');
                } else {
                    console.debug('Inject apploader');

                    // inject apploader.js
                    apploader = this.createElement('script');
                    apploader.setAttribute('src', 'scripts/apploader.js');
                    apploader.setAttribute('defer', '');
                    this.body.appendChild(apploader);
                }
            }

            const injectTarget = apploader.parentNode;

            // inject boot-probe JS FIRST (to diagnose black-screen issues)
            const bootProbeJs = 'debug/boot-probe.js';
            if (fs.existsSync(bootProbeJs)) {
                const bootProbeScript = this.createElement('script');
                bootProbeScript.setAttribute('src', bootProbeJs);
                injectTarget.insertBefore(bootProbeScript, apploader);
                console.debug('Injected boot-probe JS');
            }

            // inject debug JS files (before webapis so they load early)
            const debugJs = [
                'debug/logger.js',
                'debug/error-handler.js',
                'debug/debug-overlay.js',
                'theme/theme-bridge.js'
            ];
            debugJs.forEach((jsPath) => {
                if (fs.existsSync(jsPath)) {
                    const script = this.createElement('script');
                    script.setAttribute('src', jsPath);
                    injectTarget.insertBefore(script, apploader);
                    console.debug('Injected debug JS:', jsPath);
                } else {
                    console.warn('Debug JS not found:', jsPath);
                }
            });

            // inject webapis.js
            const webapis = this.createElement('script');
            webapis.setAttribute('src', '$WEBAPIS/webapis/webapis.js');
            injectTarget.insertBefore(webapis, apploader);

            // inject appMode script
            const appMode = this.createElement('script');
            appMode.text = 'window.appMode=\'cordova\';';
            injectTarget.insertBefore(appMode, apploader);

            // inject tizen.js
            const tizen = this.createElement('script');
            tizen.setAttribute('src', '../tizen.js');
            tizen.setAttribute('defer', '');
            injectTarget.insertBefore(tizen, apploader);

            return this;
        }))
        .pipe(gulp.dest(paths.index.dest))
}

// Default build task
const build = gulp.series(
    clean,
    searchFonts,
    gulp.parallel(copy, copyLocalAssets, modifyIndex)
);

// Export tasks so they can be run individually
export {
    clean,
    copy,
    copyLocalAssets,
    modifyIndex
};
// Export default task
export default build;
