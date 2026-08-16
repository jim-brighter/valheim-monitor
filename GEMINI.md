# Gemini Developer & Repository Guide: Valheim Monitor & Bukeperry LLM Bot

## 🌲 Repository Overview

This repository contains **Valheim Monitor**, a serverless AWS infrastructure setup that monitors a dedicated Valheim game server and hosts **Bukeperry Bot**, a custom Discord AI assistant powered by Google Gemma on AWS Bedrock.

The project is structured into four main components:
1. **Agent (`agent/`)**: Lightweight bash script running on the Valheim Linux host to send regular status heartbeats and public IP updates to DynamoDB.
2. **Monitor Lambda (`monitor-lambda/`)**: Scheduled AWS Lambda function (every 5 mins) that checks for server status changes, IP changes, or host dropouts (heartbeat timeouts) and notifies a Discord channel.
3. **LLM Lambda (`llm-lambda/`)**: Serverless Discord slash command integration (`/bukeperry`). Implements an asynchronous architecture (API Gateway handler + background worker Lambda) using AWS Bedrock (`google.gemma-4-31b`), local RAG knowledge retrieval, and DynamoDB-backed conversation state.
4. **AWS CDK Infrastructure (`cdk/`)**: AWS CDK v2 infrastructure definitions deploying two separate stacks (`ValheimMonitor` and `ValheimLLM`).

---

## 🏗️ Architecture & Component Details

### 1. `agent/monitor.sh`
- Runs via `cron` on the Valheim host server every 2 minutes.
- Checks systemd service status (`valheim.service`) and public IP address (`ipv4.icanhazip.com`).
- Uses AWS CLI to write heartbeats (`PK: SERVER#VALHEIM`) to DynamoDB table `ValheimMonitorTable`.

### 2. `monitor-lambda/`
- **Runtime**: Node.js 24.x (`Runtime.NODEJS_24_X`), tested with Vitest.
- **Modules**:
  - `handler.js`: Main orchestration entrypoint triggered by EventBridge cron (`minute: '*/5'`).
  - `evaluator.js`: Pure functional evaluation of server state transitions (`ONLINE`, `OFFLINE`, `HEARTBEAT_TIMEOUT`, `IP_CHANGED`).
  - `db.js`: Interacts with `ValheimMonitorTable`.
  - `secrets.js`: Fetches bot credentials from Secrets Manager (`valheim-monitor-secrets`).
  - `discord.js`: Posts formatted alerts via Discord REST API.
- **Tests**: `evaluator.test.js` covers state transitions and timeouts.

### 3. `llm-lambda/`
- **Runtime**: Node.js 24.x (`Runtime.NODEJS_24_X`), TypeScript (`handler.ts`, `worker.ts`, `retriever.ts`).
- **Flow**:
  1. API Gateway receives Discord Interaction webhook at `/interactions`.
  2. `handler.ts` verifies Ed25519 request signature with `discord-interactions` using `public_key` from Secrets Manager.
  3. `handler.ts` immediately returns `DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE` (Type 5) to satisfy Discord's strict 3-second timeout, while asynchronously invoking `worker.ts` (`InvocationType: 'Event'`).
  4. `worker.ts` retrieves relevant Valheim knowledge using `retriever.ts` and loads past conversation state (`lastResponseId`) from DynamoDB `ValheimLLMStateTable`.
  5. `worker.ts` invokes AWS Bedrock model (`BEDROCK_MODEL_ID`, default: `google.gemma-4-31b`) via the `@aws/bedrock-token-generator` and `openai` client.
  6. Response is sanitized (enforces lowercase caveman troll persona, strips stage directions/asterisks) and posted to Discord by patching the original interaction token (`PATCH /webhooks/<app_id>/<token>/messages/@original`).
  7. New response ID is saved to DynamoDB with a 30-day TTL for conversation continuity.

### 4. `cdk/`
- **Entrypoint**: `bin/cdk.ts` instantiates:
  - `ValheimMonitorStack` (`lib/cdk-stack.ts`): DynamoDB table `ValheimMonitorTable`, `ValheimMonitorLambda`, EventBridge rule, Secrets Manager read policy.
  - `ValheimLLMStack` (`lib/llm-stack.ts`): DynamoDB state table `ValheimLLMStateTable`, `ValheimLLMWorkerLambda`, `ValheimLLMLambda`, REST API Gateway (`ValheimLLMGateway`), Secrets Manager read policy, Bedrock IAM permissions.

### 5. `.github/workflows/`
- `main.yml`: Auto-deploys all stacks via AWS CDK on push to `main` using GitHub OIDC role. Creates GitHub releases via `jim-brighter/github-release-action`.
- `pr.yml`: Runs `cdk synth` on pull requests to validate stack synthesis.
- `.github/dependabot.yml`: Manages weekly npm updates across `/cdk`, `/monitor-lambda`, and `/llm-lambda`.

---

## 🛠️ Common Commands & Workflows

### Infrastructure Deployment & Synthesis
Run all commands from within the `cdk/` directory:

```bash
# Install dependencies for all packages & deploy stacks to AWS
cd cdk
npm run deploy

# Synthesize CloudFormation templates without deploying
cd cdk
npm run synth

# Individual CDK commands
npx cdk deploy --all
npx cdk synth --all
```

### Running Tests
```bash
# Run monitor-lambda unit tests (Vitest)
cd monitor-lambda
npm test
```

---

## 🔐 Configuration & Secrets Manager

All Lambda functions read runtime credentials from a single AWS Secrets Manager secret named **`valheim-monitor-secrets`**.

Required secret structure:
```json
{
  "token": "YOUR_DISCORD_BOT_TOKEN",
  "channel_id": "YOUR_DISCORD_CHANNEL_ID",
  "public_key": "YOUR_DISCORD_APPLICATION_PUBLIC_KEY",
  "user_agent": "ValheimMonitorBot",
  "port": "2456"
}
```

- `token` & `channel_id`: Used by `monitor-lambda` to broadcast server status updates.
- `public_key`: Used by `llm-lambda/handler.ts` to verify Discord interaction webhook signatures.

---

## 💡 Code Conventions & Technical Constraints

1. **Node.js Runtime**: All AWS Lambdas use Node.js 24 (`Runtime.NODEJS_24_X`).
2. **Bundling**: TypeScript / Node.js bundling is handled automatically during CDK synth/deploy via `NodejsFunction` and `esbuild`.
3. **Discord Webhook Timeout**: Discord interaction endpoints MUST respond within 3000ms. Do not run heavy processing or Bedrock API calls inside `handler.ts`; pass workloads asynchronously to `worker.ts`.
4. **Bukeperry Persona**: Strict caveman troll formatting rules enforced in `worker.ts`:
   - All lowercase text.
   - Short sentences (3–5 words).
   - No asterisks, stage directions, or markdown formatting in output.
