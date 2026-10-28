# Release Procedure Guide

Follow this guide step-by-step to compile, package, tag, and publish a new release of the **Damn Center** extension.

---

## 1. Pre-Release Verification

Before tagging a release, ensure the codebase is clean, type-safe, and all tests pass.

```bash
# 1. Check formatting and lints (pnpm run format fixes formatting)
pnpm run format:check
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

`test/content.test.ts` covers the content script's logic (rule matching,
sides, toggles, theme, ruler, URL changes and popup messages), but not how the
layout looks on real pages. Before releasing, try the build by hand on a few
real sites: a docs site, a news article, a page with a sticky header, and
fullscreen video, with the ruler on and off.

If the release changes the storage schema, follow the
[storage migration strategy](storage-migration.md) first.

---

## 2. Version Bumping

The version lives only in **`package.json`**. The build writes it into each
browser's `manifest.json`, and the zip names follow it, so bump it there:

1. **`package.json`**: update the `"version"` field. Follow [Semantic Versioning](https://semver.org/):
   - **patch** (`2.0.0` → `2.0.1`) for bug fixes only,
   - **minor** (`2.0.0` → `2.1.0`) for new features, or changes users may notice, such as a higher minimum browser version or renamed page element ids,
   - **major** (`2.0.0` → `3.0.0`) when saved settings or behavior stop being compatible.
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
- `dist/damn-center-safari-v<VERSION>.zip` (Safari extension files; not attached to releases, since Safari users need the app wrapper from `pnpm run generate:safari`)
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

1. checks that the tag points to a commit on `master` and matches the `package.json` version,
2. runs the type check, lint, format check and tests, then `build:release` and `web-ext lint` on the Firefox package,
3. creates a **draft** release titled `Damn Center v<VERSION>`, with this version's `CHANGELOG.md` section as the notes, and the Chrome and Firefox zips plus a `SHA256SUMS.txt` attached,
4. signs a [build provenance attestation](https://docs.github.com/en/actions/security-for-github-actions/using-artifact-attestations) for the zips, which proves they were built by this workflow from the tagged commit.

Building and publishing are separate jobs: the build runs with a read-only token, and only the publish step, which runs no project code, can create the release.

Open the draft under **Releases**, add a one-line summary at the top if you like, and click **Publish release**. Publishing starts the store upload (step 6). If the build or publish job fails, fix the problem, delete and re-push the tag (`git tag -d v<VERSION> && git push origin :v<VERSION>`), then tag again. A failure of the store upload needs no new tag (see step 6). Release tags (`v*`) are protected by a ruleset: they cannot be moved, and only repository admins can delete them.

The stores get the zips from the release, never a local build, so the stores and GitHub get the same files. Anyone can check the origin of a zip with:

```bash
gh attestation verify damn-center-chrome-v<VERSION>.zip -R rinn7e/damn-center-extension
```

---

## 6. Submit to Browser Web Stores

### Automatic upload

Publishing the release (not pushing the tag) starts the `stores` job of the release workflow. It waits for your approval of the `stores` environment: open the run under **Actions** and click **Review deployments**, then **Approve and deploy**. The job then:

1. checks that every store secret is set, and names the missing ones,
2. downloads the Chrome and Firefox zips and the **Source code (zip)** of the release,
3. checks both zips with `gh attestation verify`, and stops before any upload if one was not built by the release workflow from that tag,
4. uploads the Chrome zip to the Chrome Web Store and submits it for review,
5. uploads the Firefox files to Firefox Add-ons (listed channel), with the source code zip and the reviewer notes below, and submits it for review. It runs even when the Chrome step failed.

It builds nothing and runs no project code. It runs the store tools with `npx`, pinned to an exact version, but their own dependencies are resolved on each run. Pre-releases are not uploaded. Safari stays manual (App Store, through the app wrapper).

A failed upload step names its store in the error. Finish that store by hand with the steps below, using the same zips from the release. Do not re-run the job after one store succeeded: the store that already has the version rejects it again, so the run fails again.

The job only runs from a tag whose `release.yml` has it, so it starts with the first release tagged after it was added.

#### The `stores` environment

Create it once, before the first release that should upload. Without it, GitHub creates an environment with no protection on the first run, and the job runs without waiting.

1. In the repository, open **Settings** > **Environments** > **New environment**, name it `stores` and click **Configure environment**.
2. Tick **Required reviewers**, add yourself, and leave **Prevent self-review** off (the maintainer publishes the release and approves the upload).
3. Under **Deployment branches and tags**, choose **Selected branches and tags** and add the tag rule `v*`, so no branch can use it.
4. Click **Save protection rules**.

#### Store secrets

The job reads these secrets of the `stores` environment. Only this job uses them, and it runs only after the approval.

| Secret                 | What it is                                                                             |
| ---------------------- | -------------------------------------------------------------------------------------- |
| `CHROME_EXTENSION_ID`  | The ID of the item, in the Chrome Developer Dashboard and the store URL                |
| `CHROME_PUBLISHER_ID`  | The publisher ID, in the Chrome Developer Dashboard under **Publisher** > **Settings** |
| `CHROME_CLIENT_ID`     | Client ID of the Google OAuth client                                                   |
| `CHROME_CLIENT_SECRET` | Client secret of the same OAuth client                                                 |
| `CHROME_REFRESH_TOKEN` | Refresh token for the `https://www.googleapis.com/auth/chromewebstore` scope           |
| `AMO_API_KEY`          | The JWT issuer of the AMO API key                                                      |
| `AMO_API_SECRET`       | The JWT secret of the AMO API key                                                      |

To create them:

1. Chrome: follow [Use the Chrome Web Store API](https://developer.chrome.com/docs/webstore/using-api). In a Google Cloud project, enable the **Chrome Web Store API**, set up the OAuth consent screen (External, with your account as a test user, then publish the app so the refresh token does not expire after 7 days), and create an OAuth client of type **Web application** with `https://developers.google.com/oauthplayground` as redirect URI. In the [OAuth 2.0 Playground](https://developers.google.com/oauthplayground), use your own OAuth credentials, authorize the scope above with the Google account that owns the item, and exchange the code for a refresh token.
2. Firefox: create the key on the [AMO API key page](https://addons.mozilla.org/developers/addon/api/key/), signed in as an owner of the add-on.
3. Add each one with **Add environment secret** on the `stores` environment page, or with `gh secret set <NAME> --env stores` in your terminal.

#### Reviewer notes for AMO

The job sends the code block below as the notes for reviewers of the new version, read from this file at the tag. Keep the markers around it.

<!-- amo-reviewer-notes:start -->

```text
Install Node.js 24 and pnpm 11.9.0 (npm install -g pnpm@11.9.0), run pnpm install --frozen-lockfile, cp .env.example .env.production, then pnpm run build:firefox:release. The output is in dist/firefox/.
```

<!-- amo-reviewer-notes:end -->

### Manual upload (fallback)

Use these steps when the job cannot run or one of its uploads failed.

#### Chrome Web Store (Chrome Developer Dashboard)

1. Log in to the [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole).
2. Click on the **Damn Center** item.
3. Go to the **Package** section and upload `damn-center-chrome-v<VERSION>.zip` from the GitHub release.
4. Fill in store listing metadata if changed, and submit for review.
5. In **Privacy**, keep the declaration that the extension stores settings locally and transmits no user data, and link the privacy policy: `https://github.com/rinn7e/damn-center-extension/blob/master/PRIVACY.md`.

#### Firefox Add-ons (Mozilla Developer Hub)

1. Log in to the [Firefox Add-on Developer Hub](https://addons.mozilla.org/developers/).
2. Submit a new version of the extension.
3. Upload `damn-center-firefox-v<VERSION>.zip` from the GitHub release.
4. When asked whether the code is compiled or minified, answer **Yes** and upload the release's **Source code (zip)** from GitHub (every file tracked in git at the tag).
5. Build instructions for the reviewer: paste the [reviewer notes for AMO](#reviewer-notes-for-amo).
6. Follow the steps for listing review. The license is GPL-3.0.

### Store listing assets

Update these when the UI or branding changes; see [Design Assets](assets.md) for how they're made.

- **Chrome**: 128×128 icon (in the package), 1–5 screenshots at 1280×800, the 440×280 small promo tile, and the text in [store-description.md](store-description.md).
- **Firefox**: screenshots, summary (max 250 characters) and description from [store-description.md](store-description.md).
