# Changelog

All notable changes to **Damn Center** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/) and adheres to [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

### Added

- **Privacy Policy**: [PRIVACY.md](https://github.com/rinn7e/damn-center-extension/blob/master/PRIVACY.md) spells out that Damn Center collects nothing and keeps your settings on your device.
- **Import Confirmation**: Importing a backup now asks before replacing your settings.
- **Changes Reach Every Tab**: Turning the extension on or off, or editing a site's matches, now updates every open tab right away, not only the one you're on. Switching to a tab also re-reads the latest settings. Tabs left open across an extension update keep their padding instead of losing it.

### Changed

- **Page Elements**: The padding, ruler and style elements the extension adds to pages now use `damn-center-*` ids instead of the old `symmetry-pad-*` names. If you wrote custom user styles for those ids, update them.
- **Firefox 140+**: The Firefox version now requires Firefox 140 or later (an ESR release), the first version that supports the add-on's data-collection declaration.
- **Smaller and Faster**: The script that runs on every page is less than half its old size (117 KB → 53 KB), because fp-ts is now imported as tree-shakeable ES modules. Old backup icons and screenshots are no longer copied into the packages.
- **Quieter on Other Sites**: On sites without rules, the content script no longer adds anything to the page, and it only checks for in-page URL changes on sites that have rules, instead of every 500 ms everywhere.
- **Description**: The extension's description now reads "Center any website on your widescreen or ultrawide monitor, with per-site padding, rulers, themes and background patterns."

### Fixed

- **Scroll Position**: Turning padding on or off (from the popup, when the window is un-maximized, or when moving between pages with and without a rule) no longer jumps the page to a different scroll position.
- **Pages That Rebuild Themselves**: If a page replaces its whole document, the padding is put back instead of silently disappearing.
- **SVG and XML Files**: Opening an `.svg` or XML file on a site with a matching rule no longer causes an error.
- **Chrome Version**: The extension now declares Chrome 111 as its minimum, the first version that shows the popup's styling correctly.
- **No Jump on Load**: The padding is applied as the page starts loading, instead of after it finishes, so pages no longer shift sideways once they appear.
- **Firefox Updates**: After the add-on updates, open tabs no longer end up with doubled padding that can't be turned off; leftovers from the previous version are removed.
- **Export in Firefox**: Exporting a backup could fail to download in Firefox.
- **Browser Pages**: Settings changed while on a browser or extension page (such as `about:newtab`) are no longer saved under a stray site name.
- **Safer Import**: Import used to clear all settings before saving the backup, so a failed save could leave you with none. It now saves the backup first and only then removes what the file doesn't contain.
- **Popup Font**: The popup named the Inter font without bundling it; it now asks for the system UI font directly, which most users already saw.

### Project

- Behind the scenes: automated checks, security scanning and signed release builds, plus more tests. See the [repository](https://github.com/rinn7e/damn-center-extension) for details.

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
