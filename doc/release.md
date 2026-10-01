# Release Procedure Guide

Follow this guide step-by-step to compile, package, tag, and publish a new release of the **Damn Center** extension.

---

## 1. Pre-Release Verification

Before tagging a release, ensure the codebase is clean, type-safe, and all tests pass.

```bash
# 1. Clean format and check lints
pnpm run format
pnpm run lint

# 2. Run TypeScript type checks
pnpm run check

# 3. Run all unit tests
pnpm run test
```

Ensure everything compiles in development mode without issues (load
`dist/chrome` unpacked to try it; dev builds use the `-dev` icons and show the
build date in the popup):

```bash
pnpm run build:chrome
```

`src/worker/content.ts` has no automated tests, so try the build by hand on a
few real sites before releasing: a docs site, a news article, a page with a
sticky header, and fullscreen video. Check both shifting strategies and the
ruler.

If the release changes the storage schema, follow the
[storage migration strategy](storage-migration.md) first.

---

## 2. Version Bumping

The version lives only in **`package.json`**. The build writes it into each
browser's `manifest.json`, and the zip names follow it, so bump it there:

1. **`package.json`**: update the `"version"` field (e.g. `2.0.0` → `2.1.0`).
2. **`CHANGELOG.md`**:
   - Rename `## [Unreleased]` to `## [<VERSION>] - <YYYY-MM-DD>` and add a new, empty `## [Unreleased]` above it.
   - At the bottom, point `[Unreleased]` at `compare/v<VERSION>...HEAD` and add `[<VERSION>]: .../compare/v<PREVIOUS>...v<VERSION>`.

The release workflow fails if the tag doesn't match `package.json` or if `CHANGELOG.md` has no section for the version.

---

## 3. Build & Package Production Assets

The release workflow builds the published zips for you (see step 5). Build locally first to try the release build before tagging:

```bash
pnpm run build:release
```

Use `build:release`, not `build`: `build` compiles in development mode, so its
zips would contain the `-dev` icons and the build-date line.

This script compiles `dist/chrome`, `dist/firefox` and `dist/safari`, and outputs these archives in `./dist/`:

- `dist/damn-center-chrome-v<VERSION>.zip` (Chrome extension package)
- `dist/damn-center-firefox-v<VERSION>.zip` (Firefox extension package)
- `dist/damn-center-safari-v<VERSION>.zip` (Safari extension package)
- `dist/damn-center-source-v<VERSION>.zip` (every file tracked in git, with your working-tree changes; handy for checking locally, while AMO gets the release's **Source code (zip)**)

---

## 4. Git Commit and Tagging

Commit the version bump changes, create a git tag, and push them to the repository:

```bash
# 1. Stage and commit version bump files
git add package.json CHANGELOG.md
git commit -m "[Release] bump version to v<VERSION>"

# 2. Create an annotated git tag
git tag -a v<VERSION> -m "Release v<VERSION>"

# 3. Push commits and tags to GitHub
git push origin master
git push origin v<VERSION>
```

---

## 5. Publish on GitHub

Pushing the tag runs the [Release workflow](../.github/workflows/release.yml). It:

1. checks that the tag matches the `package.json` version,
2. runs the type check and tests, then `build:release`,
3. creates a **draft** release titled `Damn Center v<VERSION>`, with this version's `CHANGELOG.md` section as the notes and the Chrome, Firefox and Safari zips attached.

Open the draft under **Releases**, add a one-line summary at the top if you like, and click **Publish release**. If the workflow fails, fix the problem, delete and re-push the tag (`git tag -d v<VERSION> && git push origin :v<VERSION>`), then tag again.

Upload the zips from the release to the stores, not a local build, so the stores and GitHub get identical files.

---

## 6. Submit to Browser Web Stores

### Chrome Web Store (Chrome Developer Dashboard)

1. Log in to the [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole).
2. Click on the **Damn Center** item.
3. Go to the **Package** section and upload `damn-center-chrome-v<VERSION>.zip` from the GitHub release.
4. Fill in store listing metadata if changed, and submit for review.
5. In **Privacy**, keep the declaration that the extension stores settings locally and transmits no user data.

### Firefox Add-ons (Mozilla Developer Hub)

1. Log in to the [Firefox Add-on Developer Hub](https://addons.mozilla.org/developers/).
2. Submit a new version of the extension.
3. Upload `damn-center-firefox-v<VERSION>.zip` from the GitHub release.
4. When asked whether the code is compiled or minified, answer **Yes** and upload the release's **Source code (zip)** from GitHub (every file tracked in git at the tag).
5. Build instructions for the reviewer: "Install Node.js 24+ and pnpm, run `pnpm install`, `cp .env.example .env.production`, then `pnpm run build:firefox:release`. The output is in `dist/firefox/`."
6. Follow the steps for listing review. The license is GPL-3.0.

### Store listing assets

Update these when the UI or branding changes; see [Design Assets](assets.md) for how they're made.

- **Chrome**: 128×128 icon (in the package), 1–5 screenshots at 1280×800, the 440×280 small promo tile, and the text in [store-description.md](store-description.md).
- **Firefox**: screenshots, summary (max 250 characters) and description from [store-description.md](store-description.md).
