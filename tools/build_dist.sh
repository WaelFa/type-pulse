#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MANIFEST_PATH="$ROOT_DIR/manifest.json"
DIST_DIR="$ROOT_DIR/dist"

usage() {
  echo "Usage: $(basename "$0") <version>"
  echo "Example: $(basename "$0") 1.0.1"
}

if [[ $# -ne 1 ]]; then
  usage
  exit 1
fi

VERSION="$1"

if [[ ! "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Version must use semver format: x.y.z" >&2
  exit 1
fi

if [[ ! -f "$MANIFEST_PATH" ]]; then
  echo "manifest.json not found at $MANIFEST_PATH" >&2
  exit 1
fi

CURRENT_VERSION="$(sed -n 's/.*"version": "\(.*\)".*/\1/p' "$MANIFEST_PATH" | head -n 1)"
ZIP_NAME="typepulse-chrome-store-v$VERSION.zip"
ZIP_PATH="$DIST_DIR/$ZIP_NAME"

if [[ -z "$CURRENT_VERSION" ]]; then
  echo "Could not read current version from manifest.json" >&2
  exit 1
fi

perl -0pi -e 's/"version":\s*"[^"]+"/"version": "'"$VERSION"'"/' "$MANIFEST_PATH"

mkdir -p "$DIST_DIR"
rm -f "$ZIP_PATH"

(
  cd "$ROOT_DIR"
  zip -r "$ZIP_PATH" \
    manifest.json \
    background.js \
    content.js \
    overlay.css \
    popup.html \
    popup.css \
    popup.js \
    icons \
    -x "*/.DS_Store" ".DS_Store"
)

echo "Updated manifest version: $CURRENT_VERSION -> $VERSION"
echo "Created dist archive: $ZIP_PATH"
