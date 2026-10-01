<p align="center">
  <img src="public/icon128.png" alt="Damn Center Logo" width="128" height="128">
</p>

<h1 align="center">Damn Center - the page!</h1>

<p align="center">
  Center any website on your widescreen or ultrawide monitor, for Chrome, Firefox and Safari.
</p>

<p align="center">
  <a href="https://github.com/rinn7e/damn-center-extension/actions/workflows/ci.yml"><img src="https://github.com/rinn7e/damn-center-extension/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://chromewebstore.google.com/detail/damn-center/jljnmcioeicnlafnjmgknjgegnaccaii"><img src="https://img.shields.io/chrome-web-store/v/jljnmcioeicnlafnjmgknjgegnaccaii?label=chrome%20web%20store" alt="Chrome Web Store version"></a>
  <a href="https://chromewebstore.google.com/detail/damn-center/jljnmcioeicnlafnjmgknjgegnaccaii"><img src="https://img.shields.io/chrome-web-store/rating/jljnmcioeicnlafnjmgknjgegnaccaii" alt="Chrome Web Store rating"></a>
  <a href="https://chromewebstore.google.com/detail/damn-center/jljnmcioeicnlafnjmgknjgegnaccaii"><img src="https://img.shields.io/chrome-web-store/users/jljnmcioeicnlafnjmgknjgegnaccaii?label=chrome%20users" alt="Chrome Web Store users"></a>
  <a href="https://addons.mozilla.org/en-US/firefox/addon/damn-center/"><img src="https://img.shields.io/amo/v/damn-center?label=firefox%20add-ons" alt="Firefox Add-ons version"></a>
  <a href="https://addons.mozilla.org/en-US/firefox/addon/damn-center/"><img src="https://img.shields.io/amo/users/damn-center?label=firefox%20users" alt="Firefox Add-ons users"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/rinn7e/damn-center-extension" alt="License: GPL-3.0"></a>
  <a href="AI-DECLARATION.md"><img src="https://img.shields.io/badge/䷼%20AI--DECLARATION-assist-fef9c3?labelColor=fef9c3" alt="AI-DECLARATION: assist"></a>
</p>

Many websites hug the left edge, which on a widescreen or ultrawide monitor means reading with your head turned. Damn Center adds padding beside the page to bring its content to the center of your screen, and remembers your setup per site. Pick the width and side, add a ruler to line things up, and choose colors or SVG patterns for the padding that follow your system's light/dark mode.

## Install

- **Chrome, Edge, Brave and other Chromium browsers**: [Chrome Web Store](https://chromewebstore.google.com/detail/damn-center/jljnmcioeicnlafnjmgknjgegnaccaii)
- **Firefox** (140 or later): [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/damn-center/)
- **Safari**: coming soon to the Mac App Store. Until then, [build it from source](#build-from-source).

Damn Center collects no data and makes no network requests. See the [privacy policy](PRIVACY.md) and [how it's built](doc/security.md).

## Screenshot

![Damn Center Screenshot](doc/images/readme-screenshot.png)

## Video Showcase

[![Damn Center 2.0 Showcase](https://img.youtube.com/vi/GnFG-Eb1EGc/maxresdefault.jpg)](https://www.youtube.com/watch?v=GnFG-Eb1EGc)

## Features

- **Per-Site Matches**: Save different settings per site or path with URL patterns. **+ New Match** adds a rule for the current page in one click, and a domain toggle switches a whole site on or off.
- **Width and Side**: Set the padding width with a slider, on the left, the right or both sides.
- **Layout-Safe Shifting**: Restructures the page with CSS Flexbox so the padding never covers content, while absolute and sticky elements stay in place (see [how it works](#layout-shifting-mechanism)).
- **Colors and Patterns**: Fill the padding with a color or an SVG pattern (grid, dots, stripes, carbon or lattice), with separate light and dark versions that follow your system or a mode you pick.
- **Alignment Ruler**: Overlay guide lines at 25%, 50% and 75% of the window to check the layout.
- **Steps Aside When Needed**: Pauses while a page is fullscreen (such as YouTube videos) and, if you like, whenever the window isn't maximized, including on Linux Wayland, where browsers misreport the window size.
- **Backup**: Export all your matches and settings to a file, and import them on another browser or computer.
- **Adjustable Popup**: Scale the popup's text from 12 to 32 px, and collapse the match list to keep it tidy.

See the [CHANGELOG](CHANGELOG.md) for changes in each release.

## Known Incompatibilities

The following websites are currently known to be incompatible with the extension's layout shifting mechanism:

- [YouTube Studio](https://studio.youtube.com/)
- [Gmail](https://mail.google.com/mail/)

Found another one? [Open an issue](https://github.com/rinn7e/damn-center-extension/issues/new/choose).

---

## Development

Built with **React**, **Vite**, **TypeScript**, **Tailwind CSS**, **react-tea-cup**, and **fp-ts**. See [CONTRIBUTING.md](CONTRIBUTING.md) for the checks to run before opening a pull request.

### Build from Source

You need [Node.js](https://nodejs.org/) 24+ and [pnpm](https://pnpm.io/).

```bash
pnpm install
cp .env.example .env.development
cp .env.example .env.production
```

| Command                  | Output                                                                                                                                                            |
| :----------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm run dev`           | Vite dev server for the popup UI.                                                                                                                                 |
| `pnpm run build`         | Development builds (`.env.development`, DEV icons, build date in the popup) for all browsers in `./dist/chrome`, `./dist/firefox` and `./dist/safari`, plus zips. |
| `pnpm run build:chrome`  | The development build for one browser (also `build:firefox`, `build:safari`).                                                                                     |
| `pnpm run build:release` | Release builds (`.env.production`) for all browsers, the same as the store versions, plus zips in `./dist/`.                                                      |

### Load the Extension into Your Browser

#### Chrome and Chromium-based browsers (Brave, Edge, Vivaldi, Opera)

1. Open the browser and navigate to `chrome://extensions/`.
2. Enable **Developer mode** using the toggle in the top-right corner.
3. Click the **Load unpacked** button in the top-left corner.
4. Select the `./dist/chrome` directory from this repository.

#### Firefox

1. Open the browser and navigate to `about:debugging#/runtime/this-firefox`.
2. Click the **Load Temporary Add-on...** button.
3. Select the `manifest.json` file inside the `./dist/firefox` directory.

#### Safari

1. Open the browser and open **Settings** (or **Preferences**).
2. Go to the **Advanced** tab and ensure **"Show features for web developers"** (or **"Show Develop menu in menu bar"**) is checked.
3. In the new **Develop** menu in your system menu bar, check **"Allow Unsigned Extensions"**.
4. Go to **Safari Settings > Developer** (or under **Develop** in the menu bar) and click **"Add Temporary Extension..."**.
5. Select the `./dist/safari` directory from this repository.

A temporary extension is removed when Safari quits. To keep it installed, build the Safari app wrapper instead (macOS with Xcode installed):

```bash
pnpm run generate:safari
```

This runs `build:safari:release` and converts `dist/safari` into an Xcode project in `./safari-extension/` (git-ignored). Open `safari-extension/Damn Center/Damn Center.xcodeproj`, run the **Damn Center** app once, then turn the extension on in **Safari Settings > Extensions**. Unsigned local builds still need **Allow Unsigned Extensions** enabled.

### Environment Variables

Builds load `.env.development` or `.env.production` depending on the mode. Both are ignored by git. `.env.example` holds the release values; set `VITE_DISABLE_LOG=false` in `.env.development` if you want console logs. Development builds always show the build date and use the DEV icons, so they're easy to tell apart from store builds.

| Variable                 | Description                                                                                                                 | `.env.example`   |
| :----------------------- | :-------------------------------------------------------------------------------------------------------------------------- | :--------------- |
| `VITE_UI_THEME_ID`       | Theme for the popup UI.                                                                                                     | `solarizedLight` |
| `VITE_DISABLE_LOG`       | Strips all `console.*` calls from the bundles when `true`.                                                                  | `true`           |
| `VITE_SHOW_BUILD_DATE`   | Shows the build date under the title in the popup header in release builds when `true` (development builds always show it). | `false`          |
| `VITE_DEFAULT_FONT_SIZE` | Default popup font size in pixels, until the user changes it (16 if unset).                                                 | `18`             |

### Layout Shifting Mechanism

To shift page content dynamically without breaking absolute or sticky elements, the extension restructures the document layout at the root using CSS Flexbox:

```
+-------------------------------------------------------------+
| html (display: flex; flex-direction: row; overflow: hidden) |
|                                                             |
| +------------+ +------------------------------+ +---------+ |
| | Left Pad   | | Body                         | |Right Pad| |
| | (order: 1) | | (order: 2; overflow-y: auto) | |(order:3)| |
| |            | |                              | |         | |
| | [Pattern]  | | [ Page Content ]             | | [Color] | |
| |            | |                              | |         | |
| +------------+ +------------------------------+ +---------+ |
+-------------------------------------------------------------+
```

1. **Root Flexbox Container**: The `html` element is transformed into a horizontal flex container.
2. **Constrained Scrollable Body**: Viewport scrolling is disabled on `html`, and shifted to `body` (`overflow-y: auto`). The body's width is constrained to make room for padding.
3. **Flex Order Positioning**: Left and right pads are inserted as flex items with explicitly defined orders, shifting the body content to the center dynamically.

### Project Docs

- [Code Convention](doc/code-convention.md): design principles and style rules.
- [Security](doc/security.md): the zero-network, local-storage design and permissions.
- [Release Guide](doc/release.md): versioning, building and publishing.
- [Design Assets](doc/assets.md): where the icons, screenshots and store graphics come from.

---

## AI Declaration

This project declares its AI usage in [AI-DECLARATION.md](AI-DECLARATION.md), following the [AI-DECLARATION.md](https://ai-declaration.md) standard (level: `assist`).

## License

This project is licensed under the GNU General Public License v3.0. See the [LICENSE](LICENSE) file for details.
