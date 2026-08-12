#!/bin/bash

export XDG_RUNTIME_DIR="/run/user/$UID"
export DBUS_SESSION_BUS_ADDRESS="unix:path=${XDG_RUNTIME_DIR}/bus"

current_server_status=$(systemctl --user show valheim.service --property ActiveState --value)
current_ip_address=$(curl -s ipv4.icanhazip.com)
current_timestamp=$(( $(date +%s) * 1000 ))
current_version=$(grep buildid /home/vhserver/valheim_server/steamapps/appmanifest_896660.acf | tr '[:blank:]"' ' ' | tr -s ' ' | cut -d\  -f3)

/usr/local/bin/aws dynamodb put-item \
--table-name ValheimMonitorTable \
--item '{
  "PK": {"S": "agent-status"},
  "ipAddress": {"S": "'"$current_ip_address"'"},
  "status": {"S": "'"$current_server_status"'"},
  "updatedTimestamp": {"N": "'"$current_timestamp"'"},
  "currentVersion": {"N": "'"$current_version"'"}
}' --region us-east-1
