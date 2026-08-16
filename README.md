# 🌲 Valheim Server Monitor & Bukeperry Discord LLM Bot

An automated, serverless monitoring tool and interactive AI Discord bot for your **Valheim Dedicated Server**.

It features two complementary serverless stacks:
1. **Server Status Monitor**: Watches your Valheim server's status and public IP address, sending real-time alerts to Discord whenever:
   - 🟢 Your server comes online.
   - 🔴 Your server goes offline or crashes.
   - 🌐 Your server's public IP address changes (great for home servers with dynamic IP addresses).
   - ⚠️ The host machine goes offline or loses internet connection (heartbeat timeout).
2. **Bukeperry LLM Bot (`/bukeperry`)**: An interactive Discord AI troll bot powered by **Google Gemma on AWS Bedrock**. Ask Bukeperry about Valheim items, biomes, or server life and receive humorous caveman responses powered by a local Valheim RAG knowledge base and DynamoDB conversation memory!

---

## 💡 How It Works

```
========================= 1. SERVER STATUS MONITOR =========================
+---------------------------+             +---------------------------+             +---------------------------+
|   Your Valheim Host       |  Heartbeat  |      AWS Cloud            |   Alerts    |       Discord Channel     |
|   (Linux Server)          | ----------> |  (DynamoDB & Lambda)      | ----------> |  "🟢 Server Status: Up    |
|  Runs 2-min agent script  |             | Checks status every 5 mins|             |   New Address: 1.2.3.4:2456"  |
+---------------------------+             +---------------------------+             +---------------------------+

========================= 2. BUKEPERRY LLM BOT =========================
+---------------------------+             +---------------------------+             +---------------------------+
|   Discord User            |  /bukeperry |  API Gateway & Handler    |  Async Event|  Worker Lambda & Bedrock  |
|   Type: "/bukeperry prompt"| ----------> |  (Verifies signature &    | ----------> |  (Retrieves Valheim RAG & |
|                           |             |   returns deferred 200)   |             |   Gemma 4-31B model)      |
+---------------------------+             +---------------------------+             +-------------+-------------+
              ^                                                                                   |
              |______________________ Patches Original Interaction Webhook _______________________|
```

1. **Server Monitor**: A lightweight bash script running on your Valheim host checks server status and writes heartbeats to AWS DynamoDB every 2 minutes. An EventBridge rule triggers a Lambda function every 5 minutes to evaluate status transitions and post Discord alerts.
2. **Bukeperry LLM Bot**: When a user runs `/bukeperry <message>` in Discord, API Gateway routes the request to an edge handler Lambda which validates the Ed25519 request signature and returns an immediate deferred response (<3s). The handler triggers a background worker Lambda that queries a Valheim knowledge base (RAG), checks conversation history in DynamoDB, calls the Bedrock Gemma model (`google.gemma-4-31b`), and patches the Discord interaction response with Bukeperry's caveman reply.

---

## 📋 Prerequisites

Before starting, ensure you have:

1. **An AWS Account**:
   - Access to AWS services (DynamoDB, Lambda, API Gateway, Secrets Manager, EventBridge, and Bedrock).
   - AWS CLI installed and configured locally (`aws configure`).
2. **A Linux Server Hosting Valheim**:
   - Running Valheim as a systemd service (e.g. `valheim.service`).
   - SSH/command-line access to the host machine.
3. **A Discord Server & Application**:
   - Admin rights to manage Discord applications and invite bots.
4. **Software on Your Local Computer**:
   - **Node.js** (v24 or newer): [Download Node.js](https://nodejs.org/).
   - **AWS CDK CLI**: Installed globally or executed via `npx cdk`.

---

## 🚀 Setup Guide

Follow these 5 steps to deploy the monitor and LLM bot:

### Step 1: Create a Discord Application & Bot

1. Open the [Discord Developer Portal](https://discord.com/developers/applications) and create a **New Application** (e.g., `Valheim Assistant`).
2. **Save Application Information**:
   - Copy the **APPLICATION ID** and **PUBLIC KEY** from the *General Information* tab.
3. **Bot Token & Scopes**:
   - Go to the **Bot** tab and click **Reset Token** (or **Copy Token**). **Save this token securely!**
4. **OAuth2 & Invite Bot**:
   - Go to **OAuth2 -> URL Generator**.
   - Under **Scopes**, select `bot` and `applications.commands`.
   - Under **Bot Permissions**, select `Send Messages`.
   - Copy the generated URL and paste it into your browser to invite the bot to your Discord server.
5. **Get Channel ID**:
   - Enable **Developer Mode** in Discord (*Settings -> Advanced -> Developer Mode*).
   - Right-click your desired status channel and select **Copy Channel ID**.

---

### Step 2: Store Secrets in AWS Secrets Manager

1. Open the [AWS Secrets Manager Console](https://console.aws.amazon.com/secretsmanager/).
2. Click **Store a new secret**.
3. Select **Other type of secret** -> **Plaintext** tab.
4. Paste the following JSON (substituting your actual Discord values):

```json
{
  "token": "YOUR_DISCORD_BOT_TOKEN_HERE",
  "channel_id": "YOUR_DISCORD_CHANNEL_ID_HERE",
  "public_key": "YOUR_DISCORD_APPLICATION_PUBLIC_KEY_HERE",
  "user_agent": "ValheimMonitorBot",
  "port": "2456"
}
```

5. Set the secret name to **`valheim-monitor-secrets`** and click **Store**.

> [!NOTE]
> The secret name must be **`valheim-monitor-secrets`**. The CDK deployment grants both the Monitor and LLM Lambda functions access to this secret.

---

### Step 3: Deploy AWS Infrastructure via CDK

1. Clone this repository and navigate to the `cdk/` directory:
   ```bash
   git clone https://github.com/jim-brighter/valheim-monitor.git
   cd valheim-monitor/cdk
   ```

2. Deploy all AWS CDK stacks (`ValheimMonitor` and `ValheimLLM`):
   ```bash
   npm run deploy
   ```

3. Note the API Gateway endpoint printed in the outputs (e.g., `https://<api-id>.execute-api.us-east-1.amazonaws.com/prod/interactions`).

---

### Step 4: Configure Discord Interactions Endpoint & Slash Command

1. Go back to the [Discord Developer Portal](https://discord.com/developers/applications) for your application.
2. Under **General Information**, locate **INTERACTIONS ENDPOINT URL**.
3. Paste your API Gateway interactions URL (`https://<api-id>.execute-api.us-east-1.amazonaws.com/prod/interactions`) and click **Save Changes**. Discord will test signature verification automatically.
4. Register the `/bukeperry` slash command for your application (with an optional `message` string parameter) in Discord.

---

### Step 5: Install the Agent on Your Valheim Server

1. Connect to your Valheim server via SSH.
2. Ensure the **AWS CLI** is installed and configured with permissions to put items in DynamoDB table `ValheimMonitorTable`.
3. Copy [`agent/monitor.sh`](agent/monitor.sh) to your server (e.g., `/home/steam/monitor.sh`) and make it executable:
   ```bash
   chmod +x /home/steam/monitor.sh
   ```
4. Add a cron job to run the agent every 2 minutes:
   ```bash
   crontab -e
   ```
   Add the following line:
   ```cron
   */2 * * * * /home/steam/monitor.sh > /dev/null 2>&1
   ```

---

## 🧪 Testing Your Setup

- **Test Online Alert**: Start your Valheim server service. Within ~5 minutes, a `🟢 Up` message with your server IP will appear in Discord.
- **Test Offline Alert**: Stop the Valheim service (`systemctl --user stop valheim.service`). Within ~5 minutes, a `🔴 Down` alert will appear in Discord.
- **Test Bukeperry LLM Bot**: Type `/bukeperry message: what do you think of greydwarves?` in Discord. Bukeperry will reply with caveman troll wisdom!

---

## 🤖 CI/CD Integration

The repository includes GitHub Actions workflows under `.github/workflows/`:
- **`main.yml`**: Automatically builds, tests, and deploys CDK stacks to AWS on pushes to `main` using AWS OIDC authentication, and creates GitHub releases.
- **`pr.yml`**: Synthesizes CDK templates on Pull Requests to ensure zero compilation or infrastructure errors.
- **`dependabot.yml`**: Manages weekly dependency updates for `/cdk`, `/monitor-lambda`, and `/llm-lambda`.

---

## 🛠️ Project Structure

```text
valheim-monitor/
├── .github/
│   ├── dependabot.yml   # Dependabot update schedule
│   └── workflows/      # GitHub Actions CI/CD workflows (Deploy & PR checks)
├── agent/
│   └── monitor.sh       # Server heartbeat agent running on Valheim host via cron
├── cdk/
│   ├── bin/cdk.ts       # CDK application entrypoint (ValheimMonitor & ValheimLLM stacks)
│   └── lib/
│       ├── cdk-stack.ts # AWS CDK stack for Server Status Monitor (DynamoDB, Lambda, Cron)
│       └── llm-stack.ts # AWS CDK stack for Bukeperry LLM Bot (API Gateway, Bedrock, Worker)
├── llm-lambda/
│   ├── handler.ts       # Discord interaction API Gateway handler (Ed25519 signature & deferred 200)
│   ├── worker.ts        # Async worker Lambda executing Bedrock Gemma LLM & state management
│   ├── retriever.ts     # RAG retriever matching Valheim topics & troll mental models
│   └── data/
│       └── valheim_knowledge.json # Structured Valheim knowledge base
└── monitor-lambda/
    ├── handler.js       # AWS Lambda handler orchestrating server status evaluations
    ├── evaluator.js     # Pure business logic evaluating server state transitions
    ├── db.js            # DynamoDB interface for server heartbeats
    ├── secrets.js       # AWS Secrets Manager interface
    ├── discord.js       # Discord REST API client
    └── evaluator.test.js# Vitest test suite for evaluator logic
```

---

## 🔍 Troubleshooting & FAQ

<details>
<summary><b>Why is Discord returning "Interaction Failed" for /bukeperry?</b></summary>

- Verify that `public_key` in AWS Secrets Manager matches the **Public Key** from your Discord Developer Portal.
- Ensure API Gateway URL is saved under **Interactions Endpoint URL** in Discord Developer Portal.
- Check CloudWatch Logs for `ValheimLLMLogGroup` and `ValheimLLMWorkerLogGroup`.
</details>

<details>
<summary><b>How does Bukeperry maintain conversation context?</b></summary>

Responses store the Bedrock `response.id` in DynamoDB table `ValheimLLMStateTable` indexed by `channelId` with a 30-day TTL. Subsequent queries in the same channel pass `previous_response_id` to maintain multi-turn dialogue context.
</details>

<details>
<summary><b>How much does this cost on AWS?</b></summary>

Virtually zero! DynamoDB uses on-demand billing, Lambda executions stay well within free tier limits, and Bedrock inference calls for Gemma models incur fractional penny costs per request.
</details>

---

## 📜 License

MIT License. Modify and adapt for your own Valheim or gaming server community!
