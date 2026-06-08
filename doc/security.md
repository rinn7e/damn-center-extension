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

### Permission Minimization

- **activeTab**: Used to dynamically apply padding styles to the current tab when the user interacts with the extension popup.
- **storage**: Used to persist website settings across sessions.
- **host_permissions**: Configured strictly for matching domains during automatic style injection.

---

## 2. Strategies for Establishing User Trust

To prove to users that Damn Center is secure, we implement the following transparency strategies:

### Open-Source Codebase and Audits

- **Public Repository**: Keep the source code public on GitHub, allowing developers to inspect every line of code, dependency, and configuration.
- **Dependency Audit**: The project uses `pnpm-lock.yaml` to pin exact, audited dependency hashes, making the build chain transparent and repeatable.

### Verifiable and Reproducible Builds

- **Unpacked Installation Instructions**: Explain clearly in the main `README.md` how users can load the unpacked extension in developer mode directly from the source code.
- **No Obfuscation**: The Vite bundler config does not compress or obfuscate variables beyond standard minification. Users can inspect the compiled `dist/chrome/content.js` or `dist/firefox/content.js` and easily map it back to the original source.

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
- **Mozilla AMO Submission**: Since Mozilla manually reviews extensions using compilers/bundlers, we submit the original source files (`source-code.zip`) with clear instructions. This allows Mozilla's reviewers to build the files themselves and verify that the binary on the store exactly matches the audited source code.
