# 🌲 Valheim Server Monitor & Discord Notifier

An automated, serverless monitoring tool for your **Valheim Dedicated Server**. 

It watches your Valheim server's status and public IP address, and automatically sends real-time updates directly to your Discord server whenever:
- 🟢 Your Valheim server comes online.
- 🔴 Your Valheim server goes offline or crashes.
- 🌐 Your server's public IP address changes (great for home servers with dynamic IP addresses).
- ⚠️ The host machine goes offline or loses internet connection (heartbeat timeout).

---

## 💡 How It Works (In Simple Terms)

You don't need to be a developer or system administrator to set this up! Here is the high-level picture of how the pieces fit together:

```
+---------------------------+             +---------------------------+             +---------------------------+
|   Your Valheim Host       |  Heartbeat  |      AWS Cloud            |   Alerts    |       Discord Channel     |
|   (Linux Server)          | ----------> |  (DynamoDB & Lambda)      | ----------> |  "🟢 Server Status: Up    |
|  Runs a 2-min agent script|             | Checks status every 5 mins|             |   New Address: 1.2.3.4:2456"  |
+---------------------------+             +---------------------------+             +---------------------------+
```

1. **The Agent**: A lightweight script running on your Valheim server checks every 2 minutes if the game is running and records its current IP address.
2. **The Cloud Monitor**: AWS automatically checks these records every 5 minutes. If it detects a status change (or if the server stopped sending heartbeats), it prepares a notification.
3. **Discord Notification**: A Discord Bot posts formatted messages straight to your chosen Discord channel.

---

## 📋 Prerequisites

Before you start, make sure you have the following:

1. **An AWS Account**:
   - You need a free Amazon Web Services (AWS) account. Everything used here fits well within the AWS Free Tier (costs $0/month under normal usage).
   - [Sign up for AWS here](https://aws.amazon.com/) if you don't already have one.

2. **A Linux Server Hosting Valheim**:
   - Your Valheim server must be running as a systemd service (e.g. `valheim.service`).
   - You need SSH or command-line access to this server.

3. **A Discord Server & Administrator Rights**:
   - You need permission to add a Bot and manage channels in your Discord server.

4. **Software on Your Local Computer**:
   - **Node.js** (v18 or newer): [Download Node.js](https://nodejs.org/).
   - **AWS CLI**: [Install AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) and configure it with your AWS credentials (`aws configure`).

---

## 🚀 Setup Guide

Follow these 4 straightforward steps to get your monitor running:

### Step 1: Create a Discord Bot

1. Open the [Discord Developer Portal](https://discord.com/developers/applications) and log in.
2. Click **New Application**, name it (e.g., `Valheim Monitor`), and click **Create**.
3. Go to the **Bot** menu on the left sidebar:
   - Click **Reset Token** (or **Copy Token**) to copy your Bot Token. **Save this token securely!**
4. Go to **OAuth2 -> URL Generator**:
   - Under **Scopes**, select `bot`.
   - Under **Bot Permissions**, select `Send Messages`.
   - Copy the generated URL at the bottom and paste it into your browser to invite your bot to your Discord server.
5. In Discord, turn on **Developer Mode** (*User Settings -> Advanced -> Developer Mode*).
6. Right-click the Discord channel where you want status notifications posted and click **Copy Channel ID**.

---

### Step 2: Store Secrets in AWS Secrets Manager

1. Open the [AWS Secrets Manager Console](https://console.aws.amazon.com/secretsmanager/).
2. Click **Store a new secret**.
3. Choose **Other type of secret** and select the **Plaintext** tab.
4. Paste the following JSON (replace with your actual Discord token and channel ID):

```json
{
  "token": "YOUR_DISCORD_BOT_TOKEN_HERE",
  "channel_id": "YOUR_DISCORD_CHANNEL_ID_HERE",
  "user_agent": "ValheimMonitorBot",
  "port": "2456"
}
```

5. Click **Next**, set the **Secret name** to `valheim-monitor-secrets`, and click **Store**.

> [!NOTE]
> Make sure the secret is named **exactly** `valheim-monitor-secrets`. The AWS CDK deployment automatically looks up this secret by name in your AWS account and grants the Lambda function permission to read it.

---

### Step 3: Deploy the AWS Infrastructure

1. Clone or download this repository to your computer:
   ```bash
   git clone https://github.com/jim-brighter/valheim-monitor.git
   cd valheim-monitor/cdk
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Deploy to your AWS account:
   ```bash
   npx cdk deploy
   ```
   *Type `y` when prompted to confirm deployment.*

---

### Step 4: Install the Agent on Your Valheim Server

1. Connect to your Valheim server via SSH.
2. Ensure the **AWS CLI** is installed on your server and configured with permissions to write to DynamoDB (`aws configure`).
3. Copy the agent script [`agent/monitor.sh`](agent/monitor.sh) to your server (e.g., `/home/steam/monitor.sh`).
4. Make the script executable:
   ```bash
   chmod +x /home/steam/monitor.sh
   ```
5. Add a cron job to run the script every 2 minutes:
   ```bash
   crontab -e
   ```
   Add this line at the bottom:
   ```cron
   */2 * * * * /home/steam/monitor.sh > /dev/null 2>&1
   ```

---

## 🧪 Testing Your Setup

- **Test Online Alert**: Start your Valheim server. Within ~5 minutes, you should see a `🟢 Up` message in your Discord channel with your IP address!
- **Test Offline Alert**: Stop the Valheim service (`systemctl --user stop valheim.service`). Within ~5 minutes, a `🔴 Down` alert will appear in Discord.

---

## 🔍 Troubleshooting & FAQ

<details>
<summary><b>Why am I not receiving Discord messages?</b></summary>

- Check that the bot has `Send Messages` permission in the specified channel.
- Verify that your secret in AWS Secrets Manager is named exactly `valheim-monitor-secrets` and contains valid `token` and `channel_id` values.
</details>

<details>
<summary><b>What if my server's IP address changes?</b></summary>

The agent script checks `ipv4.icanhazip.com` on every run. If your ISP changes your public IP address, the monitor automatically detects the new IP and posts an updated server address in Discord (e.g., `New Address: 203.0.113.5:2456`).
</details>

<details>
<summary><b>How much does this cost to run on AWS?</b></summary>

Virtually zero! The setup uses AWS DynamoDB (on-demand mode), AWS Lambda, EventBridge, and Secrets Manager. All of these fall well within the monthly limits of the AWS Free Tier.
</details>

---

## 🛠️ Project Structure

```text
valheim-monitor/
├── agent/
│   └── monitor.sh       # Bash script to run on your Valheim server via cron
├── cdk/
│   ├── lib/             # AWS CDK infrastructure definition (DynamoDB, Lambda, Cron)
│   └── bin/             # CDK entry point
└── lambda/
    ├── handler.js       # Main AWS Lambda orchestration entrypoint
    ├── evaluator.js     # Pure logic to evaluate server status transitions
    ├── db.js            # DynamoDB reader/writer module
    ├── secrets.js       # Secrets Manager fetcher module
    ├── discord.js       # Discord REST API notifier module
    └── evaluator.test.js# Vitest unit test suite
```

---

## 📜 License

MIT License. Feel free to modify and adapt for your own gaming servers!
