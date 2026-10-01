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
- **Reproducible builds**: release builds are minified by Vite but not obfuscated, and the build is reproducible. Rebuild with `pnpm run build:release` and the files match the ones inside the store package byte for byte.
- **Checksums**: each GitHub release is built by CI from the tagged commit and lists the SHA-256 of its zips in `SHA256SUMS.txt`.
- **Store review**: Mozilla reviewers receive the full source of each release and rebuild it to confirm the package matches.

## Dependencies

- `pnpm-lock.yaml` pins exact dependency versions and hashes, so builds use exactly the reviewed dependencies.
- Dependabot proposes dependency and GitHub Actions updates each month and opens pull requests for known vulnerabilities. Branch protection requires CI to pass before any of them can merge.
- The extension packages contain only Damn Center's code and the runtime libraries listed under `dependencies` in `package.json` (React, fp-ts, io-ts, picomatch and a few small helpers); build and test tools never ship.
