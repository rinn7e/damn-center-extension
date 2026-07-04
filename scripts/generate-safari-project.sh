#!/bin/bash
set -e

# Change directory to the repository root
CD_PATH="$(dirname "$0")/.."
cd "$CD_PATH"

echo "Building Safari extension target..."
pnpm run build:safari

echo "Converting extension to Safari macOS App Wrapper..."
xcrun safari-web-extension-converter dist/safari \
  --project-location ./safari-extension \
  --macos-only \
  --no-open \
  --no-prompt \
  --copy-resources \
  --force

echo "Successfully generated Safari project in ./safari-extension 🎉"
