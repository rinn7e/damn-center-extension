# Changelog

All notable changes to **Damn Center** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/) and adheres to [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

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
