#!/bin/bash

export XDG_RUNTIME_DIR="/run/user/$UID"
export DBUS_SESSION_BUS_ADDRESS="unix:path=${XDG_RUNTIME_DIR}/bus"

current_server_status=$(systemctl --user show valheim.service --property ActiveState --value)
current_ip_address=$(curl -s ipv4.icanhazip.com)
current_timestamp=$(( $(date +%s) * 1000 ))
current_version=$(grep buildid /home/vhserver/valheim_server/steamapps/appmanifest_896660.acf | tr '[:blank:]"' ' ' | tr -s ' ' | cut -d\  -f3)
latest_backup=$(ls -td /home/vhserver/backups/archives/* 2>/dev/null | head -n 1)
last_backup_timestamp=0
if [ -n "$latest_backup" ] && [ -e "$latest_backup" ]; then
  last_backup_timestamp=$(( $(stat -c '%Y' "$latest_backup") * 1000 ))
fi

/usr/local/bin/aws dynamodb put-item \
--table-name ValheimMonitorTable \
--item '{
  "PK": {"S": "agent-status"},
  "ipAddress": {"S": "'"$current_ip_address"'"},
  "status": {"S": "'"$current_server_status"'"},
  "updatedTimestamp": {"N": "'"$current_timestamp"'"},
  "currentVersion": {"N": "'"$current_version"'"},
  "lastBackupTimestamp": {"N": "'"$last_backup_timestamp"'"}
}' --region us-east-1
