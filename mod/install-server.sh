#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Bukeperry Mod - Linux Dedicated Server Installer
#
# Idempotently installs or updates Bukeperry Mod, BepInEx 5, and Jötunn on a
# Linux Valheim dedicated server, and configures Doorstop in systemd.
#
# Usage:
#   ./install-server.sh [options]
#
# Options:
#   -d, --dir DIR          Server install directory (default: /home/vhserver/valheim_server)
#   -e, --endpoint URL     AWS Bedrock API Gateway endpoint URL
#   -k, --key KEY          AWS Bedrock API Gateway API Key
#   -c, --channel-id ID    Optional conversation Channel ID (leave blank for stateless)
#   -s, --setup-systemd    Automatically configure Doorstop in valheim.service
#   -h, --help             Display this help message
# ==============================================================================

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

SERVER_DIR="${VALHEIM_SERVER_DIR:-/home/vhserver/valheim_server}"
API_ENDPOINT=""
API_KEY=""
CHANNEL_ID=""
SET_CHANNEL=false
SETUP_SYSTEMD=false
REPO="jim-brighter/valheim-monitor"

# Parse CLI arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    -d|--dir)
      SERVER_DIR="$2"
      shift 2
      ;;
    -e|--endpoint)
      API_ENDPOINT="$2"
      shift 2
      ;;
    -k|--key)
      API_KEY="$2"
      shift 2
      ;;
    -c|--channel-id)
      CHANNEL_ID="$2"
      SET_CHANNEL=true
      shift 2
      ;;
    -s|--setup-systemd)
      SETUP_SYSTEMD=true
      shift
      ;;
    -h|--help)
      echo -e "${BOLD}Bukeperry Mod - Linux Dedicated Server Installer${NC}"
      echo "Usage: $0 [options]"
      echo ""
      echo "Options:"
      echo "  -d, --dir DIR          Server directory (default: /home/vhserver/valheim_server)"
      echo "  -e, --endpoint URL     AWS Bedrock API Gateway endpoint URL"
      echo "  -k, --key KEY          AWS Bedrock API Gateway API Key"
      echo "  -c, --channel-id ID    Optional conversation Channel ID (leave blank for stateless)"
      echo "  -s, --setup-systemd    Automatically update valheim.service with Doorstop variables"
      echo "  -h, --help             Show this help message"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      echo "Use --help for usage instructions."
      exit 1
      ;;
  esac
done

echo -e "${BLUE}${BOLD}=== Bukeperry Mod Linux Dedicated Server Installer ===${NC}\n"

# 1. Validate Target Directory
echo -e "${BOLD}Step 1: Checking target directory...${NC}"
if [[ ! -d "$SERVER_DIR" ]]; then
  echo -e "${YELLOW}Warning: Directory '$SERVER_DIR' does not exist.${NC}"
  if [[ -t 0 ]]; then
    read -rp "Create directory '$SERVER_DIR'? [y/N]: " confirm
    if [[ "$confirm" =~ ^[Yy]$ ]]; then
      mkdir -p "$SERVER_DIR"
    else
      echo -e "${RED}Aborting.${NC}"
      exit 1
    fi
  else
    echo -e "${RED}Directory does not exist. Aborting.${NC}"
    exit 1
  fi
fi

if [[ ! -f "$SERVER_DIR/valheim_server.x86_64" ]]; then
  echo -e "${YELLOW}Notice: '$SERVER_DIR/valheim_server.x86_64' was not found in this directory.${NC}"
  echo -e "${YELLOW}Proceeding anyway (assuming initial or custom setup).${NC}"
else
  echo -e "${GREEN}✓ Found Valheim server executable in $SERVER_DIR${NC}"
fi

# 2. Download Latest Server Bundle
echo -e "\n${BOLD}Step 2: Fetching latest bukeperry-server-bundle.zip...${NC}"
TMP_DIR=$(mktemp -d /tmp/bukeperry-install.XXXXXX)
trap 'rm -rf "$TMP_DIR"' EXIT

LATEST_RELEASE_JSON=$(curl -sL "https://api.github.com/repos/$REPO/releases/latest")
DOWNLOAD_URL=$(echo "$LATEST_RELEASE_JSON" | grep -o 'https://[^"]*bukeperry-server-bundle\.zip' | head -n 1 || true)

if [[ -z "$DOWNLOAD_URL" ]]; then
  echo -e "${YELLOW}Could not find 'bukeperry-server-bundle.zip' in latest GitHub release.${NC}"
  echo -e "${YELLOW}Checking release assets list...${NC}"
  DOWNLOAD_URL=$(echo "$LATEST_RELEASE_JSON" | grep '"browser_download_url":' | grep 'bukeperry-server-bundle\.zip' | cut -d'"' -f4 | head -n 1 || true)
fi

if [[ -z "$DOWNLOAD_URL" ]]; then
  echo -e "${RED}Error: Failed to find bukeperry-server-bundle.zip download URL from GitHub Releases.${NC}"
  echo -e "${RED}Please verify releases exist on https://github.com/$REPO/releases${NC}"
  exit 1
fi

echo -e "Downloading bundle from: ${BLUE}$DOWNLOAD_URL${NC}"
curl -sL "$DOWNLOAD_URL" -o "$TMP_DIR/bundle.zip"

echo -e "Extracting bundle into ${BOLD}$SERVER_DIR${NC}..."
unzip -q -o "$TMP_DIR/bundle.zip" -d "$SERVER_DIR"
echo -e "${GREEN}✓ Extracted BepInEx, Jötunn, and BukeperryMod successfully.${NC}"

# 3. Configure BukeperryMod.cfg
echo -e "\n${BOLD}Step 3: Checking Bukeperry Mod configuration...${NC}"
CONFIG_DIR="$SERVER_DIR/BepInEx/config"
CONFIG_FILE="$CONFIG_DIR/com.jimbrighter.bukeperrymod.cfg"
mkdir -p "$CONFIG_DIR"

if [[ ! -f "$CONFIG_FILE" ]]; then
  cat << 'EOF' > "$CONFIG_FILE"
[ChatApi]

## AWS API Gateway endpoint URL for Bukeperry chat.
# Setting type: String
# Default value: 
ApiEndpoint = 

## API Key to authenticate with the Bukeperry chat endpoint.
# Setting type: String
# Default value: 
ApiKey = 

## Optional channel ID for persistent conversation state. Can be a Discord channel ID for continuity between game and Discord. If blank, conversation is stateless.
# Setting type: String
# Default value: 
ChannelId = 

## Maximum distance between player and Bukeperry for chat listening.
# Setting type: Single
# Default value: 20
ProximityRadius = 20
EOF
  echo -e "Created default configuration file: ${BOLD}$CONFIG_FILE${NC}"
fi

# Check existing values
CURRENT_ENDPOINT=$(grep -E '^[[:space:]]*ApiEndpoint[[:space:]]*=' "$CONFIG_FILE" | cut -d'=' -f2- | tr -d ' ' || true)
CURRENT_KEY=$(grep -E '^[[:space:]]*ApiKey[[:space:]]*=' "$CONFIG_FILE" | cut -d'=' -f2- | tr -d ' ' || true)
CURRENT_CHANNEL=$(grep -E '^[[:space:]]*ChannelId[[:space:]]*=' "$CONFIG_FILE" | cut -d'=' -f2- | tr -d ' ' || true)

if [[ -n "$API_ENDPOINT" ]]; then
  CURRENT_ENDPOINT="$API_ENDPOINT"
  sed -i.bak "s|^[[:space:]]*ApiEndpoint[[:space:]]*=.*|ApiEndpoint = $API_ENDPOINT|" "$CONFIG_FILE"
  rm -f "$CONFIG_FILE.bak"
  echo -e "${GREEN}✓ Updated ApiEndpoint from command-line argument.${NC}"
fi

if [[ -n "$API_KEY" ]]; then
  CURRENT_KEY="$API_KEY"
  sed -i.bak "s|^[[:space:]]*ApiKey[[:space:]]*=.*|ApiKey = $API_KEY|" "$CONFIG_FILE"
  rm -f "$CONFIG_FILE.bak"
  echo -e "${GREEN}✓ Updated ApiKey from command-line argument.${NC}"
fi

if [[ "$SET_CHANNEL" == true ]]; then
  CURRENT_CHANNEL="$CHANNEL_ID"
  if grep -q "^[[:space:]]*ChannelId[[:space:]]*=" "$CONFIG_FILE"; then
    sed -i.bak "s|^[[:space:]]*ChannelId[[:space:]]*=.*|ChannelId = $CHANNEL_ID|" "$CONFIG_FILE"
  else
    echo "ChannelId = $CHANNEL_ID" >> "$CONFIG_FILE"
  fi
  rm -f "$CONFIG_FILE.bak"
  if [[ -n "$CHANNEL_ID" ]]; then
    echo -e "${GREEN}✓ Updated ChannelId from command-line argument ($CHANNEL_ID).${NC}"
  else
    echo -e "${GREEN}✓ Updated ChannelId to blank (stateless mode).${NC}"
  fi
fi

# If interactive and values are missing or requested, prompt
if [[ -t 0 ]]; then
  if [[ -z "$CURRENT_ENDPOINT" ]]; then
    read -rp "Enter AWS Bedrock API Endpoint URL (optional, press Enter to skip): " input_endpoint
    if [[ -n "$input_endpoint" ]]; then
      sed -i.bak "s|^[[:space:]]*ApiEndpoint[[:space:]]*=.*|ApiEndpoint = $input_endpoint|" "$CONFIG_FILE"
      rm -f "$CONFIG_FILE.bak"
      CURRENT_ENDPOINT="$input_endpoint"
      echo -e "${GREEN}✓ Saved ApiEndpoint.${NC}"
    fi
  fi

  if [[ -z "$CURRENT_KEY" ]]; then
    read -rsp "Enter AWS Bedrock API Key (optional, press Enter to skip): " input_key
    echo ""
    if [[ -n "$input_key" ]]; then
      sed -i.bak "s|^[[:space:]]*ApiKey[[:space:]]*=.*|ApiKey = $input_key|" "$CONFIG_FILE"
      rm -f "$CONFIG_FILE.bak"
      CURRENT_KEY="$input_key"
      echo -e "${GREEN}✓ Saved ApiKey.${NC}"
    fi
  fi

  if [[ "$SET_CHANNEL" == false ]]; then
    prompt_suffix=""
    if [[ -n "$CURRENT_CHANNEL" ]]; then
      prompt_suffix=" (current: $CURRENT_CHANNEL, press Enter to keep)"
    else
      prompt_suffix=" (optional, press Enter for stateless)"
    fi
    read -rp "Enter Channel ID for conversation memory$prompt_suffix: " input_channel
    if [[ -n "$input_channel" ]]; then
      if grep -q "^[[:space:]]*ChannelId[[:space:]]*=" "$CONFIG_FILE"; then
        sed -i.bak "s|^[[:space:]]*ChannelId[[:space:]]*=.*|ChannelId = $input_channel|" "$CONFIG_FILE"
      else
        echo "ChannelId = $input_channel" >> "$CONFIG_FILE"
      fi
      rm -f "$CONFIG_FILE.bak"
      CURRENT_CHANNEL="$input_channel"
      echo -e "${GREEN}✓ Saved ChannelId ($input_channel).${NC}"
    elif [[ -z "$CURRENT_CHANNEL" ]]; then
      echo -e "ChannelId left empty (stateless mode)."
    fi
  fi
fi

if [[ -z "$CURRENT_ENDPOINT" || -z "$CURRENT_KEY" ]]; then
  echo -e "${YELLOW}Note: ApiEndpoint or ApiKey is currently empty in '$CONFIG_FILE'.${NC}"
  echo -e "${YELLOW}Bukeperry will run in merchant-only mode without AI conversation until configured.${NC}"
else
  CHANNEL_LABEL="${CURRENT_CHANNEL:-stateless}"
  echo -e "${GREEN}✓ AI Conversation configured (Endpoint: $CURRENT_ENDPOINT, Channel: $CHANNEL_LABEL).${NC}"
fi

# 4. Inspect & Configure systemd Service
echo -e "\n${BOLD}Step 4: Inspecting systemd service configuration...${NC}"

SERVICE_LOCATIONS=(
  "$HOME/.config/systemd/user/valheim.service"
  "/etc/systemd/system/valheim.service"
)

FOUND_SERVICE=""
for loc in "${SERVICE_LOCATIONS[@]}"; do
  if [[ -f "$loc" ]]; then
    FOUND_SERVICE="$loc"
    break
  fi
done

DOORSTOP_ENV_LINES=(
  "Environment=\"DOORSTOP_ENABLED=1\""
  "Environment=\"DOORSTOP_TARGET_ASSEMBLY=$SERVER_DIR/BepInEx/core/BepInEx.Preloader.dll\""
  "Environment=\"LD_LIBRARY_PATH=$SERVER_DIR/doorstop_libs:$SERVER_DIR/linux64:\$LD_LIBRARY_PATH\""
  "Environment=\"LD_PRELOAD=libdoorstop_x64.so\""
)

if [[ -n "$FOUND_SERVICE" ]]; then
  echo -e "Found systemd service file: ${BOLD}$FOUND_SERVICE${NC}"
  
  # Check if Doorstop is already present
  if grep -q "DOORSTOP_ENABLED=1" "$FOUND_SERVICE" && grep -q "libdoorstop_x64.so" "$FOUND_SERVICE"; then
    echo -e "${GREEN}✓ Doorstop environment variables are already configured in $FOUND_SERVICE.${NC}"
  else
    echo -e "${YELLOW}Doorstop is NOT yet enabled in $FOUND_SERVICE.${NC}"
    echo -e "To enable BepInEx mods, add these lines to the [Service] section of your service file:\n"
    for line in "${DOORSTOP_ENV_LINES[@]}"; do
      echo -e "  ${BLUE}$line${NC}"
    done
    echo ""

    DO_UPDATE=false
    if [[ "$SETUP_SYSTEMD" == true ]]; then
      DO_UPDATE=true
    elif [[ -t 0 ]]; then
      read -rp "Automatically update '$FOUND_SERVICE'? [y/N]: " confirm_svc
      if [[ "$confirm_svc" =~ ^[Yy]$ ]]; then
        DO_UPDATE=true
      fi
    fi

    if [[ "$DO_UPDATE" == true ]]; then
      # Create backup
      cp "$FOUND_SERVICE" "$FOUND_SERVICE.bak"
      
      # Inject right after [Service]
      awk -v d1="${DOORSTOP_ENV_LINES[0]}" \
          -v d2="${DOORSTOP_ENV_LINES[1]}" \
          -v d3="${DOORSTOP_ENV_LINES[2]}" \
          -v d4="${DOORSTOP_ENV_LINES[3]}" \
          '/^\[Service\]/ { print; print d1; print d2; print d3; print d4; next }1' \
          "$FOUND_SERVICE.bak" > "$FOUND_SERVICE"
      
      echo -e "${GREEN}✓ Injected Doorstop environment variables into $FOUND_SERVICE (backup saved as .bak).${NC}"

      if [[ "$FOUND_SERVICE" == *"/user/"* ]]; then
        systemctl --user daemon-reload || true
        echo -e "${GREEN}✓ Ran systemctl --user daemon-reload.${NC}"
        echo -e "Run ${BOLD}systemctl --user restart valheim.service${NC} to apply changes."
      else
        echo -e "Please run ${BOLD}sudo systemctl daemon-reload && sudo systemctl restart valheim.service${NC} to apply changes."
      fi
    fi
  fi
else
  echo -e "${YELLOW}No systemd service file found at common paths.${NC}"
  echo -e "If running via systemd, ensure these environment variables are included in [Service]:\n"
  for line in "${DOORSTOP_ENV_LINES[@]}"; do
    echo -e "  ${BLUE}$line${NC}"
  done
  echo ""
fi

echo -e "\n${GREEN}${BOLD}=== Installation Complete! ===${NC}"
echo -e "Bukeperry Mod, BepInEx, and Jötunn are staged in: ${BOLD}$SERVER_DIR/BepInEx/plugins${NC}"
echo -e "Restart your Valheim server to load Bukeperry!"
