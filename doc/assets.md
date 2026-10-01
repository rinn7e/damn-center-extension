# Design Assets

The icons, screenshots, store graphics and showcase videos are generated with
the maintainer's own tooling, not drawn by hand. Please don't edit these files
directly: open an issue or ask the maintainer, so the source and the files
stay in sync.

## Generated assets

| Asset | File |
|---|---|
| Extension icons | `public/icon{16,32,48,128}.png` |
| Development icons (orange DEV badge, used by dev builds) | `public/icon{16,32,48,128}-dev.png` |
| README screenshot | `doc/images/readme-screenshot.png` |
| Chrome Web Store small promo tile (440×280) and store screenshots (1280×800) | not stored in this repo |
| YouTube thumbnail and showcase video | not stored in this repo |

Screenshots and videos are captured from `dist/chrome`, so build the version
you want to show first (`pnpm run build:release` for clean shots without the
`-dev` icons and build-date line).

## Rules

- **Icon sizes:** the 16px and 32px icons are drawn on a pixel grid so they
  stay sharp in the toolbar. The 128px icon is 96px artwork centered on a
  transparent 128px canvas, following the Chrome Web Store icon guideline.
- **Docs-only images** (README screenshots and the like) go in `doc/images/`,
  never in `public/`: everything in `public/` is copied into the extension
  package.
- **Brand:** the Solarized palette used by the popup (teal `#2aa198`, cream
  `#fdf6e3`, navy `#002b36` / `#073642`) and the Inter font.
