# Bukeperry Mod - Project Backlog & Epics

This document tracks progress, technical architecture decisions, and stories for the Bukeperry Valheim mod across sessions.

---

## Status Legend
- ⚪ **Backlog**: Not started / needs refinement
- 🟡 **In Progress**: Currently active
- 🟢 **Done**: Completed and verified
- 🔴 **Blocked**: Waiting on dependencies or decisions

---

## Epic 0: Development Environment & Mod Foundation 🟢
Establish the C# / BepInEx 5.x development environment, dependencies, build pipeline, and verify deployment on dedicated server and client.

- [x] **Story 0.1**: Setup C# project boilerplate (.NET Standard 2.1 target, BepInEx 5.x, Jötunn library references).
  - *Acceptance Criteria*: Project builds cleanly with `dotnet build`, producing a mod `.dll`. (Completed: `netstandard2.1` builds cleanly with 0 errors).
- [x] **Story 0.2**: Create build & deploy script.
  - *Acceptance Criteria*: Script automatically copies `.dll` to local Valheim client `BepInEx/plugins/` and server test environment. (Completed: `macos-deploy.sh` builds and deploys to local BepInEx).
- [x] **Story 0.3**: BepInEx "Hello World" verification.
  - *Acceptance Criteria*: Mod logs its initialization to BepInEx console/log on both client and dedicated server. (Completed: Verified in `BepInEx/LogOutput.log`).

---

## Epic 1: The Bukeperry Character & AI Behavior (Phase 1) 🟢
Implement the custom Bukeperry troll prefab, unique stats, custom Dvergr-style non-hostile/retaliatory AI, and persistent world placement.

- [x] **Story 1.1**: Define Bukeperry prefab & combat stats.
  - *Acceptance Criteria*: Custom prefab cloned from `Troll` with unique name (`Bukeperry`), 15,000 HP, 1,000 damage attacks. (Completed: In-game verified with custom log weapon and 15k HP).
- [x] **Story 1.2**: Implement custom Dvergr-style retaliation AI.
  - *Acceptance Criteria*: 
    - Passive to players by default.
    - If damaged by a player, targets that player until dead.
    - Drops aggro and returns to passive once target viking dies.
    - Normal troll hostility towards other biomes/mobs. (Completed: Verified in-game using BukeperryController and directional IsEnemy patch).
- [x] **Story 1.3**: Implement world locator and persistent spawn.
  - *Acceptance Criteria*: On world load, scans for nearest Black Forest zone to `(0,0,0)`, spawns Bukeperry if not already present, and persists ZDO. (Completed: Procedural world scan locates closest dry Black Forest position; ZDO saved to chunk and verified persistent in-game).
- [~] **Story 1.4**: Bukeperry respawns after one in-game day. *(Descoped in favor of Wood Tribute Chest mechanic in Story 4.1)*.

---

## Epic 2: The Troll Merchant (Phase 2) 🟢
Implement merchant interaction on Bukeperry with custom dialogue, inventory, and purchase interception.

- [x] **Story 2.1**: Attach `Trader` component to Bukeperry.
  - *Acceptance Criteria*: Player can press `[E]` to open the store GUI (`StoreGui`). (Completed: Hover text, yellow crosshair, overhead greeting, and StoreGui verified in-game).
- [x] **Story 2.2**: Configure merchant inventory.
  - *Acceptance Criteria*: Store displays Stone (cheap, e.g., 1 coin) and Wood (10,000 coins). (Completed: Stone @ 1 coin and Wood @ 10,000 coins configured in BukeperryPrefab).
- [x] **Story 2.3**: Intercept wood purchase & trigger troll dialogue.
  - *Acceptance Criteria*: If player buys wood, transaction is cancelled/refunded and Bukeperry displays overhead text/dialogue saying he has no wood. (Completed: Purchase intercepted via StoreGui patch; store closes, gold refunded, and troll refusal dialogue displayed overhead).

---

## Epic 3: The Conversationalist (Phase 3) 🟡
Connect proximity in-game chat to Bedrock LLM with shared Discord conversation state.

### 📐 Technical Architecture & Decisions:
1. **API Gateway & Auth (`POST /game/chat`)**:
   - **Do not touch `/interactions`**: Discord webhook Ed25519 signature verification remains strictly dedicated to Discord.
   - **Dedicated Route with API Key**: CDK stack exposes `POST /game/chat` requiring `x-api-key` header linked to an API Gateway `UsagePlan`. Requests missing/invalid keys are rejected with `403` at the edge without invoking Lambda.
   - **Request/Response Model**: Synchronous HTTP response (`POST { prompt, channelId }` -> `200 { reply }`), unlike Discord's asynchronous webhook callback.
2. **Backend Logic & Conversation Continuity**:
   - Extract core Bedrock invocation, local RAG retriever (`valheim_knowledge.json`), caveman persona formatting, and DynamoDB history update into a shared function.
   - Both Discord and the Valheim mod query/update `ValheimLLMStateTable` using the configured Discord `channelId`, keeping conversation context seamlessly unified across platforms.
3. **Runtime Configuration (`.cfg`)**:
   - Plain text configuration file on the server filesystem: `BepInEx/config/com.bukeperry.mod.cfg`.
   - Generated dynamically at runtime on first boot via BepInEx `Config.Bind(...)`.
   - Never bakes credentials or endpoint URLs into the compiled C# `.dll`.
4. **Unity Thread-Safety & Async Execution**:
   - Unity's engine and Valheim's server loop are single-threaded. HTTP/Bedrock calls (1.5–4s) must run off the main thread (`Task.Run` / `HttpClient`).
   - Results are marshaled back to the Unity main thread using a thread-safe `ConcurrentQueue<Action>` drained in `Update()` to prevent server tick freeze and `UnityException`.
5. **Speech Delivery**:
   - Primary: Overhead yellow floating speech bubble (`Chat.SetNpcText`) dispatched to clients in range via RPC.
   - *Note on Troll Height*: Troll models are very tall (~6-7m). We will need to adjust the Y-offset vector on `SetNpcText` so the bubble floats near eye/chest level or is easily readable from ground camera angles.

### Stories:
- [x] **Story 3.1**: CDK stack updates & shared LLM core.
  - *Acceptance Criteria*:
    - Refactor `llm-lambda` so Bedrock prompt, RAG retriever, and DynamoDB state logic can be called synchronously by a new `gameHandler.ts`. (Completed: `core.ts` extracted, `gameHandler.ts` implemented and covered by unit tests).
    - CDK adds `POST /game/chat` with `apiKeyRequired: true`, creates `ApiKey` and `UsagePlan`. (Completed: CDK stack updated, deployed, and verified with `curl`).
- [x] **Story 3.2**: Mod configuration file setup.
  - *Acceptance Criteria*: Mod uses `Config.Bind` to define `ApiEndpoint`, `ApiKey`, and `ChannelId`. Generates `BepInEx/config/com.jimbrighter.bukeperrymod.cfg` on first boot. (Completed: Config entries bound and verified generated).
- [ ] **Story 3.3**: Server-side chat sniffer & proximity check. 🟡
  - *Acceptance Criteria*: Server intercepts `Chat.RPC_ChatMessage`, checks Euclidean distance between speaking player and Bukeperry ZDO (< 20m).
- [ ] **Story 3.4**: Async HTTP client & main-thread dispatcher.
  - *Acceptance Criteria*: Mod fires async HTTP POST with `x-api-key` off-thread; queues response back to main thread via `ConcurrentQueue` without stalling server ticks.
- [ ] **Story 3.5**: In-game speech bubble delivery.
  - *Acceptance Criteria*: Server sends RPC to clients within visual range to display Bukeperry's overhead speech bubble (`Chat.SetNpcText`), with tuned Y-offset for visibility.

---

## Epic 4: Launch Activities & Distribution Tooling (Phase 4)
Automated distribution and installation tooling for deploying the mod to Linux dedicated servers and Windows client machines.

- [ ] **Story 4.1**: Compiled artifact packaging & repository tracking.
  - *Acceptance Criteria*:
    - Standardized build output directory (e.g. `mod/dist/BukeperryMod.dll`) committed or packaged for release.
    - Automated check or deploy step to keep distribution binaries in sync with source builds.
- [ ] **Story 4.2**: Headless Linux server installer (`install-server.sh`).
  - *Acceptance Criteria*:
    - Bash script designed for headless Linux servers (no GUI/desktop required).
    - Auto-detects common dedicated server paths or prompts user for Valheim server directory.
    - Verifies/installs BepInEx 5.x, JotunnLib, and BukeperryMod into `BepInEx/plugins/`.
    - Configures server launch: ensures `start_server_bepinex.sh` is executable and prints/updates systemd `valheim.service` `ExecStart` target to launch via BepInEx.
    - Idempotent and safe to run on existing servers without clobbering world data or server configs.
- [ ] **Story 4.3**: Windows client installer (GUI & Auto-Detector).
  - *Acceptance Criteria*:
    - User-friendly Windows installer (GUI application or native PowerShell/WPF window requiring zero extra runtime installs).
    - Automatically locates Steam Valheim install directory via Steam registry/`libraryfolders.vdf` with an override file picker/input.
    - Downloads/installs BepInEx 5.x (if missing), JotunnLib, and BukeperryMod into `BepInEx/plugins/`.
    - Note on Launch Options: Windows requires **zero Steam launch options** (Doorstop uses standard `winhttp.dll` hooking when `valheim.exe` starts).
    - Validates installation and presents clear success / launch instructions to the player.

---

## Epic 5: Future Enhancements (Phase 5)
Post-launch polish, fun interactions, and advanced mechanics.

- [ ] **Story 5.1**: Wood Tribute Chest Respawn.
  - *Acceptance Criteria*:
    - When Bukeperry dies, record death and location.
    - The next in-game day, a standard chest appears at Bukeperry's home coordinates.
    - Bukeperry can only respawn by filling the chest completely with wood.
    - Once full, consuming/sacrificing the wood triggers Bukeperry's respawn at his home.
