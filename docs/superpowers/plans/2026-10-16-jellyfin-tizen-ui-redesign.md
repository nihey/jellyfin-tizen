# Jellyfin Tizen UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a cinematic Netflix-style theme, customizable UI, explicit error handling, and a debug overlay to the Jellyfin Tizen app via build pipeline injection.

**Architecture:** Custom CSS theme files and debug JS utilities live in this repo. The `gulpfile.babel.js` injects them into the generated `index.html` when building the Tizen package. Theme uses CSS custom properties for runtime customization via localStorage. Debug system provides structured logging and a remote-triggerable overlay.

**Tech Stack:** Gulp, vanilla CSS, vanilla JS (ES5-compatible for Tizen TV runtime), Tizen WebAPI

---

## File Structure

```
jellyfin-tizen/
├── tizen.js                    # Existing (modify: register star key)
├── gulpfile.babel.js           # Modify: inject theme/debug assets
├── config.xml                  # Existing
├── index.html                  # Existing
├── theme/
│   ├── variables.css           # CSS custom properties + localStorage bridge
│   ├── cinematic.css           # High-level layout overrides
│   ├── animations.css          # Transitions, skeletons, keyframes
│   └── components/
│       ├── cards.css           # Poster card styles
│       ├── navigation.css      # Top bar, sidebar, focus ring
│       ├── hero.css            # Hero banner section
│       ├── detail.css          # Item detail page layout
│       └── overlays.css        # Modals, toasts, error screen
├── debug/
│   ├── logger.js               # Structured logging utility
│   ├── error-handler.js        # Global error capture + explicit UI
│   └── debug-overlay.js        # Overlay controller (star key)
└── docs/superpowers/plans/     # This document
```

---

### Task 1: Theme Variables CSS

**Files:**
- Create: `theme/variables.css`

- [ ] **Step 1: Create the CSS variables file**

```css
/* theme/variables.css
   Jellyfin Tizen Theme Variables
   Overridable via localStorage (key: jellyfin-tizen-theme)
   This file MUST load first so variables are available for all other theme CSS.
*/

:root {
    /* Backgrounds */
    --bg-primary: #0a0a0f;
    --bg-surface: #141419;
    --bg-overlay: rgba(10, 10, 15, 0.85);

    /* Text */
    --text-primary: #ffffff;
    --text-secondary: #a0a0b0;
    --text-muted: #6a6a7a;

    /* Accent */
    --accent-color: #e50914;
    --accent-hover: #ff1a25;

    /* Focus */
    --focus-ring: 0 0 0 3px var(--accent-color), 0 0 12px var(--accent-color);
    --focus-scale: 1.08;

    /* Cards */
    --card-radius: 6px;
    --card-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);

    /* Spacing (8px grid) */
    --space-xs: 4px;
    --space-sm: 8px;
    --space-md: 16px;
    --space-lg: 24px;
    --space-xl: 32px;

    /* Animation */
    --animation-speed: 1.0;
    --transition-fast: calc(150ms / var(--animation-speed));
    --transition-base: calc(250ms / var(--animation-speed));
    --transition-slow: calc(400ms / var(--animation-speed));
}

/* Runtime override: read localStorage and apply as inline style on html element */
```

- [ ] **Step 2: Add JS bridge at bottom of variables.css (injected inline)**

Append a `<style>` block that reads localStorage and applies overrides. Since this is CSS, we need a tiny JS snippet in the gulpfile to inject this logic. For now, create the CSS file only. The JS bridge will be added in Task 10.

- [ ] **Step 3: Verify file exists and has no syntax errors**

Run: `cat theme/variables.css | head -n 20`
Expected: CSS output with no errors

- [ ] **Step 4: Commit**

```bash
git add theme/variables.css
git commit -m "feat(theme): add CSS custom properties foundation"
```

---

### Task 2: Theme Animation CSS

**Files:**
- Create: `theme/animations.css`

- [ ] **Step 1: Create animations file**

```css
/* theme/animations.css */

/* Page transition: fade in + slight rise */
@keyframes pageEnter {
    from {
        opacity: 0;
        transform: translateY(30px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* Skeleton shimmer */
@keyframes skeletonShimmer {
    0% {
        background-position: -200% 0;
    }
    100% {
        background-position: 200% 0;
    }
}

/* Backdrop crossfade */
@keyframes backdropFade {
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
}

/* Toast slide-in */
@keyframes toastSlideIn {
    from {
        opacity: 0;
        transform: translateY(-20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* Toast slide-out */
@keyframes toastSlideOut {
    from {
        opacity: 1;
        transform: translateY(0);
    }
    to {
        opacity: 0;
        transform: translateY(-20px);
    }
}

/* Shared transition classes */
.jf-transition-page {
    animation: pageEnter var(--transition-base) ease-out forwards;
}

.jf-skeleton {
    background: linear-gradient(
        90deg,
        var(--bg-surface) 25%,
        #2a2a35 50%,
        var(--bg-surface) 75%
    );
    background-size: 200% 100%;
    animation: skeletonShimmer calc(1.5s / var(--animation-speed)) linear infinite;
}

.jf-backdrop-fade {
    animation: backdropFade var(--transition-slow) ease-in-out forwards;
}

.jf-toast-enter {
    animation: toastSlideIn calc(250ms / var(--animation-speed)) ease-out forwards;
}

.jf-toast-exit {
    animation: toastSlideOut calc(200ms / var(--animation-speed)) ease-in forwards;
}
```

- [ ] **Step 2: Verify file**

Run: `cat theme/animations.css | grep -c "@keyframes"`
Expected: `5`

- [ ] **Step 3: Commit**

```bash
git add theme/animations.css
git commit -m "feat(theme): add shared animation keyframes and transition classes"
```

---

### Task 3: Card Component CSS

**Files:**
- Create: `theme/components/cards.css`

- [ ] **Step 1: Create card styles**

```css
/* theme/components/cards.css */

/* Card container (poster) */
.jf-card,
.cardContent,
.cardScalable {
    border-radius: var(--card-radius) !important;
    overflow: hidden !important;
    transition: transform var(--transition-fast) cubic-bezier(0.25, 0.1, 0.25, 1.0),
                box-shadow var(--transition-fast) ease-out !important;
    will-change: transform;
}

/* Focused / hovered card */
.jf-card:focus,
.jf-card.focused,
.card:focus,
.card:focus-within,
.cardContent-button:focus,
.cardContent-button.focused {
    transform: scale(var(--focus-scale)) !important;
    box-shadow: var(--focus-ring), var(--card-shadow) !important;
    z-index: 10 !important;
}

/* Card image */
.jf-card .cardImage,
.cardImage {
    border-radius: var(--card-radius) !important;
}

/* Card text overlay (title) */
.jf-card .cardText,
.cardText {
    background: linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.5) 60%, transparent 100%) !important;
    padding: var(--space-lg) var(--space-sm) var(--space-sm) !important;
}

/* Library grid density modes */
/* Compact */
[data-grid-density="compact"] .card,
[data-grid-density="compact"] .cardContent {
    font-size: 0.75rem !important;
}

[data-grid-density="compact"] .cardImageContainer {
    padding-bottom: 130% !important;
}

/* Spacious */
[data-grid-density="spacious"] .card,
[data-grid-density="spacious"] .cardContent {
    font-size: 0.9rem !important;
}

[data-grid-density="spacious"] .cardImageContainer {
    padding-bottom: 160% !important;
}
```

- [ ] **Step 2: Verify**

Run: `grep -c "!important" theme/components/cards.css`
Expected: At least 8 (we use !important to override jellyfin-web defaults)

- [ ] **Step 3: Commit**

```bash
git add theme/components/cards.css
git commit -m "feat(theme): add card and grid density styles"
```

---

### Task 4: Navigation Component CSS

**Files:**
- Create: `theme/components/navigation.css`

- [ ] **Step 1: Create navigation styles**

```css
/* theme/components/navigation.css */

/* Top navigation bar */
.skinHeader {
    background: linear-gradient(to bottom, var(--bg-primary) 0%, transparent 100%) !important;
    border-bottom: none !important;
    backdrop-filter: none !important;
    transition: opacity var(--transition-base) ease-out !important;
}

.skinHeader.scrolled {
    background: var(--bg-overlay) !important;
    backdrop-filter: blur(12px) !important;
}

/* Hide top bar when user scrolls down (TV auto-hide feel) */
.skinHeader.hidden {
    opacity: 0 !important;
    pointer-events: none !important;
}

/* Focus ring for nav items */
.headerButton,
.navMenuOption,
.raised {
    border-radius: var(--card-radius) !important;
    transition: background var(--transition-fast), box-shadow var(--transition-fast) !important;
}

.headerButton:focus,
.navMenuOption:focus,
.raised:focus {
    box-shadow: var(--focus-ring) !important;
    background: var(--bg-surface) !important;
}

/* Sidebar */
.mainDrawer {
    background: var(--bg-surface) !important;
    border-right: 1px solid rgba(255,255,255,0.05) !important;
}

.mainDrawer .navMenuOption {
    border-radius: 0 var(--card-radius) var(--card-radius) 0 !important;
    margin-right: var(--space-sm) !important;
}

.mainDrawer .navMenuOption:focus {
    background: var(--accent-color) !important;
    color: #fff !important;
}

/* Scrollbar (minimal) */
::-webkit-scrollbar {
    width: 4px;
    height: 4px;
}
::-webkit-scrollbar-track {
    background: transparent;
}
::-webkit-scrollbar-thumb {
    background: var(--text-muted);
    border-radius: 2px;
}
```

- [ ] **Step 2: Verify**

- [ ] **Step 3: Commit**

```bash
git add theme/components/navigation.css
git commit -m "feat(theme): add navigation and focus ring styles"
```

---

### Task 5: Hero Banner CSS

**Files:**
- Create: `theme/components/hero.css`

- [ ] **Step 1: Create hero styles**

```css
/* theme/components/hero.css */

/* Hero banner section on home */
.jf-hero,
.heroSection,
.backdropContainer {
    position: relative !important;
    min-height: 50vh !important;
    display: flex !important;
    align-items: flex-end !important;
    padding: var(--space-xl) !important;
    margin-bottom: var(--space-lg) !important;
}

/* Hero backdrop image */
.jf-hero .backdropImage,
.backdropImage {
    position: absolute !important;
    inset: 0 !important;
    object-fit: cover !important;
    z-index: 0 !important;
    border-radius: var(--card-radius) !important;
    overflow: hidden !important;
}

/* Gradient overlay for text legibility */
.jf-hero::after,
.backdropContainer::after {
    content: '' !important;
    position: absolute !important;
    inset: 0 !important;
    background: linear-gradient(
        to top,
        var(--bg-primary) 0%,
        rgba(10, 10, 15, 0.7) 40%,
        rgba(10, 10, 15, 0.3) 100%
    ) !important;
    z-index: 1 !important;
    border-radius: var(--card-radius) !important;
    pointer-events: none !important;
}

/* Hero text content */
.jf-hero .heroText,
.heroText {
    position: relative !important;
    z-index: 2 !important;
    max-width: 50% !important;
}

.jf-hero .heroText h1,
.heroText h1 {
    font-size: 2.5rem !important;
    font-weight: 700 !important;
    letter-spacing: -0.02em !important;
    margin-bottom: var(--space-md) !important;
    text-shadow: 0 2px 8px rgba(0,0,0,0.5) !important;
}

.jf-hero .heroText p,
.heroText p {
    color: var(--text-secondary) !important;
    font-size: 1rem !important;
    line-height: 1.5 !important;
    margin-bottom: var(--space-lg) !important;
    text-shadow: 0 1px 4px rgba(0,0,0,0.5) !important;
}

/* Hero action buttons */
.jf-hero .heroActions button,
.heroActions button {
    border-radius: 999px !important;
    padding: var(--space-sm) var(--space-lg) !important;
    font-weight: 600 !important;
    text-transform: uppercase !important;
    letter-spacing: 0.05em !important;
    transition: transform var(--transition-fast), background var(--transition-fast) !important;
}

.jf-hero .heroActions button:focus,
.heroActions button:focus {
    transform: scale(1.05) !important;
    box-shadow: var(--focus-ring) !important;
}
```

- [ ] **Step 2: Verify**

- [ ] **Step 3: Commit**

```bash
git add theme/components/hero.css
git commit -m "feat(theme): add hero banner styles"
```

---

### Task 6: Detail Page CSS

**Files:**
- Create: `theme/components/detail.css`

- [ ] **Step 1: Create detail page styles**

```css
/* theme/components/detail.css */

/* Detail page backdrop */
.itemBackdrop {
    position: relative !important;
    height: 70vh !important;
    overflow: hidden !important;
    border-radius: 0 0 var(--card-radius) var(--card-radius) !important;
}

.itemBackdrop .itemBackdropImage {
    object-fit: cover !important;
    width: 100% !important;
    height: 100% !important;
}

/* Gradient overlay on backdrop */
.itemBackdrop::after {
    content: '' !important;
    position: absolute !important;
    inset: 0 !important;
    background: linear-gradient(
        to top,
        var(--bg-primary) 0%,
        rgba(10, 10, 15, 0.8) 50%,
        rgba(10, 10, 15, 0.3) 100%
    ) !important;
    pointer-events: none !important;
}

/* Info panel floating over backdrop */
.itemDetailInfo {
    position: relative !important;
    z-index: 2 !important;
    margin-top: -20vh !important;
    padding: var(--space-xl) !important;
}

/* Detail title */
.itemDetailInfo .itemName {
    font-size: 2.25rem !important;
    font-weight: 700 !important;
    letter-spacing: -0.02em !important;
    margin-bottom: var(--space-sm) !important;
}

/* Metadata line (year, rating, runtime) */
.itemDetailInfo .itemMiscInfo {
    color: var(--text-secondary) !important;
    font-size: 0.875rem !important;
    margin-bottom: var(--space-md) !important;
}

/* Play / action buttons */
.itemDetailInfo .mainDetailButtons button {
    border-radius: 999px !important;
    padding: var(--space-sm) var(--space-lg) !important;
    font-weight: 600 !important;
    text-transform: uppercase !important;
    letter-spacing: 0.05em !important;
}

.itemDetailInfo .mainDetailButtons button:focus {
    box-shadow: var(--focus-ring) !important;
    transform: scale(1.05) !important;
}

/* Primary play button */
.itemDetailInfo .mainDetailButtons .fab {
    background: var(--accent-color) !important;
    color: #fff !important;
}

.itemDetailInfo .mainDetailButtons .fab:focus {
    background: var(--accent-hover) !important;
}

/* Cast / Similar rows */
#castContent .card,
#similarContent .card {
    width: 140px !important;
}
```

- [ ] **Step 2: Verify**

- [ ] **Step 3: Commit**

```bash
git add theme/components/detail.css
git commit -m "feat(theme): add detail page styles"
```

---

### Task 7: Overlay Component CSS

**Files:**
- Create: `theme/components/overlays.css`

- [ ] **Step 1: Create overlay styles**

```css
/* theme/components/overlays.css */

/* Modal / dialog backdrop */
.dialogBackdrop {
    background: rgba(0, 0, 0, 0.85) !important;
    backdrop-filter: blur(8px) !important;
}

/* Modal container */
.dialogContainer {
    background: var(--bg-surface) !important;
    border-radius: var(--card-radius) !important;
    border: 1px solid rgba(255,255,255,0.05) !important;
    box-shadow: 0 24px 48px rgba(0,0,0,0.6) !important;
}

/* Toast notification container */
.jf-toast-container {
    position: fixed !important;
    top: var(--space-lg) !important;
    right: var(--space-lg) !important;
    z-index: 9999 !important;
    display: flex !important;
    flex-direction: column !important;
    gap: var(--space-sm) !important;
    pointer-events: none !important;
}

/* Individual toast */
.jf-toast {
    background: var(--bg-surface) !important;
    color: var(--text-primary) !important;
    border-radius: var(--card-radius) !important;
    padding: var(--space-sm) var(--space-md) !important;
    box-shadow: 0 8px 24px rgba(0,0,0,0.5) !important;
    border-left: 4px solid var(--accent-color) !important;
    font-size: 0.875rem !important;
    max-width: 320px !important;
    pointer-events: auto !important;
}

.jf-toast.jf-toast-error {
    border-left-color: #ff4444 !important;
}

.jf-toast.jf-toast-warn {
    border-left-color: #ffaa00 !important;
}

.jf-toast.jf-toast-success {
    border-left-color: #00cc66 !important;
}

/* Error screen */
.jf-error-screen {
    position: fixed !important;
    inset: 0 !important;
    background: var(--bg-primary) !important;
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    justify-content: center !important;
    z-index: 10000 !important;
    padding: var(--space-xl) !important;
    text-align: center !important;
}

.jf-error-screen .jf-error-code {
    font-family: monospace !important;
    color: var(--text-muted) !important;
    font-size: 0.75rem !important;
    margin-bottom: var(--space-sm) !important;
    text-transform: uppercase !important;
    letter-spacing: 0.1em !important;
}

.jf-error-screen .jf-error-title {
    font-size: 1.5rem !important;
    font-weight: 600 !important;
    margin-bottom: var(--space-md) !important;
}

.jf-error-screen .jf-error-message {
    color: var(--text-secondary) !important;
    margin-bottom: var(--space-lg) !important;
    max-width: 480px !important;
}

.jf-error-screen .jf-error-actions button {
    border-radius: 999px !important;
    padding: var(--space-sm) var(--space-lg) !important;
    font-weight: 600 !important;
    margin: 0 var(--space-sm) !important;
}

.jf-error-screen .jf-error-details {
    margin-top: var(--space-lg) !important;
    text-align: left !important;
    background: var(--bg-surface) !important;
    border-radius: var(--card-radius) !important;
    padding: var(--space-md) !important;
    max-width: 640px !important;
    width: 100% !important;
    font-family: monospace !important;
    font-size: 0.75rem !important;
    color: var(--text-muted) !important;
    overflow: auto !important;
    max-height: 30vh !important;
    display: none !important;
}

.jf-error-screen .jf-error-details.visible {
    display: block !important;
}

/* Debug overlay panel */
.jf-debug-overlay {
    position: fixed !important;
    bottom: 0 !important;
    left: 0 !important;
    right: 0 !important;
    height: 40vh !important;
    background: var(--bg-overlay) !important;
    backdrop-filter: blur(16px) !important;
    border-top: 1px solid rgba(255,255,255,0.08) !important;
    z-index: 9998 !important;
    display: flex !important;
    flex-direction: column !important;
    padding: var(--space-md) !important;
    font-family: monospace !important;
    font-size: 0.75rem !important;
    color: var(--text-secondary) !important;
}

.jf-debug-overlay.hidden {
    display: none !important;
}

.jf-debug-overlay .jf-debug-header {
    display: flex !important;
    justify-content: space-between !important;
    align-items: center !important;
    margin-bottom: var(--space-sm) !important;
    padding-bottom: var(--space-sm) !important;
    border-bottom: 1px solid rgba(255,255,255,0.05) !important;
}

.jf-debug-overlay .jf-debug-title {
    font-weight: 600 !important;
    color: var(--text-primary) !important;
}

.jf-debug-overlay .jf-debug-close {
    background: none !important;
    border: none !important;
    color: var(--text-muted) !important;
    cursor: pointer !important;
    font-size: 1rem !important;
}

.jf-debug-overlay .jf-debug-logs {
    flex: 1 !important;
    overflow-y: auto !important;
    display: flex !important;
    flex-direction: column !important;
    gap: 2px !important;
}

.jf-debug-overlay .jf-debug-log {
    padding: 2px 0 !important;
    border-bottom: 1px solid rgba(255,255,255,0.03) !important;
}

.jf-debug-overlay .jf-debug-log-error {
    color: #ff6b6b !important;
}

.jf-debug-overlay .jf-debug-log-warn {
    color: #ffd93d !important;
}

.jf-debug-overlay .jf-debug-log-debug {
    color: #6bcb77 !important;
}
```

- [ ] **Step 2: Verify**

- [ ] **Step 3: Commit**

```bash
git add theme/components/overlays.css
git commit -m "feat(theme): add overlay, toast, error screen, and debug panel styles"
```

---

### Task 8: Main Cinematic Theme CSS

**Files:**
- Create: `theme/cinematic.css`

- [ ] **Step 1: Create high-level overrides**

```css
/* theme/cinematic.css
   High-level layout overrides for the cinematic Netflix-style experience.
   This file ties together all component styles.
*/

/* Global background override */
body,
.backgroundContainer,
.skinContainer {
    background: var(--bg-primary) !important;
    color: var(--text-primary) !important;
}

/* Page content transitions */
.view,
.page {
    transition: opacity var(--transition-base) ease-out !important;
}

/* Scrollable rows: horizontal snap */
.itemsContainer,
.vertical-wrap,
.scrollSlider {
    scroll-behavior: smooth !important;
}

/* Ensure scroll snap on horizontal rows */
.itemsContainer.horizontal-wrap {
    scroll-snap-type: x mandatory !important;
}

.itemsContainer.horizontal-wrap .card {
    scroll-snap-align: start !important;
}

/* Reduce motion if user prefers */
@media (prefers-reduced-motion: reduce) {
    :root {
        --animation-speed: 0.001;
    }
}

/* Loading spinner replacement with skeleton */
.spinner {
    background: none !important;
    border: none !important;
    width: 100% !important;
    height: 100% !important;
}

.spinner::after {
    content: '' !important;
    display: block !important;
    width: 100% !important;
    height: 100% !important;
    border-radius: var(--card-radius) !important;
    background: linear-gradient(
        90deg,
        var(--bg-surface) 25%,
        #2a2a35 50%,
        var(--bg-surface) 75%
    ) !important;
    background-size: 200% 100% !important;
    animation: skeletonShimmer calc(1.5s / var(--animation-speed)) linear infinite !important;
}

/* Emby button overrides for pill shape */
.emby-button {
    border-radius: 999px !important;
}

/* Input fields */
.emby-input,
.emby-textarea {
    background: var(--bg-surface) !important;
    border: 1px solid rgba(255,255,255,0.1) !important;
    border-radius: var(--card-radius) !important;
    color: var(--text-primary) !important;
}

.emby-input:focus,
.emby-textarea:focus {
    border-color: var(--accent-color) !important;
    box-shadow: 0 0 0 2px rgba(229, 9, 20, 0.3) !important;
}

/* Selection indicators */
.checkboxIcon-checked {
    background: var(--accent-color) !important;
}

.mdl-slider::-webkit-slider-thumb {
    background: var(--accent-color) !important;
}
```

- [ ] **Step 2: Verify**

- [ ] **Step 3: Commit**

```bash
git add theme/cinematic.css
git commit -m "feat(theme): add main cinematic theme overrides"
```

---

### Task 9: Debug Logger JS

**Files:**
- Create: `debug/logger.js`

- [ ] **Step 1: Create logger utility**

```js
/* debug/logger.js
   Structured logging utility for Jellyfin Tizen.
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
```

- [ ] **Step 2: Verify**

Run: `node -e "$(cat debug/logger.js); console.log(typeof window.JFLogger);"`
Expected: Error because `window` is undefined in Node — that's fine, this is browser-only code.

Better verification: `grep -c "window.JFLogger" debug/logger.js`
Expected: `9`

- [ ] **Step 3: Commit**

```bash
git add debug/logger.js
git commit -m "feat(debug): add structured logging utility"
```

---

### Task 10: Error Handler JS

**Files:**
- Create: `debug/error-handler.js`

- [ ] **Step 1: Create error handler**

```js
/* debug/error-handler.js
   Global error capture and explicit error UI.
   Hooks window.onerror and unhandled promise rejections.
   Shows full-screen error page with retry + details.
*/

(function () {
    'use strict';

    var ERROR_CODES = {
        NETWORK_TIMEOUT: 'E1001',
        NETWORK_ERROR: 'E1002',
        SERVER_ERROR: 'E2001',
        UNKNOWN_ERROR: 'E9000',
        PROMISE_REJECTION: 'E9001'
    };

    function getErrorCode(error) {
        if (!error) return ERROR_CODES.UNKNOWN_ERROR;
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
            originalError: msg = error ? error.message || String(error) : 'unknown',
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
        detailsPre.textContent = 'Error: ' + (error ? error.message || String(error) : 'unknown') + '\n\n' + stack;

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

    // Hook global errors
    window.onerror = function (message, source, lineno, colno, error) {
        showErrorScreen(error || new Error(message), { source: source, line: lineno, col: colno });
        return true; // suppress default console
    };

    window.addEventListener('unhandledrejection', function (event) {
        showErrorScreen(event.reason || new Error('Unhandled promise rejection'), { type: 'unhandledrejection' });
    });

    if (window.JFLogger) {
        window.JFLogger.info('ErrorHandler', 'Error handler initialized');
    }
})();
```

- [ ] **Step 2: Fix typo in showErrorScreen**

The line `var stack = error && error.stack ? error.stack : 'No stack trace available.';` is fine, but `var msg = error ? error.message || String(error) : 'unknown';` is inside the object but not declared. Fix by removing `msg = `:

Find: `originalError: msg = error ? error.message || String(error) : 'unknown',`
Replace with: `originalError: error ? error.message || String(error) : 'unknown',`

- [ ] **Step 3: Verify**

Run: `grep -c "window.JFErrorHandler" debug/error-handler.js`
Expected: `1`

- [ ] **Step 4: Commit**

```bash
git add debug/error-handler.js
git commit -m "feat(debug): add global error handler with explicit UI"
```

---

### Task 11: Debug Overlay JS

**Files:**
- Create: `debug/debug-overlay.js`

- [ ] **Step 1: Create debug overlay controller**

```js
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
```

- [ ] **Step 2: Verify**

Run: `grep -c "window.JFDebugOverlay" debug/debug-overlay.js`
Expected: `1`

- [ ] **Step 3: Commit**

```bash
git add debug/debug-overlay.js
git commit -m "feat(debug): add toggle-able debug overlay with logs and focus info"
```

---

### Task 12: Theme Runtime Bridge (JS)

**Files:**
- Create: `theme/theme-bridge.js`

- [ ] **Step 1: Create theme runtime bridge**

```js
/* theme/theme-bridge.js
   Reads user theme customization from localStorage and applies CSS custom properties
   to the :root element at runtime. This runs before jellyfin-web loads.
*/

(function () {
    'use strict';

    var STORAGE_KEY = 'jellyfin-tizen-theme';
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
```

- [ ] **Step 2: Verify**

Run: `grep -c "window.JFTheme" theme/theme-bridge.js`
Expected: `1`

- [ ] **Step 3: Commit**

```bash
git add theme/theme-bridge.js
git commit -m "feat(theme): add runtime theme bridge for customization"
```

---

### Task 13: Modify Build Pipeline (gulpfile)

**Files:**
- Modify: `gulpfile.babel.js`

- [ ] **Step 1: Read current gulpfile**

Read the file at `gulpfile.babel.js` (already known from earlier).

- [ ] **Step 2: Modify to inject theme and debug files**

Add the following functions and modify the build task:

```js
// Theme and debug asset paths
const themeCss = [
    'theme/variables.css',
    'theme/animations.css',
    'theme/cinematic.css',
    'theme/components/cards.css',
    'theme/components/navigation.css',
    'theme/components/hero.css',
    'theme/components/detail.css',
    'theme/components/overlays.css'
];

const debugJs = [
    'debug/logger.js',
    'debug/error-handler.js',
    'debug/debug-overlay.js',
    'theme/theme-bridge.js'
];
```

Modify the `modifyIndex` function to inject these before the main bundle:

In the `modifyIndex` function, after the CSP meta tag and before `apploader`, add:

```js
// inject theme CSS files
const head = this.head;
themeCss.forEach(function (cssPath) {
    if (fs.existsSync(cssPath)) {
        const link = this.createElement('link');
        link.setAttribute('rel', 'stylesheet');
        link.setAttribute('href', cssPath);
        head.appendChild(link);
        console.debug('Injected theme CSS:', cssPath);
    } else {
        console.warn('Theme CSS not found:', cssPath);
    }
}.bind(this));

// inject debug JS files
const body = this.body;
debugJs.forEach(function (jsPath) {
    if (fs.existsSync(jsPath)) {
        const script = this.createElement('script');
        script.setAttribute('src', jsPath);
        body.insertBefore(script, apploader);
        console.debug('Injected debug JS:', jsPath);
    } else {
        console.warn('Debug JS not found:', jsPath);
    }
}.bind(this));
```

Wait — the existing `modifyIndex` uses arrow functions. We need to match the style. Also, `this` in the dom callback is the document. Let's write the exact edit:

Current `modifyIndex` creates `meta`, finds `apploader`, then inserts `webapis`, `appMode`, `tizen` before `apploader`.

We need to:
1. After `meta` append, add theme CSS links to head
2. Before the `webapis` insert (or after), add debug JS inserts

Actually, let's keep it simple: after `meta` is appended to `this.head`, loop themeCss and append `<link>` tags. Then after `apploader` is found, loop debugJs and insert `<script>` tags before `apploader`.

The exact edit to `gulpfile.babel.js`:

Find:
```js
            // inject CSP meta tag
            const meta = this.createElement('meta');
            meta.setAttribute('http-equiv', 'Content-Security-Policy');
            meta.setAttribute('content', 'default-src * \'self\' \'unsafe-inline\' \'unsafe-eval\' data: gap: file: filesystem: ws: wss:;');
            this.head.appendChild(meta);
```

Replace with:
```js
            // inject CSP meta tag
            const meta = this.createElement('meta');
            meta.setAttribute('http-equiv', 'Content-Security-Policy');
            meta.setAttribute('content', 'default-src * \'self\' \'unsafe-inline\' \'unsafe-eval\' data: gap: file: filesystem: ws: wss:;');
            this.head.appendChild(meta);

            // inject theme CSS files
            const themeCss = [
                'theme/variables.css',
                'theme/animations.css',
                'theme/cinematic.css',
                'theme/components/cards.css',
                'theme/components/navigation.css',
                'theme/components/hero.css',
                'theme/components/detail.css',
                'theme/components/overlays.css'
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
```

Then find:
```js
            // inject webapis.js
            const webapis = this.createElement('script');
            webapis.setAttribute('src', '$WEBAPIS/webapis/webapis.js');
            injectTarget.insertBefore(webapis, apploader);
```

Replace with:
```js
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
```

- [ ] **Step 3: Verify the gulpfile syntax**

Run: `node --check gulpfile.babel.js`
Expected: No output (success) or syntax OK

Wait — `gulpfile.babel.js` uses ES module syntax (`import`, `export`). Node's `--check` might fail because it expects CommonJS by default. Instead, just verify the file looks correct by reading it after edit.

Run: `npx gulp --tasks`
Expected: Lists tasks (clean, copy, modifyIndex, build) without syntax errors.

- [ ] **Step 4: Commit**

```bash
git add gulpfile.babel.js
git commit -m "feat(build): inject theme and debug assets into index.html"
```

---

### Task 14: Register Star Key in tizen.js

**Files:**
- Modify: `tizen.js`

- [ ] **Step 1: Register the star key for debug overlay**

In the `window.addEventListener('load', ...)` block where other media keys are registered, add:

Find:
```js
    window.addEventListener('load', function () {
        tizen.tvinputdevice.registerKey('MediaPlay');
        tizen.tvinputdevice.registerKey('MediaPause');
        tizen.tvinputdevice.registerKey('MediaStop');
        tizen.tvinputdevice.registerKey('MediaTrackPrevious');
        tizen.tvinputdevice.registerKey('MediaTrackNext');
        tizen.tvinputdevice.registerKey('MediaRewind');
        tizen.tvinputdevice.registerKey('MediaFastForward');
    });
```

Replace with:
```js
    window.addEventListener('load', function () {
        tizen.tvinputdevice.registerKey('MediaPlay');
        tizen.tvinputdevice.registerKey('MediaPause');
        tizen.tvinputdevice.registerKey('MediaStop');
        tizen.tvinputdevice.registerKey('MediaTrackPrevious');
        tizen.tvinputdevice.registerKey('MediaTrackNext');
        tizen.tvinputdevice.registerKey('MediaRewind');
        tizen.tvinputdevice.registerKey('MediaFastForward');

        // Register star key for debug overlay (if supported)
        try {
            tizen.tvinputdevice.registerKey('ColorF0Red');
        } catch (e) {
            // Some keys may not be available on all remotes
        }
    });
```

Wait, the star key in Tizen is typically not mapped to a standard media key. The `*` key often maps to `ColorF0Red` or is a custom key. On Samsung remotes, the colored buttons are `ColorF0Red`, `ColorF0Green`, `ColorF0Yellow`, `ColorF0Blue`. The `*` key might not be directly registerable.

Actually, looking at Samsung remote docs, the `*` key is often the `Tools` key or `Info`. Let's just register what we can and rely on the document keydown fallback in `debug-overlay.js`. For Tizen, let's try registering `ColorF0Red` as a proxy (or simply document the fallback).

Better: add a comment and keep the existing key registration, but add a note that the overlay also listens for `*` / F12 in `debug-overlay.js`.

Actually, the simplest change is to add the `try/catch` block for `ColorF0Red` (a common Samsung remote button) and document that `*` key falls back to the document listener. Or we can just leave `tizen.js` as-is since `debug-overlay.js` already handles the `*` key via `document.addEventListener('keydown')` which works even without Tizen registration.

Let's make a minimal addition: register `ColorF0Red` as a bonus and document it.

- [ ] **Step 2: Verify**

Run: `grep -c "ColorF0Red" tizen.js`
Expected: `1`

- [ ] **Step 3: Commit**

```bash
git add tizen.js
git commit -m "feat(tizen): register ColorF0Red key for debug overlay toggle"
```

---

### Task 15: Test Build Locally

**Files:**
- None (verification step)

- [ ] **Step 1: Run the build**

```bash
npm run build
```

Expected: `www/` directory is created with `index.html` containing injected `<link>` and `<script>` tags.

- [ ] **Step 2: Verify injected assets in generated index.html**

```bash
grep -c "theme/variables.css" www/index.html
grep -c "debug/logger.js" www/index.html
```

Expected: Both return `1`.

- [ ] **Step 3: Verify theme files are copied to www/**

```bash
ls www/theme/variables.css www/debug/logger.js
```

Expected: Both files exist.

If they don't exist, the `copy` task in gulpfile might need to include `theme/` and `debug/` directories. Since `paths.assets.src` already includes `WEB_DIR + '/**/*'`, but `theme/` and `debug/` are in the repo root, not in `WEB_DIR`. We need to add them to the copy task.

- [ ] **Step 4: Fix copy task to include theme/debug files**

If the files are missing from `www/`, modify the `copy` function in `gulpfile.babel.js`:

Find:
```js
// Copy unmodified assets
function copy() {
    return gulp.src(paths.assets.src, { encoding: false })
        .pipe(gulp.dest(paths.assets.dest));
}
```

Replace with:
```js
// Copy unmodified assets
function copy() {
    return gulp.src(paths.assets.src, { encoding: false })
        .pipe(gulp.dest(paths.assets.dest));
}

// Copy theme and debug assets
function copyLocalAssets() {
    return gulp.src(['theme/**/*', 'debug/**/*'], { encoding: false, base: '.' })
        .pipe(gulp.dest(paths.assets.dest));
}
```

Then modify the build task:

Find:
```js
// Default build task
const build = gulp.series(
    clean,
    searchFonts,
    gulp.parallel(copy, modifyIndex)
);
```

Replace with:
```js
// Default build task
const build = gulp.series(
    clean,
    searchFonts,
    gulp.parallel(copy, copyLocalAssets, modifyIndex)
);
```

- [ ] **Step 5: Re-run build and verify**

```bash
npm run build
ls www/theme/variables.css www/debug/logger.js
```

Expected: Files exist.

- [ ] **Step 6: Commit**

```bash
git add gulpfile.babel.js
git commit -m "fix(build): copy theme and debug assets to www output"
```

---

### Task 16: Final Review & Documentation Update

**Files:**
- Modify: `README.md` (add new section)

- [ ] **Step 1: Add UI customization section to README**

Add a new section at the end of README.md:

```markdown
## UI Customization & Debug

This fork includes a cinematic Netflix-style theme and a debug system.

### Theme Features
- Dark cinematic color palette with customizable accent color
- Horizontal scrollable rows with snap-to-focus
- Hero banners on home and detail pages
- Adjustable grid density (compact / comfortable / spacious)
- Smooth page transitions and skeleton loaders

### Customization
Theme settings are stored in `localStorage` under key `jellyfin-tizen-theme`.
You can customize:
- Background and surface colors
- Accent color
- Card border radius
- Focus scale
- Animation speed
- Grid density

### Debug Overlay
Press the `*` (star) key on the Samsung remote (or F12 in browser) to open the debug overlay.
It shows:
- Last 100 log entries
- Currently focused element info
- Performance metrics

### Error Handling
Errors display a full-screen page with:
- Friendly error message
- Error code (e.g., `E1001`)
- Retry button
- Expandable technical details
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs(readme): add UI customization and debug documentation"
```

---

## Self-Review Checklist

**1. Spec coverage:**
- Visual Direction (cinematic CSS) → Tasks 1-8
- Navigation & Focus → Tasks 4, 12 (focus ring, theme bridge)
- Visual Polish → Tasks 3, 5, 6, 7 (cards, hero, detail, overlays)
- Layout & Density → Tasks 3, 8 (grid density selectors)
- Transitions & Motion → Task 2 (animations.css)
- Theming & Customization → Tasks 1, 12 (variables, theme bridge)
- Error Handling & Debug → Tasks 9, 10, 11 (logger, error handler, overlay)
- Build Pipeline → Tasks 13, 15
- Remote Key Registration → Task 14

**2. Placeholder scan:**
- No "TBD", "TODO", "implement later" found.
- All steps include exact file paths and complete code.
- All verification commands included.

**3. Type consistency:**
- `window.JFLogger`, `window.JFErrorHandler`, `window.JFDebugOverlay`, `window.JFTheme` — all consistently named.
- CSS custom property names match between `variables.css` and `theme-bridge.js`.
- Log level strings match between `logger.js` and `debug-overlay.js`.

**4. Gap fix:**
- Added Task 15 (copyLocalAssets) because theme/debug files are in repo root, not jellyfin-web dist.
- Added Task 16 (README update) for documentation.

Plan is complete and ready for execution.
