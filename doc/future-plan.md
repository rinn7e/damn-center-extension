# Future plan

Ideas under consideration, in no particular order. Shipped items move to the
[CHANGELOG](../CHANGELOG.md).

## Features

- Auto-disable while the developer console is open.
- A 4-column option for the alignment ruler.

## Known bugs

- **The suggested rule gets saved by unrelated toggles.** On a site with no
  saved rules, the popup shows a suggested rule (80px, dots) that isn't saved
  yet. Changing a global setting there (extension on/off, ruler, "disable when
  not maximized", popup font size) or switching the site off and on saves the
  site's whole rule list, including that suggestion. The site then gets padding
  the user never added, and storage collects rules for every site where the
  popup was used. Cause: those handlers in `src/update.ts` call
  `saveSettingsCmd` with `model.padSettingList`, which on such a site is the
  unsaved suggestion from `loadInitialDataCmd`. The popup needs to tell a
  suggested rule apart from a saved one; how to model that is still to be
  decided.

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
