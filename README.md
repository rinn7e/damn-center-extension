# Damn Center

A premium, highly-polished Chrome extension that allows adding customizable left and right padding to any website. The padding features arbitrary widths, domain-specific URL configuration matches, a vertical alignment ruler, and gorgeous theme-aware custom background colors or SVG patterns.

Built with **React 19**, **Vite 6**, **TypeScript**, **Tailwind CSS v4**, and **fp-ts** + **io-ts**.

---

## Getting Started

### 1. Install Dependencies

Ensure you have `pnpm` installed, then run the installation command inside the extension directory:

```bash
pnpm install
```

### 2. Run Local Development Server

To start development mode with hot-reloading:

```bash
pnpm run dev
```

### 3. Build for Production

To typecheck the project and bundle it into the static `dist/` directory for Chrome:

```bash
pnpm run build
```

This output is saved to the `./dist` folder, which contains `manifest.json`, `content.js`, and the React popup assets.

---

## Installing the Extension in Google Chrome

To install the built extension into your browser, follow these simple steps:

1. **Build the extension** using the production command:
   ```bash
   pnpm run build
   ```
2. Open Google Chrome and navigate to the Extensions management page:
   ```text
   chrome://extensions/
   ```
3. In the top-right corner, toggle the **Developer mode** switch to **ON**.
4. In the top-left, click the **Load unpacked** button.
5. In the file picker, select the compiled **`dist`** directory of this project:
   ```text
   /path/to/symmetry-project/damn-center-extension/dist
   ```
6. The **Damn Center** extension icon will now appear in your toolbar. Pin it for easy access!

---

## Features & Configuration

- **Real-time Live Width Adjustment**: Drag the width slider inside the popup to instantly scale the padding space.
- **Flexible Side Selectors**: Support padding Left, Right, or Both sides simultaneously.
- **Full-Page Alignment Ruler**: Toggle a vertical centered ruler guide on your pages to help you align layouts precisely.
- **Modern Flexbox Layout Shifting**: Page content is shifted dynamically using a clean flexbox structure with structural `order` property, ensuring side pads never overlap content and compatibility with fixed headers.
- **Auto-Theme & Color Schemes**:
  - Independent configurations for **Light Mode** and **Dark Mode**.
  - **Theme Trigger Mode**: Explicitly force light, dark, or set to `System` to automatically sync with your OS preferences (`prefers-color-scheme`).
- **SVG Background Patterns**: Choose from custom grids, dots, stripes, carbon texture, or Moroccan lattices that blend dynamically with any selected background color.
- **Collapsible Matches**: Keep your popup clean by collapsing the match cards list when not in use.

---

## License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.
