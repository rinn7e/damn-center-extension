# Changelog

All notable changes to **Damn Center** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/) and adheres to [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

### Added

- **Domain-Specific Match Toggle (`DomainSetting`)**: Added a toggle switch directly next to the "Matches" card header to quickly enable or disable all configuration matches for the active domain at once without deleting or overriding individual path matching rules.
- **Platform-Aware Window Maximization**: Improved the "Disable when Not Maximized" option on macOS and Windows to correctly handle High DPI Retina and scaled external displays.
- **Debounced Window Resize Listener**: Debounced window resize event processing by 150ms to allow OS window snapping and tiling animations to settle before computing window maximization states.
- **Safari Web Extension Support**: Added official Safari compatibility (Manifest V3) including `build:safari` and `build:safari:dev` targets, an automated Xcode app wrapper conversion shell script (`pnpm run generate:safari`), and specialized window maximization heuristics for Safari's zoom engine.
- **Settings Update Timestamp (`updatedAt`)**: Introduced an optional `updatedAt` property in the `PadSettings` type and codec (using `t.partial` to maintain backwards compatibility) that automatically refreshes with `Date.now()` on any rule modification, paving the way for intelligent merging of backup files.

---

## [1.0.3] - 2026-06-21

### Added

- **Auto-Disable on Fullscreen**: Automatically suspends padding and alignment rules when a website enters fullscreen mode (Fix Youtube fullscreen).
- **Popup UI Font Size Controller**: Added a setting and footer controls to increase or decrease the root font size of the extension's popup UI (clamped between `12px` and `32px` in `1px` steps, default `16px`) to scale all text elements cleanly.

---

## [1.0.2] - 2026-06-10

### Added

- **"Disable when Not Maximized" Option**: Dynamic padding suspension when the browser window is tiled or resized (resolves Linux Wayland viewport bugs).
- **Dev Icon Badges**: Automatic orange "DEV" banner overlay on extension icons for development builds.
- **Dynamic Version Header**: Displays manifest version and build date inside the popup UI.
- **Production Logs Stripping**: Strips `console.*` outputs from production builds.
- **Development Build Scripts**: Added `build:dev` commands to compile Chrome/Firefox targets in development mode.

---

## [1.0.1] - 2026-06-08

### Added

- **Shifting Strategies**: Added explicit selection between CSS Flexbox shifting and Classic Placeholder shifting strategies.
- **Alignment Ruler**: Improved layout alignment guide ruler.

### Changed

- **Code Refactoring**: Renamed and added `run` prefix for side-effect functions in the content script.

---

## [1.0.0] - 2026-06-08

### Added

- Core implementation: Left/right page padding with dynamic slider width adjustments.
- Side selection (Left, Right, Both), Light/Dark theme sync, and SVG background patterns.
- Domain-specific matching rules with settings Import/Export features.
- Collapsible domain matching rules list in the popup.
- Initial codebase unit tests.
