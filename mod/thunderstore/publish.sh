#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Publish Bukeperry Mod to Thunderstore
#
# Reads the canonical PluginVersion from BukeperryPlugin.cs, verifies whether
# that version has already been published to Thunderstore, dynamically generates
# manifest.json & thunderstore.toml, packages the zip, and publishes via tcli.
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "=== Thunderstore Publishing ==="

# 1. Extract version from BukeperryPlugin.cs
PLUGIN_FILE="$ROOT_DIR/mod/BukeperryMod/BukeperryPlugin.cs"
if [[ ! -f "$PLUGIN_FILE" ]]; then
  echo "Error: Could not find $PLUGIN_FILE"
  exit 1
fi

MOD_VERSION=$(grep -o 'PluginVersion = "[^"]*"' "$PLUGIN_FILE" | cut -d'"' -f2)
echo "Canonical BukeperryMod version: $MOD_VERSION"

# 2. Check for Thunderstore Token
AUTH_TOKEN="${THUNDERSTORE_TOKEN:-${TCLI_AUTH_TOKEN:-}}"
if [[ -z "$AUTH_TOKEN" ]]; then
  echo "::warning::THUNDERSTORE_TOKEN environment variable not set. Skipping Thunderstore publishing."
  echo "To publish, provide THUNDERSTORE_TOKEN=<your_token>."
  exit 0
fi

# 3. Check if version already exists on Thunderstore
echo "Checking if version $MOD_VERSION is already published to Thunderstore..."
TMP_CHECK_JSON=$(mktemp /tmp/ts_check.XXXXXX)
trap 'rm -f "$TMP_CHECK_JSON"' EXIT

HTTP_CODE=$(curl -s -o "$TMP_CHECK_JSON" -w "%{http_code}" "https://valheim.thunderstore.io/api/experimental/package/jimbrighter/BukeperryMod/" || true)

if [[ "$HTTP_CODE" == "200" ]]; then
  ALREADY_PUBLISHED=$(jq -r --arg v "$MOD_VERSION" '.versions[]? | select(.version_number == $v) | .version_number' "$TMP_CHECK_JSON" 2>/dev/null || true)
  if [[ -n "$ALREADY_PUBLISHED" ]]; then
    echo "Version $MOD_VERSION is already published to Thunderstore. Skipping publish."
    exit 0
  fi
fi

echo "New version $MOD_VERSION detected! Preparing package..."

# 4. Ensure tcli is available
TMP_TCLI_DIR=$(mktemp -d /tmp/tcli-install.XXXXXX)
trap 'rm -rf "$TMP_TCLI_DIR" "$TMP_CHECK_JSON"' EXIT

OS_TYPE=$(uname -s)
if [[ "$OS_TYPE" == "Darwin" ]]; then
  TCLI_ARCH="osx-x64"
else
  TCLI_ARCH="linux-x64"
fi

echo "Downloading Thunderstore CLI (tcli 0.2.4 for $TCLI_ARCH)..."
curl -sL "https://github.com/thunderstore-io/thunderstore-cli/releases/download/0.2.4/tcli-0.2.4-$TCLI_ARCH.tar.gz" -o "$TMP_TCLI_DIR/tcli.tar.gz"
tar -xzf "$TMP_TCLI_DIR/tcli.tar.gz" -C "$TMP_TCLI_DIR"
TCLI_BIN="$TMP_TCLI_DIR/tcli-0.2.4-$TCLI_ARCH/tcli"
chmod +x "$TCLI_BIN"

# 5. Stage Package Files
STAGE_DIR=$(mktemp -d /tmp/ts-stage.XXXXXX)
trap 'rm -rf "$TMP_TCLI_DIR" "$TMP_CHECK_JSON" "$STAGE_DIR"' EXIT

sed "s/__VERSION__/$MOD_VERSION/g" "$SCRIPT_DIR/manifest.template.json" > "$STAGE_DIR/manifest.json"
sed "s/__VERSION__/$MOD_VERSION/g" "$SCRIPT_DIR/thunderstore.template.toml" > "$STAGE_DIR/thunderstore.toml"
cp "$SCRIPT_DIR/README.md" "$STAGE_DIR/README.md"
cp "$SCRIPT_DIR/icon.png" "$STAGE_DIR/icon.png"
cp "$ROOT_DIR/mod/dist/BukeperryMod.dll" "$STAGE_DIR/BukeperryMod.dll"

PACKAGE_ZIP="$ROOT_DIR/BukeperryMod-Thunderstore.zip"
echo "Creating Thunderstore zip: $PACKAGE_ZIP..."
(cd "$STAGE_DIR" && zip -q "$PACKAGE_ZIP" manifest.json README.md icon.png BukeperryMod.dll)

# 6. Publish via tcli
echo "Publishing to Thunderstore community 'valheim' under namespace 'jimbrighter'..."
export TCLI_AUTH_TOKEN="$AUTH_TOKEN"
"$TCLI_BIN" publish --config-path "$STAGE_DIR/thunderstore.toml" --file "$PACKAGE_ZIP"

echo "✓ Successfully published BukeperryMod v$MOD_VERSION to Thunderstore!"
rm -f "$PACKAGE_ZIP"
