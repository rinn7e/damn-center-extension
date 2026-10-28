# Contributing

Thanks for helping make Damn Center better! Bug reports, site incompatibility
reports and pull requests are all welcome. Please follow the
[code of conduct](CODE_OF_CONDUCT.md).

## Reporting bugs and ideas

Use the [issue templates](https://github.com/rinn7e/damn-center-extension/issues/new/choose).
For a layout bug, the site URL and a screenshot are the most useful things you
can include. Security issues go through [SECURITY.md](SECURITY.md) instead.

## Picking up an issue

Planned work lives in [GitHub issues](https://github.com/rinn7e/damn-center-extension/issues).
The labels say what an issue is and what state it is in, and the same rules
apply whether a person or an AI agent does the work. Each label starts with a
number for its kind, so they always show in the same order: `1-` type, `2-`
status, `3-` area.

| Label             | Meaning                                                     |
| ----------------- | ----------------------------------------------------------- |
| `1-...`           | Type: bug, enhancement or tech debt                         |
| `2-open`          | Fully specified with "Done when" criteria, ready to pick up |
| `2-investigation` | Feasibility unclear: research and write it up before coding |
| `2-block`         | Parked until the condition in the issue is met              |
| `2-in-progress`   | Someone is working on it (see the assignee)                 |
| `2-review`        | A pull request is open and waiting for review               |
| `3-...`           | Area: which parts of the project it touches                 |

An issue has exactly one type and one status label, and one or more areas.

To work on one:

1. Pick an open issue labelled `2-open` that has no assignee.
2. Assign yourself and switch the label to `2-in-progress` before you
   start, so nobody else picks it up.
3. Open a pull request that says `Closes #<number>` and meets every "Done
   when" item, and switch the label to `2-review`.

## Development setup

You need [Node.js](https://nodejs.org/) 24+ and [pnpm](https://pnpm.io/).

```bash
pnpm install
cp .env.example .env.development
pnpm run build:chrome   # development build in dist/chrome
```

Load `dist/chrome` as an unpacked extension (see the
[README](README.md#load-the-extension-into-your-browser)). Development builds
use the orange DEV icons and show the build date in the popup, so you can tell
them apart from the store version.

## Before opening a pull request

Run the same checks as CI:

```bash
pnpm run check         # TypeScript
pnpm run lint          # ESLint
pnpm run format:check  # Prettier (pnpm run format fixes it)
pnpm run test          # Vitest
```

CI also runs `pnpm run build:release` and lints the Firefox package with
Mozilla's `web-ext lint`, which fails only on errors. Three warnings are
expected: two `UNSAFE_VAR_ASSIGNMENT` from React's own code, and
`KEY_FIREFOX_ANDROID_UNSUPPORTED_BY_MIN_VERSION`, which only matters for
Firefox for Android, a platform Damn Center doesn't support.

- Follow the [code convention](doc/code-convention.md): Elm architecture
  updaters in `src/update.ts`, `rem` font sizes, no margin utilities, and tests
  for new logic in `test/`.
- Add a line under `## [Unreleased]` in [CHANGELOG.md](CHANGELOG.md) for
  anything a user would notice.
- Keep pull requests to one change each.

## Commit messages

Write a short summary in the imperative mood that says what the change does,
for example `Add a domain toggle` or `Fix padding in background tabs`. Version
bumps use `[Release] bump version to v<VERSION>`.

## License

By contributing, you agree that your contributions are licensed under the
[GPL-3.0](LICENSE), the same license as the project.
