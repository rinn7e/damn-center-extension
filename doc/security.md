# Damn Center Security & User Trust Strategy

Browser extensions often demand broad permissions, making users cautious about potential malicious behavior (e.g., data harvesting, credential theft, or remote code execution). This document outlines the security architecture of Damn Center and strategies to build absolute trust with users.

---

## 1. Core Security Architecture

Damn Center is designed with a "local-first, zero-network" model. The extension behaves entirely offline and lacks the capability to transmit data.

### Zero Network Connections

- **No Background Service Workers**: Damn Center does not run a background script or service worker. Without a background process, the extension cannot coordinate background network activity.
- **No External Fetch/XHR Calls**: The codebase contains no `fetch`, `XMLHttpRequest`, or WebSockets implementations.
- **No Third-Party Telemetry**: There are no tracking scripts, analytics SDKs (e.g., Google Analytics), or crash-reporting libraries integrated.

### Strictly Local Storage

- All domain configuration values, custom widths, and theme preferences are stored locally on the user's machine using `chrome.storage.local`.
- No user data is sent to external servers, cloud databases, or syncing services.

### Permissions

The manifests request only two permissions, plus one content script:

- **storage**: saves your matches and settings in `chrome.storage.local`.
- **activeTab**: lets the popup read the current tab's URL, so it can show and add the matches for that page.
- **Content script on all `http` and `https` pages** (`"matches": ["http://*/*", "https://*/*"]`, `run_at: document_start`): this is the broad one. Because padding has to be applied as a page loads, before you open the popup, the script runs on every site. It reads your saved matches from local storage and, only on pages that match an enabled rule, adds the padding elements and a `<style>` tag. It doesn't read page content, forms or cookies, and it makes no network requests. Browsers show this as "read and change data on all websites".

---

## 2. Strategies for Establishing User Trust

To prove to users that Damn Center is secure, we implement the following transparency strategies:

### Open-Source Codebase and Audits

- **Public Repository**: Keep the source code public on GitHub, allowing developers to inspect every line of code, dependency, and configuration.
- **Dependency Audit**: The project uses `pnpm-lock.yaml` to pin exact, audited dependency hashes, making the build chain transparent and repeatable.

### Verifiable and Reproducible Builds

- **Unpacked Installation Instructions**: Explain clearly in the main `README.md` how users can load the unpacked extension in developer mode directly from the source code.
- **Minified, Not Obfuscated**: Release builds are minified by Vite but not obfuscated. Anyone can rebuild from source with `pnpm run build:release` and compare the output with the store package.

### Robust Content Security Policy (CSP)

- Configure a strict CSP inside both `manifest.chrome.json` and `manifest.firefox.json` that prevents the execution of remote scripts:
  ```json
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self';"
  }
  ```
  This guarantees that even if a dependency had a vulnerability, the browser would block it from executing arbitrary inline scripts or fetching code from remote domains.

### Clear and Legally-Binding Privacy Policy

- Provide a simple, jargon-free Privacy Policy document in the store listings stating:
  > "Damn Center does not collect, store, or transmit any personal data, browsing history, or configuration settings. All settings are kept locally on your browser via local storage and never leave your device."

---

## 3. Review Submission Strategy

When submitting updates to browser extension stores:

- **Chrome Web Store Developer Console**: In the "Single Purpose" and "Privacy" sections, explicitly declare that the extension only stores local website configurations and operates entirely offline.
- **Mozilla AMO Submission**: Since Mozilla manually reviews extensions using compilers/bundlers, we submit the source (`dist/damn-center-source-v<VERSION>.zip`, every file tracked in git) with clear instructions. This allows Mozilla's reviewers to build the files themselves and verify that the binary on the store exactly matches the audited source code.
