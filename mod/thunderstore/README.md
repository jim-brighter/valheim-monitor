# Bukeperry Mod 🌲🧌

**Bukeperry** is a legendary cave troll merchant, forest guardian, and conversational companion for Valheim.

Tired of silent NPCs? Bukeperry watches over the Black Forest with pride, swagger, and a massive log club. He sells forest supplies, shares ancient troll lore, and speaks directly to players in real-time.

---

## 🌟 Features

### 🛒 The Forest Merchant
- **Store Inventory**: Sells essentials like Wood, Stone, Resin, and Feathers for Gold Coins.
- **Strict Forest Policy**: Bukeperry loves trees and hates lazy lumberjacks. Attempting to sell wood to him will trigger an immediate troll reprimand.

### 💬 Live In-Game Conversations
- **Talk Naturally**: Just walk up to Bukeperry and talk in local chat (`/say` or normal typing) or shout (`/s`).
- **Overhead Speech**: Bukeperry responds with dynamic overhead speech bubbles and chat messages in his authentic caveman troll voice.
- **Lore & Creature Knowledge**: Ask him about the forest, other biomes, bosses, skeletons, or his opinions on Odin and the gods.
- **Zero Lag**: All AI processing runs completely asynchronous off the game thread. Zero frame drops or server stutter.

### 🌐 Seamless Multiplayer
- **No Client Setup Required**: In multiplayer, only the dedicated server connects to the AI backend. Players simply install the mod via Thunderstore and start talking!

---

## 📥 Installation

### Option 1: Thunderstore / r2modman (Recommended)
1. Install [Thunderstore Mod Manager](https://www.overwolf.com/app/Thunderstore-Thunderstore_Mod_Manager) or [r2modman](https://thunderstore.io/package/ebkr/r2modman/).
2. Click **Install with Mod Manager** on this page.
3. Launch game via the mod manager. All dependencies (BepInEx and Jötunn) will be handled automatically!

### Option 2: Manual Installation
1. Install [BepInExPack Valheim](https://valheim.thunderstore.io/package/denikson/BepInExPack_Valheim/).
2. Install [Jötunn, the Valheim Library](https://valheim.thunderstore.io/package/ValheimModding/Jotunn/).
3. Download this mod and place `BukeperryMod.dll` into your `Valheim/BepInEx/plugins/` directory.

---

## ⚙️ Configuration (Server Only)

When hosting a dedicated server with AI conversation enabled:
- Config file: `BepInEx/config/com.jimbrighter.bukeperrymod.cfg`
- Fields:
  - `ApiEndpoint`: The AWS API Gateway endpoint URL (e.g. `https://xxxx.execute-api.us-east-1.amazonaws.com/prod/game/chat`)
  - `ApiKey`: The API Key for authorization
  - `ProximityRadius`: How close players must be to talk to Bukeperry (default `15` meters)

*Note: For regular players connecting to a server, no configuration is needed!*

---

## 🔗 Links & Source
- Source code: [GitHub: jim-brighter/valheim-monitor](https://github.com/jim-brighter/valheim-monitor)
- Created by **Jim Brighter**
