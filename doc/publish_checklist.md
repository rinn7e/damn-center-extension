# Damn Center Publishing Checklist

This checklist guides the process of packaging, validating, and submitting the Damn Center browser extension to both the Chrome Web Store and Firefox Add-ons (AMO) directory.

---

## 1. Final Code Validation

Before packaging the extension, run final quality assurance checks in the project directory:

- [ ] **Type Check**: Run `pnpm run check` and verify that there are zero TypeScript compiler errors.
- [ ] **Lint Check**: Run `pnpm run lint` and verify that there are zero ESLint warnings or errors.
- [ ] **Formatting**: Run `pnpm run format` to ensure consistency in code styling.
- [ ] **Clean Production Build**: Run `pnpm run build` to compile the final files. Verify that the output directories `dist/chrome/` and `dist/firefox/` contain all compiled assets (HTML, CSS, JS, and icons).

---

## 2. Store Listing Assets

Prepare the required graphical and textual assets for the store listing page.

### Chrome Web Store Assets

- [ ] **Icon**: 128x128 PNG (already included in the extension build as `icon128.png`).
- [ ] **Screenshots**: At least 1 (maximum 5) screenshot of the extension popup and content modifications in action.
  - Dimension: 1280x800 or 640x400 pixels (PNG or JPEG).
- [ ] **Store Description**:
  - Short description (max 132 characters): "Add beautiful, customizable left or right padding to any website with support for theme-aware custom colors and SVG patterns."
  - Detailed description: Summarize features (customizable padding, saved per-site, theme-aware presets, red ruler helper, and glob pattern matches).
- [ ] **Category**: Productivity or Developer Tools.
- [ ] **Privacy Policy**: (Required if using storage APIs to collect preferences, although Damn Center storage is strictly local/offline).

### Firefox Add-on (AMO) Assets

- [ ] **Icon**: 128x128 PNG (included).
- [ ] **Screenshots**: At least 1 screenshot showing the popup dashboard.
- [ ] **Short Summary**: Max 250 characters describing the extension.
- [ ] **Full Description**: Text detailing the key features and advantages.
- [ ] **License**: Select a standard open-source license (e.g., MIT, matching package configuration).

---

## 3. Packaging and Archiving

To upload the extension, the compiled target files must be compressed into separate ZIP files.

- [ ] **Chrome Extension Archive**:
  - Compress the **contents** of the `dist/chrome/` directory.
  - Do _not_ compress the parent `dist/` or `chrome/` directory itself; the `manifest.json` must be at the root of the ZIP file.
  - Command reference: `cd dist/chrome && zip -r ../damn-center-extension.zip .`
- [ ] **Firefox Extension Archive**:
  - Compress the **contents** of the `dist/firefox/` directory.
  - The `manifest.json` must be at the root of the ZIP file.
  - Command reference: `cd dist/firefox && zip -r ../firefox-extension.zip .`
- [ ] **Firefox Source Code Archive (Required by Mozilla)**:
  - Mozilla requires the source code to be submitted for review if build tools or bundlers (like Vite) are used.
  - Compress the source files, excluding `node_modules` and built outputs.
  - Archive contents should include: `src/`, `manifests/`, `public/`, `index.html`, `vite.config.ts`, `package.json`, `tsconfig.json`, and `pnpm-lock.yaml`.
  - Command reference: `zip -r source-code.zip src manifests public index.html vite.config.ts package.json tsconfig.json pnpm-lock.yaml`

---

## 4. Submission Steps

### Chrome Web Store Submission

1. Go to the [Chrome Developer Dashboard](https://developer.chrome.com/dashboard).
2. Sign in with a Google Account (requires a one-time developer registration fee of $5 USD).
3. Click **Add new item**.
4. Upload the packaged `damn-center-extension.zip` file.
5. Fill in the **Store Listing** details (Description, Icons, Screenshots).
6. Fill in the **Privacy** section:
   - Declare that the extension only stores local settings and does not transmit user data.
7. Fill in the **Distribution** details (Public / Unlisted / Private).
8. Click **Submit for review**.

### Firefox Add-ons (AMO) Submission

1. Go to the [Firefox Add-on Developer Hub](https://addons.mozilla.org/developers/).
2. Sign in or create a Mozilla Account.
3. Click **Submit a New Add-on**.
4. Choose **On this site** (to make it searchable on AMO) or **On your own** (if you prefer to distribute it manually).
5. Upload the packaged `firefox-extension.zip` file.
6. When prompted if the extension uses compiled, minified, or obfuscated source code, select **Yes**.
7. Upload the `source-code.zip` file containing the source code and configuration files.
8. Enter a brief explanation of how to build the files (e.g., "Run `pnpm install` and `pnpm run build` to output the bundled files to `dist/firefox/`").
9. Fill in the listing details (Description, License, Categories).
10. Click **Submit**.

---

## 5. Storage Migration Strategy (Schema Updates)

In the event that the storage data structures (e.g., `PadSettings` or `GlobalSetting` schemas inside `type.ts`) need to be updated in a future version, follow this migration strategy to prevent user data loss:

### Schema Versioning

- Define a `schema_version` key inside the `global_settings` storage namespace.
- Initialize the current version (e.g., `schema_version: 1`).
- On extension startup (or database initialization), check the existing `schema_version` before loading/decoding other values.

### Migration Implementation Patterns

If the schema needs modification in future versions, use one of the following patterns in `src/storage/storage.ts`:

1. **io-ts Decoder Fallbacks (Soft Migration)**:
   - Use `io-ts` unions (`t.union`) or custom types to decode older versions of the codec.
   - Example: If a field named `match` was renamed to `matchPattern`, decode with a union matching both types, and mapping the old key to the new key dynamically:
     ```typescript
     const OldPadSettingsCodec = t.type({ match: t.string })
     const NewPadSettingsCodec = t.type({ matchPattern: t.string })
     // Map incoming data to new schema during decoding
     ```

2. **Database Migration Runner (Hard Migration)**:
   - Implement a migration function `migrateData(fromVersion: number, toVersion: number): TE.TaskEither<Error, void>` which runs sequentially.
   - For example, if migrating V1 -> V2:
     - Read all stored keys (all hostnames).
     - Backup raw settings under a backup key (e.g. `backup_v1_[hostname]`) as a fallback.
     - Map over each domain's `PadSettings[]`, mutate the objects to match the V2 structure, and save them back.
     - Save `schema_version: 2` in `global_settings`.

### Release Steps for Migrations

- [ ] **Create Backup**: Implement automatic key backups before writing modified data structures.
- [ ] **Write Unit Tests**: Always write unit tests in the scratch area or testing suite validating that V(N-1) raw storage JSON correctly translates to VN structures without data loss.
- [ ] **Run Manual QA**: Verify update compatibility by loading a V(N-1) build in a clean browser profile, adding a few saved websites, updating to the target VN build, and confirming that custom padding values and ruler configurations are preserved.

---

## 6. Community Showcase

Once the extension is published and approved on the Chrome Web Store and Firefox Add-ons (AMO), share it with developer and user communities to gather feedback and drive adoption.

### Reddit Communities

- **r/chrome_extensions**: Specifically dedicated to sharing and discussing Chrome extensions. Post a clean screenshot of the popup and describe the layout advantages of Damn Center.
- **r/firefoxextensions**: Share the Firefox Add-ons link and note that the extension has 100% feature parity and runs natively on MV3.
- **r/sideproject**: A supportive community for builders. Post the story of why you built the tool, share your tech stack (TypeScript, React, fp-ts, Vite), and ask for UI/UX feedback.
- **r/productivity**: Focus on how adding margins/padding can reduce distractions, center reading text on ultra-wide screens, or make reading long articles more comfortable.

### Hacker News (Show HN)

- Post a link to the main landing page or repository with the title format: `Show HN: Damn Center - Add customizable margins and patterns to any website`.
- Write a text description as the first comment detailing:
  - The problem: Reading web pages on wide monitors or layouts that crowd the edges.
  - The solution: Damn Center's per-site customizable layout shifts and beautiful CSS pattern themes.
  - The tech: Using functional reactive patterns with `tea-cup-fp` and `fp-ts` for extension state.

### YouTube and Short-Form Videos

- **Demonstration Video**: Record a 1-minute video showing:
  - Navigating to a site (e.g. YouTube or GitHub).
  - Opening the popup, adjusting the left/right padding, changing background presets, and toggling the red Ruler helper.
  - Demonstrating glob matching (how one settings entry dynamically matches similar pages).
- Post as a YouTube Video or a YouTube Short to capture quick attention.

### Product Hunt

- Schedule a product launch on Product Hunt.
- Prepare graphic assets: a custom square logo, 3-4 screenshots highlighting the customization presets, and a short YouTube link.
- Introduce yourself as the maker in the comments, explain what drove you to build Damn Center, and offer to answer any feature requests.

### Developer & Tech Blogs

- **Dev.to / Medium / Hashnode**: Write an engineering walkthrough about how you solved layout shifting on complex websites (e.g., using `transform: translateX()` to align fixed-position headers, rather than standard margins) or how you set up a single Vite build target for both MV3 platforms.
- Share on X (formerly Twitter) under hashtags `#buildinpublic`, `#indiehackers`, and `#webdev` with short GIFs showing the padding changes in real-time.

---

## 7. Funding

To support the long-term maintenance and development of Damn Center, set up options for users and sponsors to donate and fund the project:

### Funding Platforms

- **GitHub Sponsors**: Enable sponsors on the repository by creating a `.github/FUNDING.yml` file. This adds a prominent "Sponsor" button directly to the repository homepage and allows both one-time and recurring sponsorship via GitHub's fee-free developer program.
- **Buy Me a Coffee / Ko-fi**: Highly effective platforms for casual, low-barrier, one-off donations. Users can donate small custom amounts quickly using credit cards, Apple Pay, Google Pay, or PayPal. Include a direct donation link in the extension's popup UI or options page.
- **Patreon**: Create monthly support tiers for users who want to sustain the project continuously. Offer soft perks, such as listing sponsor names in the repository README, early access to new feature concepts, or voting on the next default patterns.
- **Liberapay / Open Collective**: Ideal for open-source project governance. If the project expands to include more contributors, Open Collective transparently tracks and hosts funding allocations.

### Donation Visibility in Extension

- **Popup Footer Link**: Add a small, clean "Sponsor the Developer" text link or a tiny heart icon at the bottom of the extension settings popup.
- **Store Listing Link**: Provide the donation URL in the "Sponsor" or "Website" link fields in the Chrome Web Store and Firefox Add-ons developer listing pages.
