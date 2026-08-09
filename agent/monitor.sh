#!/bin/bash

# Setup a crontab to run this every 2 minutes

export XDG_RUNTIME_DIR="/run/user/$UID"
export DBUS_SESSION_BUS_ADDRESS="unix:path=${XDG_RUNTIME_DIR}/bus"

current_server_status=$(systemctl --user show valheim.service --property ActiveState --value)
current_ip_address=$(curl -s ipv4.icanhazip.com)
current_timestamp=$(( $(date +%s) * 1000 ))

/usr/local/bin/aws dynamodb put-item \
--table-name ValheimMonitorTable \
--item '{
  "PK": {"S": "agent-status"},
  "ipAddress": {"S": "'"$current_ip_address"'"},
  "status": {"S": "'"$current_server_status"'"},
  "updatedTimestamp": {"N": "'"$current_timestamp"'"}
}' --region us-east-1
