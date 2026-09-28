#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VALHEIM_PLUGINS="$HOME/Library/Application Support/Steam/steamapps/common/Valheim/BepInEx/plugins"

echo "Building BukeperryMod..."
cd "$SCRIPT_DIR/BukeperryMod"
dotnet build

echo "Installing Jotunn mod to local Valheim..."
cp $HOME/.nuget/packages/jotunnlib/2.30.2/lib/net462/Jotunn.dll "$HOME/Library/Application Support/Steam/steamapps/common/Valheim/BepInEx/plugins/"

echo "Installing BukeperryMod.dll to local Valheim..."
mkdir -p "$VALHEIM_PLUGINS"
cp bin/Debug/netstandard2.1/BukeperryMod.dll "$VALHEIM_PLUGINS/"

echo "Copying BukeperryMod.dll to mod/dist for repository distribution..."
mkdir -p "$SCRIPT_DIR/dist"
cp bin/Debug/netstandard2.1/BukeperryMod.dll "$SCRIPT_DIR/dist/"

echo "Done"
