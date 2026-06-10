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

Ensure everything compiles in development mode without issues:
```bash
pnpm run build:dev
```

---

## 2. Version Bumping

The extension version must be synchronized across three files. Update the version string (e.g., `1.0.1` -> `1.0.2`):

1. **`package.json`**: Update the `"version"` field.
2. **`manifests/manifest.chrome.json`**: Update the `"version"` field.
3. **`manifests/manifest.firefox.json`**: Update the `"version"` field.

---

## 3. Build & Package Production Assets

Compile the production bundles and auto-package the zip files:

```bash
pnpm run build
```

This script will compile files into `dist/chrome` and `dist/firefox`, and then output three zipped archives in the `./dist/` directory:
*   `dist/damn-center-chrome-v<VERSION>.zip` (Chrome extension package)
*   `dist/damn-center-firefox-v<VERSION>.zip` (Firefox extension package)
*   `dist/damn-center-source-v<VERSION>.zip` (Source code package for store review, excluding `node_modules`, `dist`, `.git`, `backup`, `.github`, and `scratch`)

---

## 4. Git Commit and Tagging

Commit the version bump changes, create a git tag, and push them to the repository:

```bash
# 1. Stage and commit version bump files
git add package.json manifests/manifest.chrome.json manifests/manifest.firefox.json
git commit -m "chore: bump version to v<VERSION>"

# 2. Create an annotated git tag
git tag -a v<VERSION> -m "Release v<VERSION>"

# 3. Push commits and tags to GitHub
git push origin master
git push origin v<VERSION>
```

---

## 5. Publish on GitHub

1. Navigate to your repository on GitHub.
2. Under **Releases** on the right sidebar, click **Create a new release** (or **Draft a new release**).
3. Choose the tag `v<VERSION>` you just pushed.
4. Set the Release Title to `Damn Center v<VERSION>`.
5. Write a brief summary of the changes/features added in this release.
6. Drag and drop the compiled `.zip` files from your local `./dist/` directory into the **Attach binaries** box:
   *   `damn-center-chrome-v<VERSION>.zip`
   *   `damn-center-firefox-v<VERSION>.zip`
7. Click **Publish release**.

### Example Configuration (for v1.0.1):

*   **Tag version**: `v1.0.1`
*   **Target**: `master` (or select the branch/commit)
*   **Release Title**: `Damn Center v1.0.1`
*   **Description**:
    ```markdown
    ## What's New in v1.0.1 🚀

    This release adds automatic window maximization detection, an alignment guide ruler, customizable background SVG patterns, and dynamic versioning.

    ### Key Features:
    * **"Disable when Not Maximized" Option**: Automatically suspends padding and alignment rules when the browser window is tiled or resized (bypasses Linux Wayland viewport bugs).
    * **Triple-Line Alignment Ruler**: Added layout guide split lines at 25%, 50%, and 75% width.
    * **SVG Background Patterns**: Added Dotted Grid, Diagonal Stripes, Aesthetic Grid, Carbon Fiber, and Moroccan Lattice overlays.
    * **Dynamic Version Header**: Displays manifest version and build date inside the popup UI.

    ### Release Packages 📦
    Please download the appropriate bundle for your browser and load it manually:
    * `damn-center-chrome-v1.0.1.zip` (Chrome)
    * `damn-center-firefox-v1.0.1.zip` (Firefox)
    ```

---

## 6. Submit to Browser Web Stores

### Chrome Web Store (Chrome Developer Dashboard)
1. Log in to the [Chrome Developer Dashboard](https://developer.chrome.com/dashboard).
2. Click on the **Damn Center** item.
3. Go to the **Package** section and upload the `dist/damn-center-chrome-v<VERSION>.zip` file.
4. Fill in store listing metadata if changed, and submit for review.

### Firefox Add-ons (Mozilla Developer Hub)
1. Log in to the [Firefox Add-on Developer Hub](https://addons.mozilla.org/developers/).
2. Submit a new version of the extension.
3. Upload the `dist/damn-center-firefox-v<VERSION>.zip` file.
4. Follow the steps for self-distribution or listing review.
