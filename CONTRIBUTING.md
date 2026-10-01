# Contributing

Thanks for helping make Damn Center better! Bug reports, site incompatibility
reports and pull requests are all welcome.

## Reporting bugs and ideas

Use the [issue templates](https://github.com/rinn7e/damn-center-extension/issues/new/choose).
For a layout bug, the site URL and a screenshot are the most useful things you
can include. Security issues go through [SECURITY.md](SECURITY.md) instead.

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

- Follow the [code convention](doc/code-convention.md): Elm architecture
  updaters in `src/update.ts`, `rem` font sizes, no margin utilities, and tests
  for new logic in `test/`.
- Add a line under `## [Unreleased]` in [CHANGELOG.md](CHANGELOG.md) for
  anything a user would notice.
- Keep pull requests to one change each.

## Commit messages

Use a short imperative summary, with an optional tag in brackets:

```
[Feature] Add a domain toggle
[Fix] Resolve page padding initialization in background tabs
[Docs] Fix the release guide
[Release] bump version to v2.1.0
```

## License

By contributing, you agree that your contributions are licensed under the
[GPL-3.0](LICENSE), the same license as the project.
