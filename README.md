![Damn Center Logo](public/icon128.png)

# Damn Center - the page !

A browser extension that adds customizable left and right padding to web pages. Features include adjustable widths, domain-specific URL matching rules, a vertical layout alignment ruler, theme-aware background styling, and SVG patterns.

Built with **React 19**, **Vite 6**, **TypeScript**, **Tailwind CSS v4**, **react-tea-cup**, and **fp-ts**.

---

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

---

## Installation

To load the built extension into your browser:

1. Build the production bundles:
   ```bash
   pnpm run build
   ```
2. Open the browser's extension management page:
   - Chrome: `chrome://extensions/`
   - Firefox: `about:debugging#/runtime/this-firefox`
3. Enable developer mode:
   - Chrome: Toggle **Developer mode** in the top-right corner.
4. Load the compiled extension:
   - Chrome: Click **Load unpacked** and select the `./dist/chrome` directory.
   - Firefox: Click **Load Temporary Add-on...** and select any file inside the `./dist/firefox` directory (e.g., `manifest.json`).

---

## Features

- **Width Adjustment**: Scale padding width dynamically using the popup slider.
- **Side Selection**: Apply padding to the left side, right side, or both sides.
- **Alignment Ruler**: Toggle a vertical centered ruler guide to assist with layout alignment.
- **Layout Shifting**: Shifts page content dynamically using flexbox layout rules to prevent padding from overlapping page content.
- **Theme Compatibility**: Supports independent configurations for Light and Dark modes. Can sync with system preferences (`prefers-color-scheme`) or force a specific mode.
- **SVG Patterns**: Apply customizable SVG background patterns (grids, dots, stripes, carbon, or lattice) over background colors.
- **Collapsible Matches**: Collapse list items in the popup UI to organize configuration matches.

---

## License

This project is licensed under the GNU General Public License v3.0. See the [LICENSE](LICENSE) file for details.
