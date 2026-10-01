# Changelog

All notable changes to **Damn Center** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/) and adheres to [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

### Changed

- **Page Elements**: The padding, ruler and style elements the extension adds to pages now use `damn-center-*` ids instead of the old `symmetry-pad-*` names. If you wrote custom user styles for those ids, update them.
- **Smaller Packages**: Removed old backup icons and screenshots that were being copied into the extension packages.
- **Popup Font**: The popup now asks for the system UI font directly; it used to name Inter, which was never bundled, so most users already saw the system font.

### Internal

- New CI and tag-triggered release workflow, `package.json` as the single version source, Dependabot, contributor docs, and a documented Safari app build.

---

## [2.0.0] - 2026-10-01

The 2.0 version marks the Damn Center rebrand: new icon, refreshed store listing and a new showcase video. There are no breaking changes, and existing settings carry over as they are.

### Changed

- **New Icon & Brand**: Replaced the `{|}` icon with a new "page with pads" mark (a cream reading column between striped teal padding) in the popup's Solarized palette, with pixel-tuned 16px and 32px versions and matching development (`-dev`) icons.

---

## [1.0.5] - 2026-08-09

### Fixed

- **Background Tab Initialization Bug**: Fixed an issue where the extension failed to apply padding on pages opened in the background (which initially report `0` for window dimensions) by adding a deferred `150ms` re-evaluation when the tab transitions to the foreground (`visibilitychange` event).

---

## [1.0.4] - 2026-07-06

### Added

- **Domain-Specific Match Toggle (`DomainSetting`)**: Added a toggle switch directly next to the "Matches" card header to quickly enable or disable all configuration matches for the active domain at once without deleting or overriding individual path matching rules.
- **Platform-Aware Window Maximization**: Improved the "Disable when Not Maximized" option on macOS and Windows to correctly handle High DPI Retina and scaled external displays.
- **Debounced Window Resize Listener**: Debounced window resize event processing by 150ms to allow OS window snapping and tiling animations to settle before computing window maximization states.
- **Safari Web Extension Support**: Added official Safari compatibility (Manifest V3) including `build:safari` and `build:safari:dev` targets (the `:dev` targets were later replaced by `build` and `build:release`), an automated Xcode app wrapper conversion shell script (`pnpm run generate:safari`), and specialized window maximization heuristics for Safari's zoom engine.
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
- **Development Build Scripts**: Added `build:dev` commands to compile Chrome/Firefox targets in development mode (later replaced by `build` and `build:release`).

---

## [1.0.1] - 2026-06-08

### Added

- **Shifting Strategies**: Added explicit selection between CSS Flexbox shifting and Classic Placeholder shifting strategies.
- **Alignment Ruler**: Improved layout alignment guide ruler.

### Changed

- **Code Refactoring**: Renamed and added `run` prefix for side-effect functions in the content script.

---

## [1.0.0] - 2026-06-08

> The v1.0.0, v1.0.1 and v1.0.2 tags were all created on the same commit, after 1.0.2 was finished, so checking out v1.0.0 or v1.0.1 gives you the 1.0.2 code.

### Added

- Core implementation: Left/right page padding with dynamic slider width adjustments.
- Side selection (Left, Right, Both), Light/Dark theme sync, and SVG background patterns.
- Domain-specific matching rules with settings Import/Export features.
- Collapsible domain matching rules list in the popup.
- Initial codebase unit tests.

[Unreleased]: https://github.com/rinn7e/damn-center-extension/compare/v2.0.0...HEAD
[2.0.0]: https://github.com/rinn7e/damn-center-extension/compare/v1.0.5...v2.0.0
[1.0.5]: https://github.com/rinn7e/damn-center-extension/compare/v1.0.4...v1.0.5
[1.0.4]: https://github.com/rinn7e/damn-center-extension/compare/v1.0.3...v1.0.4
[1.0.3]: https://github.com/rinn7e/damn-center-extension/compare/v1.0.2...v1.0.3
[1.0.2]: https://github.com/rinn7e/damn-center-extension/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/rinn7e/damn-center-extension/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/rinn7e/damn-center-extension/releases/tag/v1.0.0
