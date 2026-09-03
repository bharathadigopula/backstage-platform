#!/usr/bin/env bash

#==============================================================================
# BACKSTAGE PLATFORM VALIDATION
#==============================================================================

#==============================================================================
# SHELL SAFETY
#==============================================================================

set -euo pipefail

#==============================================================================
# REQUIRED FILE VALIDATION
#==============================================================================

repository_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
required_files=(app-config.yaml app-config.production.yaml catalog/all.yaml compose.yaml packages/backend/Dockerfile scripts/bootstrap.sh scripts/manage.sh templates/all.yaml)
for required_file in "${required_files[@]}"; do
  [[ -f "$repository_root/$required_file" ]] || { printf 'Missing required file: %s\n' "$required_file" >&2; exit 1; }
done

#==============================================================================
# CONTAINER IMAGE VALIDATION
#==============================================================================

if grep -R --line-number --extended-regexp '(FROM|image:)[[:space:]]+[^[:space:]]+:latest([[:space:]]|$)' "$repository_root/packages/backend/Dockerfile" "$repository_root/compose.yaml"; then
  printf 'Container images must use pinned tags.\n' >&2
  exit 1
fi

#==============================================================================
# SECRET BUNDLE VALIDATION
#==============================================================================

sample_bundle='{"backend_secret":"01234567890123456789012345678901","github_token":"github-token-at-least-twenty","jenkins_api_token":"jenkins-token","jenkins_username":"backstage","postgres_password":"postgres-password-at-least-sixteen"}'
for key in backend_secret github_token jenkins_api_token jenkins_username postgres_password; do
  jq -er --arg key "$key" '.[$key] | select(type == "string" and length > 0 and (contains("\n") | not))' <<< "$sample_bundle" >/dev/null
done

incomplete_bundle='{"backend_secret":"present"}'
if jq -e '
  type == "object" and
  all(
    "backend_secret",
    "github_token",
    "jenkins_api_token",
    "jenkins_username",
    "postgres_password";
    . as $key | $ARGS.named.bundle[$key]
  )
' --argjson bundle "$incomplete_bundle" <<< "$incomplete_bundle" >/dev/null; then
  printf 'Incomplete secret bundle was accepted.\n' >&2
  exit 1
fi

#==============================================================================
# OCI PAYLOAD VALIDATION
#==============================================================================

sample_arguments=$(jq -cn --arg bundle "$sample_bundle" '["deploy","bharathadigopula/backstage-platform","v1.0.0","https://backstage.bharathcloudops.com","10.10.10.69","https://jenkins.bharathcloudops.com","",$bundle]')
argument_line=$(jq -r '[.[] | @sh] | "set -- " + join(" ")' <<< "$sample_arguments")
rendered_size=$(printf '%s\n%s' "$argument_line" "$(cat "$repository_root/scripts/bootstrap.sh")" | wc -c | tr -d ' ')
(( rendered_size <= 4096 )) || { printf 'Rendered bootstrap exceeds 4096 bytes.\n' >&2; exit 1; }

#==============================================================================
# DOCKER COMPOSE VALIDATION
#==============================================================================

if docker compose version >/dev/null 2>&1; then
  temporary_directory=$(mktemp -d)
  trap 'rm -rf "$temporary_directory"' EXIT
  mkdir "$temporary_directory/secrets"
  for secret in backend-secret github-token jenkins-api-token jenkins-username microsoft-client-id microsoft-client-secret microsoft-tenant-id postgres-password; do printf 'validation-only\n' > "$temporary_directory/secrets/$secret"; done
  cp "$repository_root/compose.yaml" "$temporary_directory/compose.yaml"
  BACKSTAGE_BASE_URL=https://backstage.example.invalid BACKSTAGE_BIND_ADDRESS=127.0.0.1 BACKSTAGE_VERSION=validation JENKINS_BASE_URL=https://jenkins.example.invalid docker compose --project-directory "$temporary_directory" --file "$temporary_directory/compose.yaml" config --quiet
fi

#==============================================================================
# VALIDATION RESULT
#==============================================================================

printf 'backstage_validation=ready\n'