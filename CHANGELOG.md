# Changelog

All notable changes to **Damn Center** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/) and adheres to [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

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
