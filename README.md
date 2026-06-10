![Damn Center Logo](public/icon128.png)

# Damn Center - the page !

A browser extension that adds customizable left and right padding to web pages. Features include adjustable widths, domain-specific URL matching rules, a vertical layout alignment ruler, theme-aware background styling, and SVG patterns.

Built with **React**, **Vite**, **TypeScript**, **Tailwind CSS**, **react-tea-cup**, and **fp-ts**.

## Getting Started

### 1. Install Dependencies

Install dependencies using `pnpm`:

```bash
pnpm install
```

### 2. Development

Run the development server:

```bash
pnpm run dev
```

### 3. Build

Compile production bundles for Chrome and Firefox:

```bash
pnpm run build
```

The build scripts output compiled extension bundles to `./dist/chrome` and `./dist/firefox` containing browser-specific manifests and assets.

### 4. Development Build

Compile development bundles for Chrome and Firefox (which load `.env.development` variables and preserve source maps, without zipping):

```bash
pnpm run build:dev
```

---

## Installation

### Web Stores (Recommended)

- **Chrome Web Store**: Under Review / Coming Soon
- **Firefox Add-ons**: Coming Soon

---

### Manual Build & Installation

If you prefer to compile and install the extension yourself, follow these steps:

#### 1. Build from Source

Ensure you have [Node.js](https://nodejs.org/) and [pnpm](https://pnpm.io/) installed.

```bash
# Install dependencies
pnpm install

# Build the production bundles for both browsers
pnpm run build
```

This compiles the extension code and outputs target directories:

- `./dist/chrome` for Chrome and Chromium-based browsers.
- `./dist/firefox` for Firefox.

#### 2. Load the Extension into Your Browser

##### For Chrome and Chromium-based Browsers (Brave, Edge, Vivaldi, Opera)

1. Open the browser and navigate to `chrome://extensions/`.
2. Enable **Developer mode** using the toggle in the top-right corner.
3. Click the **Load unpacked** button in the top-left corner.
4. Select the `./dist/chrome` directory from this repository.

##### For Firefox

1. Open the browser and navigate to `about:debugging#/runtime/this-firefox`.
2. Click the **Load Temporary Add-on...** button.
3. Select the `manifest.json` file inside the `./dist/firefox` directory.

---

## Environment Variables

The project loads configurations from environment files based on the build target mode:

| Variable Name          | Description                                                                                                   | Default / Example Value      |
| :--------------------- | :------------------------------------------------------------------------------------------------------------ | :--------------------------- |
| `VITE_UI_THEME_ID`     | Theme identifier for the extension's popup UI.                                                                | `solarizedLight`             |
| `VITE_DISABLE_LOG`     | Strips all `console.*` (log, warn, error, info, debug) calls from compiled bundles if set to `true`.          | `true` (prod), `false` (dev) |
| `VITE_SHOW_BUILD_DATE` | Displays the formatted date/time of the build under the extension title in the popup header if set to `true`. | `true`, `false`              |

---

## Features

- **Width Adjustment**: Scale padding width dynamically using the popup slider.
- **Side Selection**: Apply padding to the left side, right side, or both sides.
- **Alignment Ruler**: Toggle a vertical centered ruler guide to assist with layout alignment.
- **Layout Shifting**: Shifts page content dynamically using flexbox layout rules to prevent padding from overlapping page content.
- **Theme Compatibility**: Supports independent configurations for Light and Dark modes. Can sync with system preferences (`prefers-color-scheme`) or force a specific mode.
- **SVG Patterns**: Apply customizable SVG background patterns (grids, dots, stripes, carbon, or lattice) over background colors.
- **Disable when Not Maximized**: Automatically suspends padding and alignment rules when the window is tiled, restored, or not fully maximized. Bypasses OS-level and fractional browser zoom discrepancies (such as Chrome on Linux Wayland bugs) to keep window space fully optimized.
- **Collapsible Matches**: Collapse list items in the popup UI to organize configuration matches.

---

## Layout Shifting Mechanism

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

---

## Known Incompatibilities

The following websites are currently known to be incompatible with the extension's layout shifting mechanism:

- [https://studio.youtube.com/](https://studio.youtube.com/) (YouTube Studio)
- [https://mail.google.com/mail/](https://mail.google.com/mail/) (Gmail)

---

## Video Showcase

[![Damn Center Showcase](https://img.youtube.com/vi/Yc29sO4jF9g/0.jpg)](https://www.youtube.com/watch?v=Yc29sO4jF9g)

---

## License

This project is licensed under the GNU General Public License v3.0. See the [LICENSE](LICENSE) file for details.
