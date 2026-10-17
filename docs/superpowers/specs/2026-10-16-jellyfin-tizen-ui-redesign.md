# Jellyfin Tizen UI Redesign — Design Spec

**Date:** 2026-10-16  
**Project:** jellyfin-tizen (Samsung Smart TV app)  
**Approach:** Fork jellyfin-web + theme/debug injection via build pipeline  
**Visual Direction:** Cinematic Netflix-style  
**Status:** Approved — ready for implementation planning  

---

## 1. Goals

1. Transform the Jellyfin Tizen app into a modern, cinematic media browsing experience
2. Improve remote-control navigation fluidity and focus handling
3. Add user-customizable theming (colors, density, layout)
4. Make errors explicit and debuggable with a built-in log viewer

---

## 2. Visual Direction: Cinematic

### 2.1 Color Palette
- **Background:** `#0a0a0f` (near-black) with subtle gradient overlays
- **Surface:** `#141419` (elevated cards, panels)
- **Text Primary:** `#ffffff` (titles, labels)
- **Text Secondary:** `#a0a0b0` (metadata, descriptions)
- **Accent:** configurable via CSS custom properties (`--accent-color`), default `#e50914` (Netflix red)
- **Focus Ring:** `0 0 0 3px var(--accent-color)` with glow effect
- **Backdrop:** Full-bleed blurred backdrop images on detail pages

### 2.2 Typography
- **Headings:** System sans-serif, weight 600, tight letter-spacing (-0.02em)
- **Body:** System sans-serif, weight 400, line-height 1.5
- **Metadata:** Smaller (0.875rem), weight 400, muted color

### 2.3 Layout Patterns
- **Home:** Top hero banner (featured/continue watching) + horizontal scrollable rows
- **Detail Pages:** Full-bleed backdrop with floating info panel, cast row, similar items
- **Library:** Grid view with adjustable density (compact / comfortable / spacious)
- **Navigation:** Minimal top bar, fades on scroll. Sidebar for settings only.

### 2.4 Component Style
- **Cards:** `border-radius: 6px`, `aspect-ratio: 2/3`, hover/ focus scale to 1.08
- **Rows:** Horizontal scrolling with `scroll-snap-type: x mandatory`
- **Focus State:** Scale + shadow + colored ring. Smooth 200ms transitions.
- **Buttons:** Pill-shaped (`border-radius: 999px`), filled accent on primary actions

---

## 3. UI Improvements

### 3.1 Navigation & Focus
- Custom focus manager for TV remote (arrow keys, Enter, Back)
- Focus trap in modals/overlays
- Scroll-into-view when focus moves off-screen
- Visual focus indicator: scale(1.08) + box-shadow glow
- Fast-scrolling with held directional keys (acceleration curve)

### 3.2 Visual Polish
- Backdrop blur (`backdrop-filter: blur(20px)`) on info panels
- Subtle gradient overlays to ensure text legibility
- Consistent 8px grid spacing system
- Rounded corners on all interactive elements
- Skeleton loading screens instead of spinners

### 3.3 Layout & Density
- Home page: modular sections (hero, resume, latest, favorites)
- Library grid: 3 density modes toggled in settings
- Detail page: collapsible sections (cast, crew, similar, extras)
- Search: inline results with instant focus

### 3.4 Transitions & Motion
- Page transitions: fade + slight translateY (30px → 0), 250ms ease-out
- Focus transitions: 200ms cubic-bezier(0.25, 0.1, 0.25, 1.0)
- Row scroll: smooth scroll with snap points
- Loading: skeleton shimmer animation
- Backdrop crossfade: 400ms when changing selection

---

## 4. Customization System

Users can customize via a new "Appearance" settings screen.

### 4.1 Theme Presets
- Cinematic Dark (default)
- Midnight Blue
- Warm Amber
- High Contrast
- Custom

### 4.2 Adjustable Properties (CSS Custom Properties)
| Property | Default | Options |
|----------|---------|---------|
| `--bg-primary` | `#0a0a0f` | Any color |
| `--bg-surface` | `#141419` | Any color |
| `--accent-color` | `#e50914` | Any color |
| `--text-primary` | `#ffffff` | Any color |
| `--text-secondary` | `#a0a0b0` | Any color |
| `--card-radius` | `6px` | 0px, 4px, 6px, 12px, 16px |
| `--focus-scale` | `1.08` | 1.0, 1.05, 1.08, 1.12 |
| `--animation-speed` | `1.0` | 0.5x, 1.0x, 2.0x (or off) |
| `--grid-density` | `comfortable` | compact, comfortable, spacious |

### 4.3 Persistence
- Settings saved to `localStorage` under key `jellyfin-tizen-theme`
- Applied at app startup via injected theme CSS
- Live preview in settings without restart

---

## 5. Error Handling & Debug System

### 5.1 Explicit Error UI
- Full-screen error page with:
  - Friendly message ("Something went wrong")
  - Error code (e.g., `E1001: Network timeout`)
  - Retry button
  - "Show Details" expanding to raw error + stack trace
- Toast notifications for transient errors (auto-dismiss 5s)

### 5.2 Structured Logging
All modules log through a central logger:
```
[2026-10-16T14:32:01Z] [ERROR] [NavigationManager] Focus move failed: element not found
  Context: { from: "card-42", direction: "right", targetRow: "row-3" }
  Stack: ...
```

Log levels: DEBUG, INFO, WARN, ERROR, FATAL

### 5.3 Debug Overlay
- Triggered by pressing the `*` (star) key on the Samsung remote
- Appears as a semi-transparent panel overlaying the bottom 40% of screen
- Shows:
  - Last 100 log entries (newest at bottom, auto-scroll)
  - Current focused element info (selector, bounds)
  - Performance metrics (FPS, memory if available)
  - Network request log (last 20)
- Dismiss with `Back` or `*` key

### 5.4 Graceful Degradation
- If backdrop image fails to load: fallback to solid gradient
- If hero banner fails: hide section, continue with rows
- If customization CSS fails to parse: fallback to default dark theme
- If debug overlay crashes: log to console, suppress overlay

---

## 6. Architecture

### 6.1 File Structure (in this repo)
```
jellyfin-tizen/
├── tizen.js                 # Existing: TV native bridge
├── gulpfile.babel.js        # Modified: inject theme/debug files
├── index.html               # Existing: redirect
├── config.xml               # Existing: Tizen manifest
├── theme/
│   ├── cinematic.css        # Main theme stylesheet
│   ├── variables.css        # CSS custom properties (overridable)
│   ├── components/
│   │   ├── cards.css
│   │   ├── navigation.css
│   │   ├── hero.css
│   │   ├── detail.css
│   │   └── overlays.css
│   └── animations.css       # Shared transitions
├── debug/
│   ├── logger.js            # Structured logging utility
│   ├── debug-overlay.js     # Overlay UI controller
│   └── error-handler.js     # Global error capture & UI
└── docs/superpowers/specs/  # This document
```

### 6.2 Build Pipeline Changes
The `gulpfile.babel.js` will:
1. Copy existing `jellyfin-web/dist` assets to `www/`
2. Inject `theme/` CSS files into `<head>` of `index.html`
3. Inject `debug/` JS files before the main bundle
4. Ensure theme CSS loads first so variables are available

### 6.3 Runtime Flow
1. App boots, Tizen shell initializes
2. `debug/logger.js` sets up global log capture
3. `debug/error-handler.js` hooks `window.onerror` and `unhandledrejection`
4. Theme CSS variables are read from `localStorage` and applied
5. jellyfin-web bundle loads and renders with themed styles
6. Remote key handler from `tizen.js` works alongside new focus manager

---

## 7. Constraints & Considerations

- **TV Performance:** Avoid heavy blur on large areas. Use `will-change: transform` sparingly. Test on actual Samsung hardware.
- **Remote Input:** All interactions must work with D-pad only. No hover states. Focus must always be visible.
- **Memory:** Skeleton loaders preferred over heavy animations. Clean up event listeners.
- **Accessibility:** Ensure sufficient contrast ratios. Focus indicators must be obvious.
- **Upstream Updates:** Forking jellyfin-web means we take on merge burden. Document all changes for easier rebasing.

---

## 8. Open Questions (None — Design Approved)

This spec is ready for implementation planning.

