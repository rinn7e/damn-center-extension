# Future plan

Ideas under consideration, in no particular order. Shipped items move to the
[CHANGELOG](../CHANGELOG.md).

## Features

- Auto-disable while the developer console is open.
- A 4-column option for the alignment ruler.

## Project

- **Real-browser tests**: the tests run the content script in a simulated page
  (jsdom). A Playwright test that loads `dist/chrome` into real Chromium, adds
  a rule in the popup and checks the padding on a real page would catch layout
  and manifest problems that jsdom can't, and automate the manual check in the
  [release guide](release.md).
- **Translations**: move the popup's text and the store listing into
  `_locales/<language>/messages.json`, so browsers show the extension in the
  user's language. Only worth it once there's demand from non-English users,
  since every string needs a translator.
- **Automatic store uploads**: have the release workflow upload the zips to the
  Chrome Web Store and Firefox Add-ons through their APIs when a GitHub release
  is published. Needs API keys stored as GitHub secrets, and removes the
  manual check before a version goes to store review; not worth it while
  releases are infrequent.
