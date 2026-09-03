# BharathCoudOps Developer Portal

Backstage developer portal for the BharathCoudOps platform catalog, software templates, Jenkins visibility, Microsoft Entra ID authentication, Microsoft Graph organisation sync, and OCI-hosted production operations.

## Supported Versions

| Component              | Version                                    |
| ---------------------- | ------------------------------------------ |
| Backstage release      | `1.54.6`                                   |
| Node.js                | `22` or `24`; Node 24 in CI and containers |
| Yarn                   | `4.13.0`                                   |
| React                  | `18.3.1`                                   |
| PostgreSQL             | `17.11-bookworm`                           |
| PostgreSQL exporter    | `0.20.1`                                   |
| Node exporter          | `1.12.1`                                   |
| Jenkins shared library | `1.4.0`                                    |

Backstage package versions are managed as a release set. Use `yarn backstage-cli versions:bump --release <version>` for future Backstage upgrades; do not upgrade React, React Router, TypeScript, or native database packages independently of Backstage compatibility.

## Local Development

Install Node 24 and provide a GitHub token used by the configured integration:

```bash
export GITHUB_TOKEN='<token>'
node .yarn/releases/yarn-4.13.0.cjs install --immutable
node .yarn/releases/yarn-4.13.0.cjs start
```

The frontend is available at `http://localhost:3000` and the backend at `http://localhost:7007`. Local development uses guest authentication and an in-memory SQLite database.

## Production Configuration

The production container loads [app-config.yaml](app-config.yaml) followed by [app-config.production.yaml](app-config.production.yaml). The production file overrides public URLs, PostgreSQL, Microsoft authentication, Microsoft Graph, and Jenkins.

| Variable                 | Default                           | Description                                               |
| ------------------------ | --------------------------------- | --------------------------------------------------------- |
| `BACKSTAGE_BASE_URL`     | Required                          | Public HTTPS URL used by the frontend, backend, and CORS  |
| `BACKSTAGE_BIND_ADDRESS` | Required                          | Private host address used for published Compose ports     |
| `BACKSTAGE_VERSION`      | Required                          | Immutable application image tag, normally the release tag |
| `JENKINS_BASE_URL`       | Required                          | Public Jenkins URL for the `platform` instance            |
| `POSTGRES_HOST`          | `postgres`                        | Compose PostgreSQL service name                           |
| `POSTGRES_PORT`          | `5432`                            | PostgreSQL service port                                   |
| `POSTGRES_USER`          | `backstage`                       | PostgreSQL role                                           |
| `BACKSTAGE_INSTALL_ROOT` | `/opt/backstage-platform`         | Versioned release installation root                       |
| `BACKSTAGE_BACKUP_ROOT`  | `/var/backups/backstage-platform` | Database backup and metrics root                          |

## Secret Bundle

Deployment reads one JSON object from OCI Vault and writes each value to a root-owned release secret file. Values must be non-empty single-line strings. No secret files are committed.

| JSON key                  | Container variable             | Purpose                                                                        |
| ------------------------- | ------------------------------ | ------------------------------------------------------------------------------ |
| `backend_secret`          | `BACKSTAGE_BACKEND_SECRET`     | Backstage service-to-service signing secret; use at least 32 random characters |
| `github_token`            | `GITHUB_TOKEN`                 | GitHub catalog and scaffolder integration token                                |
| `jenkins_api_token`       | `JENKINS_API_TOKEN`            | Jenkins API token                                                              |
| `jenkins_username`        | `JENKINS_USERNAME`             | Jenkins service account                                                        |
| `microsoft_client_id`     | `AUTH_MICROSOFT_CLIENT_ID`     | Entra application client ID                                                    |
| `microsoft_client_secret` | `AUTH_MICROSOFT_CLIENT_SECRET` | Entra application client secret                                                |
| `microsoft_tenant_id`     | `AUTH_MICROSOFT_TENANT_ID`     | Entra tenant ID                                                                |
| `postgres_password`       | `POSTGRES_PASSWORD`            | PostgreSQL password; use at least 16 random characters                         |

## Validation

Run the same checks used by Jenkins from the repository root:

```bash
bash scripts/validate.sh
node .yarn/releases/yarn-4.13.0.cjs install --immutable
node .yarn/releases/yarn-4.13.0.cjs prettier:check
node .yarn/releases/yarn-4.13.0.cjs tsc
node .yarn/releases/yarn-4.13.0.cjs workspace app test --watch=false
node .yarn/releases/yarn-4.13.0.cjs build:backend
```

Jenkins runs [scripts/validate-ci.sh](scripts/validate-ci.sh) inside Node 24 through `backstage-platform/validate/main`. That job uses the Jenkins `platform` label and never targets `k3s`.

## Production Stack

[compose.yaml](compose.yaml) defines four services with pinned images and resource limits.

| Service                 | Published port | Persistent data                    |
| ----------------------- | -------------- | ---------------------------------- |
| Backstage               | `7007`         | PostgreSQL                         |
| PostgreSQL              | Internal only  | `postgres-data` volume             |
| PostgreSQL exporter     | `9187`         | None                               |
| Backup metrics exporter | `9101`         | Read-only backup metrics directory |

All published ports bind to `BACKSTAGE_BIND_ADDRESS`. Public access must pass through the managed Cloudflare route; the containers do not publish directly on every host interface.

## Lifecycle Actions

[scripts/bootstrap.sh](scripts/bootstrap.sh) downloads an immutable semantic release tag and dispatches to [scripts/manage.sh](scripts/manage.sh).

| Action     | Behaviour                                                                                                                |
| ---------- | ------------------------------------------------------------------------------------------------------------------------ |
| `validate` | Validates repository files, image pins, secret schema, OCI payload size, and Compose when Docker is available            |
| `dry-run`  | Runs validation without changing the host                                                                                |
| `deploy`   | Installs pinned Docker packages, creates a versioned release, builds the image, starts the stack, and verifies readiness |
| `verify`   | Checks container state and Backstage readiness                                                                           |
| `status`   | Prints Compose status and verifies readiness                                                                             |
| `backup`   | Creates a compressed PostgreSQL dump and updates Prometheus textfile metrics                                             |
| `restore`  | Restores a managed backup path and verifies readiness                                                                    |
| `rollback` | Swaps the current and previous release links and verifies readiness                                                      |

Backups are retained for seven days and match `/var/backups/backstage-platform/backstage-YYYYMMDDTHHMMSSZ.sql.gz`.

## Jenkins Deployment

Production deployment is intentionally blocked at present. In `bharath-oci-host-config`, `environments/prd/backstage.json` has `enabled: false`; the target host inventory is not available and the configured automation tag must exist before deployment.

When infrastructure, inventory, Vault data, and a published release tag are ready, use this order:

1. Run `backstage-platform/validate/main` and require success.
2. Update `bharath-oci-host-config/environments/prd/backstage.json` to the published `automation_ref`, add the real `backstage` host inventory, and set `enabled` to `true` through repository review.
3. Run `bharath-oci-host-config/validate/main` and require success.
4. Run `bharath-oci-host-config/configure-backstage` with `ACTION=deploy`.

The deployment pipeline itself performs remote `validate` and `dry-run` stages before `deploy`, then verifies the protected public route. Do not run `configure-backstage` while the configuration remains disabled, and do not redirect it to the Jenkins controller or a `k3s` worker.

## Repository Layout

| Path               | Responsibility                                                                     |
| ------------------ | ---------------------------------------------------------------------------------- |
| `packages/app`     | New frontend system, navigation, authentication, and platform pages                |
| `packages/backend` | Backstage backend plugins and production image                                     |
| `catalog`          | BharathCoudOps domains, systems, components, groups, and resources                 |
| `templates`        | Repository-reviewed sandbox request workflows                                      |
| `scripts`          | Validation, Docker installation, release deployment, backup, restore, and rollback |
| `.jenkins`         | Repository validation pipeline                                                     |
