# 🌲 Valheim Dedicated Server Monitor

An automated, serverless monitoring tool for your **Valheim Dedicated Server**.

Monitors your Valheim server's status, version, backups, and public IP address, sending real-time alerts to Discord whenever:
- 🟢 Your server comes online.
- 🔴 Your server goes offline or crashes.
- 🌐 Your server's public IP address changes (great for home servers with dynamic IP addresses).
- ⚠️ The host machine goes offline or loses internet connection (heartbeat timeout).
- 💾 A scheduled server backup is missed (older than 25 hours).
- 🔄 A new Valheim server version is detected.

> [!TIP]
> Looking for **Bukeperry**, the in-game AI troll companion mod and Bedrock Discord bot? Check out the dedicated repository: [**jim-brighter/bukeperry**](https://github.com/jim-brighter/bukeperry).

---

## 💡 How It Works

```
+---------------------------+             +---------------------------+             +---------------------------+
|   Your Valheim Host       |  Heartbeat  |      AWS Cloud            |   Alerts    |       Discord Channel     |
|   (Linux Server)          | ----------> |  (DynamoDB & Lambda)      | ----------> |  "🟢 Server Status: Up    |
|  Runs cron agent script   |             | Checks status every 5 mins|             |   New Address: 1.2.3.4:2456"  |
+---------------------------+             +---------------------------+             +---------------------------+
```

1. **Host Agent (`agent/monitor.sh`)**: A lightweight bash script running via cron on your Valheim Linux host checks systemd service status, public IP address, version, and latest backup archive timestamp, writing heartbeats to AWS DynamoDB every 5 minutes.
2. **Monitor Lambda (`monitor-lambda/`)**: Scheduled via EventBridge (every 5 minutes, offset by 2 minutes) to evaluate state transitions in DynamoDB (`ValheimMonitorTable`) and post formatted webhook notifications to Discord via the Discord REST API.
3. **AWS CDK (`cdk/`)**: Manages the serverless cloud infrastructure stack `ValheimMonitor` (DynamoDB table, Lambda function, EventBridge rule, and Secrets Manager integration).

---

## 📁 Repository Structure

```
.
├── agent/
│   └── monitor.sh            # Cron agent script running on the Linux host
├── monitor-lambda/           # Node.js 24 / TypeScript monitoring Lambda
│   ├── src/
│   │   ├── config.ts         # Configuration constants & TTL timeouts
│   │   ├── db.ts             # DynamoDB state persistence
│   │   ├── discord.ts        # Discord webhook alert dispatcher
│   │   ├── evaluator.ts      # Pure functional state transition engine
│   │   ├── handler.ts        # EventBridge cron handler entrypoint
│   │   ├── secrets.ts        # AWS Secrets Manager loader (valheim-discord-secrets)
│   │   └── types.ts          # TypeScript type definitions
│   └── test/                 # Vitest unit test suite
├── cdk/                      # AWS CDK infrastructure definition
│   ├── bin/cdk.ts            # CDK entrypoint (deploys ValheimMonitorStack)
│   └── lib/cdk-stack.ts      # Stack definition
└── .github/                  # CI/CD workflows and dependabot
```

---

## 🛠️ Common Commands

### Deploy Infrastructure
```bash
cd cdk
npm run deploy
```

### Synthesize CloudFormation
```bash
cd cdk
npm run synth
```

### Run Unit Tests
```bash
cd monitor-lambda
npm test
```

---

## 🔐 Configuration & Secrets Manager

The Lambda reads runtime credentials from AWS Secrets Manager secret **`valheim-discord-secrets`**.

Required secret structure:
```json
{
  "token": "YOUR_DISCORD_BOT_TOKEN",
  "channel_id": "YOUR_DISCORD_CHANNEL_ID",
  "port": "2456",
  "user_agent": "ValheimMonitorBot"
}
```
