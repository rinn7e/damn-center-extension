# Security Design

Browser extensions often ask for broad permissions, so it's fair to wonder what they do with them. This document describes how Damn Center is built, what it can and can't do, and how you can check it yourself. For what happens to your data, see the [privacy policy](../PRIVACY.md); to report a vulnerability, see [SECURITY.md](../SECURITY.md).

---

## No Network Access

Damn Center works entirely offline.

- **No background script**: the manifests declare no background script or service worker, so nothing runs when the popup is closed except the content script described below.
- **No network requests**: the source contains no `fetch`, `XMLHttpRequest`, `WebSocket` or `sendBeacon` calls.
- **No telemetry**: no analytics, tracking or crash-reporting code is included.

## Local Storage Only

- Your matches, widths, colors and preferences are stored with `chrome.storage.local`, on your device only. They aren't synced to your browser account or sent anywhere.
- **Export** writes a JSON file that you save yourself, and **Import** reads one you choose. Neither involves a server.

## Permissions

The manifests request only two permissions, plus one content script:

- **storage**: saves your matches and settings in `chrome.storage.local`.
- **activeTab**: lets the popup read the current tab's URL, so it can show and add the matches for that page.
- **Content script on all `http` and `https` pages** (`"matches": ["http://*/*", "https://*/*"]`, `run_at: document_start`): this is the broad one. Because padding has to be applied as a page loads, before you open the popup, the script runs on every site. It reads your saved matches from local storage and, only on pages that match an enabled rule, adds the padding elements and a `<style>` tag. It doesn't read page content, forms or cookies, and it makes no network requests. Browsers show this as "read and change data on all websites".

## Content Security Policy and Remote Code

- All three manifests (`manifests/manifest.{chrome,firefox,safari}.json`) set a strict CSP for the extension's own pages:
  ```json
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self';"
  }
  ```
  This applies to the popup: it can only run scripts bundled with the extension, never inline or remote ones. It doesn't cover the content script, which runs inside each web page under that page's own rules, and it doesn't restrict network requests.
- Manifest V3 itself forbids remotely hosted code everywhere in the extension, including the content script: everything that runs ships inside the reviewed package.
- The content script's safety comes from what it does, which you can audit in `src/worker/content.ts`: it only reads your settings from local storage and adds the padding elements and a `<style>` tag, as described under [Permissions](#permissions).

---

## Verifying It Yourself

- **Open source**: all code, dependencies and build configuration are in this repository, under the GPL-3.0.
- **Build from source**: the [README](../README.md#build-from-source) explains how to build the extension and load it unpacked, instead of installing it from a store.
- **Reproducible builds**: release builds are minified by Vite but not obfuscated, and the build is reproducible: rebuilding a tag with `pnpm run build:release` gives files identical, byte for byte, to the ones in that GitHub release's zips. The store packages contain the same code, but the stores add their own files (Chrome, for example, adds an `update_url` to `manifest.json`), so compare against the GitHub release.
- **Checksums and provenance**: each GitHub release is built by CI from a tagged commit on `master`. It lists the SHA-256 of its zips in `SHA256SUMS.txt`, and GitHub signs a build provenance attestation for them. Check a downloaded zip with `gh attestation verify <zip> -R rinn7e/damn-center-extension`.
- **Store review**: Mozilla reviewers receive the full source of each release and rebuild it to confirm the package matches.

## Dependencies

- `pnpm-lock.yaml` pins exact dependency versions and hashes, so builds use exactly the reviewed dependencies.
- Dependabot proposes minor and patch updates for dependencies and GitHub Actions each month, and opens pull requests for known vulnerabilities. Major upgrades are done by hand. Branch protection requires CI to pass before any pull request, including these, can merge.
- GitHub CodeQL scans the code for security issues on every push to `master`, on every pull request and once a week.
- The extension packages contain only Damn Center's code and the runtime libraries listed under `dependencies` in `package.json` (React, fp-ts, io-ts, picomatch and a few small helpers); build and test tools never ship.
