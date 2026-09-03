# Local Backstage Plugins

This workspace currently uses published Backstage and Backstage Community packages; no local plugin package is required. Add code here only when the capability cannot be implemented through an existing plugin, frontend module, or backend module.

## Create A Plugin

Run the Backstage package generator from the repository root:

```bash
yarn new
```

Select the required plugin or module type and keep the generated package under `plugins/<name>`. Yarn discovers it through the root `plugins/*` workspace pattern.

## Register A Plugin

Frontend plugins and modules are registered through `packages/app/src/App.tsx`. Backend plugins and modules are registered through `packages/backend/src/index.ts`. Add configuration schema and production values with the package when required.

## Validate A Plugin

```bash
yarn install --immutable
yarn prettier:check
yarn tsc
yarn lint:all
yarn test
yarn build:all
```

Review the [Backstage plugin marketplace](https://backstage.io/plugins) before introducing a local implementation.
