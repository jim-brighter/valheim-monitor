# Gemini Developer & Repository Guide: Valheim Monitor

## 🌲 Repository Overview

This repository contains **Valheim Monitor**, a serverless AWS infrastructure setup that monitors a dedicated Valheim game server and dispatches real-time status alerts to Discord.

> [!NOTE]
> The **Bukeperry** companion mod, Bedrock LLM bot, and in-game chat backend have been extracted to their own dedicated repository: [**jim-brighter/bukeperry**](https://github.com/jim-brighter/bukeperry).

The project is structured into three main components:
1. **Agent (`agent/`)**: Lightweight bash script running via cron on the Valheim Linux host to send regular status heartbeats and public IP updates to DynamoDB.
2. **Monitor Lambda (`monitor-lambda/`)**: Scheduled AWS Lambda function (every 5 mins) that checks for server status changes, IP changes, or host dropouts (heartbeat timeouts) and notifies a Discord channel.
3. **AWS CDK Infrastructure (`cdk/`)**: AWS CDK v2 infrastructure definitions deploying the `ValheimMonitor` stack (`lib/cdk-stack.ts`).

---

## 🏗️ Architecture & Component Details

### 1. `agent/monitor.sh`
- Runs via `cron` on the Valheim host server every 5 minutes.
- Checks systemd service status (`valheim.service`), public IP address (`ipv4.icanhazip.com`), server version, and latest backup archive timestamp.
- Uses AWS CLI to write heartbeats (`PK: agent-status`) to DynamoDB table `ValheimMonitorTable`.

### 2. `monitor-lambda/`
- **Runtime**: Node.js 24.x (`Runtime.NODEJS_24_X`), TypeScript, tested with Vitest.
- **Directory Structure**:
  - `src/`:
    - `handler.ts`: Main orchestration entrypoint triggered by EventBridge cron (`minute: '2/5'`).
    - `evaluator.ts`: Pure functional evaluation of server state transitions (`ONLINE`, `OFFLINE`, `HEARTBEAT_TIMEOUT`, `IP_CHANGED`, `VERSION_CHANGED`, `MISSED_BACKUP`).
    - `config.ts`: Configuration constants including `AGENT_TIMEOUT_MS` (5 mins) and `MAX_BACKUP_AGE_MS` (25 hours).
    - `db.ts`: Interacts with `ValheimMonitorTable`.
    - `secrets.ts`: Fetches bot credentials from Secrets Manager (`valheim-discord-secrets`).
    - `discord.ts`: Posts formatted alerts via Discord REST API.
    - `types.ts`: TypeScript type definitions for agent state, lambda state, secrets, and evaluator results.
  - `test/`:
    - Unit test suites covering evaluator, secrets, db, discord, and handler (`evaluator.test.ts`, `secrets.test.ts`, `db.test.ts`, `discord.test.ts`, `handler.test.ts`).

### 3. `cdk/`
- **Entrypoint**: `bin/cdk.ts` instantiates:
  - `ValheimMonitorStack` (`lib/cdk-stack.ts`): DynamoDB table `ValheimMonitorTable`, `ValheimMonitorLambda`, EventBridge rule, Secrets Manager read policy (`valheim-discord-secrets`).

---

## 🛠️ Common Commands & Workflows

### Infrastructure Deployment & Synthesis
Run all commands from within the `cdk/` directory:

```bash
# Install dependencies for all packages & deploy stack to AWS
cd cdk
npm run deploy

# Synthesize CloudFormation templates without deploying
cd cdk
npm run synth

# Individual CDK commands
npx cdk deploy
npx cdk synth
```

### Running Tests
```bash
# Run monitor-lambda unit tests (Vitest)
cd monitor-lambda
npm test
```

---

## 🔐 Configuration & Secrets Manager

All Lambda functions read runtime credentials from AWS Secrets Manager secret **`valheim-discord-secrets`**.

Required secret structure:
```json
{
  "token": "YOUR_DISCORD_BOT_TOKEN",
  "channel_id": "YOUR_DISCORD_CHANNEL_ID",
  "port": "2456",
  "user_agent": "ValheimMonitorBot"
}
```

---

## 💡 Code Conventions & Technical Constraints

1. **Node.js Runtime**: All AWS Lambdas use Node.js 24 (`Runtime.NODEJS_24_X`).
2. **Bundling**: TypeScript / Node.js bundling is handled automatically during CDK synth/deploy via `NodejsFunction` and `esbuild`.
3. **Documentation Maintenance**: Always keep `GEMINI.md` and `README.md` updated whenever changes are made to architecture, timing/TTL parameters, configurations, or features.
