#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Package Linux Dedicated Server Bundle for Bukeperry Mod
#
# Downloads BepInEx 5.4.2351 and Jötunn 2.30.2, bundles them with BukeperryMod.dll,
# and outputs bukeperry-server-bundle.zip for installation on Linux servers.
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
OUTPUT_ZIP="${1:-$ROOT_DIR/bukeperry-server-bundle.zip}"

BEPINEX_VERSION="5.4.2351"
JOTUNN_VERSION="2.30.2"

echo "=== Assembling Linux Dedicated Server Bundle ==="

TMP_DIR=$(mktemp -d /tmp/bukeperry-bundle.XXXXXX)
trap 'rm -rf "$TMP_DIR"' EXIT

# 1. Download BepInExPack_Valheim
echo "Downloading BepInExPack_Valheim $BEPINEX_VERSION..."
curl -sL "https://thunderstore.io/package/download/denikson/BepInExPack_Valheim/$BEPINEX_VERSION/" -o "$TMP_DIR/bepinex.zip"
unzip -q "$TMP_DIR/bepinex.zip" -d "$TMP_DIR/bepinex-raw" || true

mkdir -p "$TMP_DIR/staging"
cp -r "$TMP_DIR/bepinex-raw/BepInExPack_Valheim/"* "$TMP_DIR/staging/"

# 2. Download Jötunn
echo "Downloading Jötunn $JOTUNN_VERSION..."
curl -sL "https://thunderstore.io/package/download/ValheimModding/Jotunn/$JOTUNN_VERSION/" -o "$TMP_DIR/jotunn.zip"
mkdir -p "$TMP_DIR/jotunn-raw"
unzip -q "$TMP_DIR/jotunn.zip" -d "$TMP_DIR/jotunn-raw" || true

mkdir -p "$TMP_DIR/staging/BepInEx/plugins"
cp "$TMP_DIR/jotunn-raw/plugins/Jotunn.dll" "$TMP_DIR/staging/BepInEx/plugins/"
if [[ -f "$TMP_DIR/jotunn-raw/plugins/Jotunn.xml" ]]; then
  cp "$TMP_DIR/jotunn-raw/plugins/Jotunn.xml" "$TMP_DIR/staging/BepInEx/plugins/"
fi

# 3. Copy compiled BukeperryMod.dll
if [[ ! -f "$ROOT_DIR/mod/dist/BukeperryMod.dll" ]]; then
  echo "Error: mod/dist/BukeperryMod.dll not found! Please build the mod first."
  exit 1
fi

echo "Copying BukeperryMod.dll..."
cp "$ROOT_DIR/mod/dist/BukeperryMod.dll" "$TMP_DIR/staging/BepInEx/plugins/"

# 4. Create server bundle zip
echo "Compressing server bundle to: $OUTPUT_ZIP..."
(cd "$TMP_DIR/staging" && zip -q -r "$OUTPUT_ZIP" .)

echo "✓ Successfully created: $(ls -lh "$OUTPUT_ZIP")"
