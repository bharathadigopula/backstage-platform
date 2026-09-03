#!/usr/bin/env bash

#==============================================================================
# BACKSTAGE PLATFORM LIFECYCLE
#==============================================================================

#==============================================================================
# SHELL SAFETY
#==============================================================================

set -euo pipefail

#==============================================================================
# LIFECYCLE INPUTS
#==============================================================================

action="${1:-validate}"
secret_bundle="${2:-}"
source_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
install_root="${BACKSTAGE_INSTALL_ROOT:-/opt/backstage-platform}"
release_ref="${AUTOMATION_REF:-local}"
release_path="$install_root/releases/${release_ref//[^a-zA-Z0-9._-]/-}"
backup_root="${BACKSTAGE_BACKUP_ROOT:-/var/backups/backstage-platform}"

#==============================================================================
# DOCKER COMPOSE WRAPPER
#==============================================================================

compose() {
  docker compose --project-directory "$install_root/current" --file "$install_root/current/compose.yaml" "$@"
}

#==============================================================================
# STACK VALIDATION
#==============================================================================

validate_stack() {
  bash "$source_root/scripts/validate.sh"
}

#==============================================================================
# SECRET FILE MANAGEMENT
#==============================================================================

write_secret() {
  key="$1"
  file_name="$2"
  jq -er --arg key "$key" '.[$key] | select(type == "string" and length > 0 and (contains("\n") | not))' <<< "$secret_bundle" > "$release_path/secrets/$file_name"
  chown 1000:1000 "$release_path/secrets/$file_name"
  chmod 0400 "$release_path/secrets/$file_name"
}

#==============================================================================
# STACK VERIFICATION
#==============================================================================

verify_stack() {
  for attempt in $(seq 1 60); do
    if curl --fail --silent --show-error "http://${BACKSTAGE_BIND_ADDRESS:-127.0.0.1}:7007/.backstage/health/v1/readiness" >/dev/null 2>&1; then
      compose ps --status running >/dev/null
      printf 'backstage_verify=ready\n'
      return 0
    fi
    sleep 2
  done
  compose ps >&2 || true
  return 1
}

#==============================================================================
# STACK DEPLOYMENT
#==============================================================================

deploy_stack() {
  (( EUID == 0 )) || { printf 'Deploy requires root.\n' >&2; exit 1; }
  if ! jq -e '
    type == "object" and
    all(
      "backend_secret",
      "github_token",
      "jenkins_api_token",
      "jenkins_username",
      "microsoft_client_id",
      "microsoft_client_secret",
      "microsoft_tenant_id",
      "postgres_password";
      . as $key | $ARGS.named.bundle[$key]
    )
  ' --argjson bundle "$secret_bundle" <<< "$secret_bundle" >/dev/null; then
    printf 'Backstage secret bundle is incomplete.\n' >&2
    exit 1
  fi
  validate_stack
  install -d -m 0755 "$install_root/releases"
  install -d -m 0755 "$backup_root/metrics"
  rm -rf "$release_path"
  install -d -m 0755 "$release_path"
  cp -a "$source_root/." "$release_path/"
  install -d -m 0700 "$release_path/secrets"
  for mapping in backend_secret:backend-secret github_token:github-token jenkins_api_token:jenkins-api-token jenkins_username:jenkins-username microsoft_client_id:microsoft-client-id microsoft_client_secret:microsoft-client-secret microsoft_tenant_id:microsoft-tenant-id postgres_password:postgres-password; do
    write_secret "${mapping%%:*}" "${mapping##*:}"
  done
  cat > "$release_path/.env" <<EOF
BACKSTAGE_BASE_URL=${BACKSTAGE_BASE_URL:?}
BACKSTAGE_BIND_ADDRESS=${BACKSTAGE_BIND_ADDRESS:?}
BACKSTAGE_VERSION=${release_ref//[^a-zA-Z0-9._-]/-}
JENKINS_BASE_URL=${JENKINS_BASE_URL:?}
EOF
  chmod 0600 "$release_path/.env"
  if [[ -L "$install_root/current" ]]; then ln -sfn "$(readlink -f "$install_root/current")" "$install_root/previous"; fi
  ln -sfn "$release_path" "$install_root/current"
  compose build --pull
  compose up --detach --remove-orphans
  verify_stack
  printf 'backstage_deploy=ready\n'
}

#==============================================================================
# DATABASE BACKUP
#==============================================================================

backup_stack() {
  (( EUID == 0 )) || { printf 'Backup requires root.\n' >&2; exit 1; }
  install -d -m 0700 "$backup_root"
  archive="$backup_root/backstage-$(date -u +%Y%m%dT%H%M%SZ).sql.gz"
  compose exec -T postgres pg_dump --username backstage backstage | gzip > "$archive.partial"
  mv "$archive.partial" "$archive"
  chmod 0600 "$archive"
  find "$backup_root" -type f -name 'backstage-*.sql.gz' -mtime +7 -delete
  metrics_file="$backup_root/metrics/backstage-backup.prom"
  {
    printf '# TYPE backstage_backup_last_success_timestamp_seconds gauge\n'
    printf 'backstage_backup_last_success_timestamp_seconds %s\n' "$(date -u +%s)"
    printf '# TYPE backstage_backup_size_bytes gauge\n'
    printf 'backstage_backup_size_bytes %s\n' "$(stat -c %s "$archive")"
  } > "$metrics_file.partial"
  mv "$metrics_file.partial" "$metrics_file"
  chmod 0644 "$metrics_file"
  printf 'backstage_backup=%s\n' "$archive"
  printf 'backstage_backup=ready\n'
}

#==============================================================================
# DATABASE RESTORE
#==============================================================================

restore_stack() {
  (( EUID == 0 )) || { printf 'Restore requires root.\n' >&2; exit 1; }
  archive="${BACKSTAGE_RESTORE_ARCHIVE:-}"
  [[ "$archive" =~ ^/var/backups/backstage-platform/backstage-[0-9]{8}T[0-9]{6}Z\.sql\.gz$ && -f "$archive" ]] || { printf 'Invalid restore archive.\n' >&2; exit 1; }
  gzip --decompress --stdout "$archive" | compose exec -T postgres psql --username backstage backstage
  verify_stack
  printf 'backstage_restore=ready\n'
}

#==============================================================================
# RELEASE ROLLBACK
#==============================================================================

rollback_stack() {
  (( EUID == 0 )) || { printf 'Rollback requires root.\n' >&2; exit 1; }
  [[ -L "$install_root/previous" ]] || { printf 'No previous release.\n' >&2; exit 1; }
  current_release=$(readlink -f "$install_root/current")
  previous_release=$(readlink -f "$install_root/previous")
  ln -sfn "$previous_release" "$install_root/current"
  ln -sfn "$current_release" "$install_root/previous"
  compose up --detach --remove-orphans
  verify_stack
  printf 'backstage_rollback=ready\n'
}

#==============================================================================
# ACTION DISPATCH
#==============================================================================

case "$action" in
  validate) validate_stack ;;
  dry-run) validate_stack; printf 'backstage_dry_run=ready\n' ;;
  deploy) deploy_stack ;;
  verify) verify_stack ;;
  status) compose ps; verify_stack; printf 'backstage_status=ready\n' ;;
  backup) backup_stack ;;
  restore) restore_stack ;;
  rollback) rollback_stack ;;
  *) printf 'Invalid Backstage action.\n' >&2; exit 2 ;;
esac