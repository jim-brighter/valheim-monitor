# Bukeperry Mod - Distribution Architecture

This document describes the distribution and release strategy for **Bukeperry Mod**.

---

## 🎯 Target Environments & Distribution Strategy

We implement a tailored two-pronged distribution strategy:

```
                          ┌────────────────────────┐
                          │   Push to main / CI    │
                          └───────────┬────────────┘
                                      │
              ┌───────────────────────┴───────────────────────┐
              ▼                                               ▼
   [Client Target: Thunderstore]                   [Server Target: GitHub Releases]
   • r2modman / Thunderstore Mod Manager           • Standalone bukeperry-server-bundle.zip
   • Automated dependency resolution               • Pinned BepInEx 5.4.2351 + Jotunn 2.30.2
     (BepInExPack_Valheim + Jotunn)                • Dedicated installer: mod/install-server.sh
   • Zero client config (no API key needed)        • systemd Doorstop environment integration
   • Published via tcli in CI                      • Attached to GitHub Releases
```

---

## 1. Client Players (Windows / macOS)

- **Platform**: [Thunderstore](https://valheim.thunderstore.io) / [r2modman](https://thunderstore.io/package/ebkr/r2modman/)
- **Namespace**: `jimbrighter`
- **Package Name**: `BukeperryMod`
- **Automated Dependencies**:
  - `denikson-BepInExPack_Valheim-5.4.2351`
  - `ValheimModding-Jotunn-2.30.2`
- **User Experience**:
  - Friends click "Install with Mod Manager" on Thunderstore.
  - Dependencies are fetched and installed automatically without browsing local game directories or dealing with Windows SmartScreen / antivirus warnings.
  - Requires **zero configuration**: client players do not need AWS API keys or endpoints. In multiplayer, all AI requests are server-authoritative.

---

## 2. Dedicated Linux Server (`/home/vhserver`)

- **Artifact**: `bukeperry-server-bundle.zip` attached to each GitHub Release.
- **Bundle Contents**:
  ```text
  bukeperry-server-bundle.zip
  ├── doorstop_config.ini
  ├── doorstop_libs/
  │   └── libdoorstop_x64.so
  ├── start_server_bepinex.sh
  └── BepInEx/
      ├── config/
      │   └── BepInEx.cfg
      ├── core/
      │   ├── BepInEx.dll
      │   └── 0Harmony.dll
      └── plugins/
          ├── Jotunn.dll
          └── BukeperryMod.dll
  ```
- **Installer Script**: [`mod/install-server.sh`](file:///Users/jim/github/jim-brighter/valheim-monitor/mod/install-server.sh)
  - Fetches the latest release asset from GitHub.
  - Extracts bundle directly into `/home/vhserver/valheim_server` (or custom `-d` directory).
  - Prompts for or accepts `-e <endpoint>` and `-k <key>` for AWS Bedrock API Gateway.
  - Automatically inspects `valheim.service`, adds Doorstop and Box64/ARM64 environment variables (`BOX64_PATH`, `BOX64_LD_LIBRARY_PATH`), runs `systemctl --user daemon-reload`, and prepares the server for restart.

---

## 3. Versioning & Automation

- **Single Source of Truth**: `PluginVersion` in [`mod/BukeperryMod/BukeperryPlugin.cs`](file:///Users/jim/github/jim-brighter/valheim-monitor/mod/BukeperryMod/BukeperryPlugin.cs).
- **CI Workflow ([`.github/workflows/main.yml`](file:///Users/jim/github/jim-brighter/valheim-monitor/.github/workflows/main.yml))**:
  1. Runs `cdk deploy` and creates a GitHub Release via `jim-brighter/github-release-action`.
  2. Runs [`mod/package-server-bundle.sh`](file:///Users/jim/github/jim-brighter/valheim-monitor/mod/package-server-bundle.sh) to assemble `bukeperry-server-bundle.zip`.
  3. Uses `gh release upload` to attach `bukeperry-server-bundle.zip` to the release.
  4. Runs [`mod/thunderstore/publish.sh`](file:///Users/jim/github/jim-brighter/valheim-monitor/mod/thunderstore/publish.sh):
     - Queries Thunderstore API to check if `PluginVersion` is already published.
     - If new, generates `manifest.json` dynamically and publishes via Thunderstore CLI (`tcli`) using `THUNDERSTORE_TOKEN`.
     - If version already exists or token is absent, skips cleanly without failing the build.
