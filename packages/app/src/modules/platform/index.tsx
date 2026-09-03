//==============================================================================
// PLATFORM PAGE PLUGIN
//==============================================================================

import {
  createFrontendPlugin,
  PageBlueprint,
} from '@backstage/frontend-plugin-api';
import { Navigate } from 'react-router-dom';

//==============================================================================
// ROOT REDIRECT PAGE
//==============================================================================

const rootPage = PageBlueprint.make({
  name: 'root',
  params: {
    path: '/',
    loader: async () => <Navigate to="/home" replace />,
  },
});

//==============================================================================
// CLOUD ESTATE PAGE
//==============================================================================

const cloudPage = PageBlueprint.make({
  name: 'cloud',
  params: {
    path: '/cloud',
    loader: () =>
      import('./CloudPage').then(module => (
        <module.CloudPage
          title="Cloud Estate"
          subtitle="Resources across providers, environments, and regions"
        />
      )),
  },
});

//==============================================================================
// ENVIRONMENT INVENTORY PAGE
//==============================================================================

const environmentsPage = PageBlueprint.make({
  name: 'environments',
  params: {
    path: '/environments',
    loader: () =>
      import('./CloudPage').then(module => (
        <module.CloudPage
          title="Environments"
          subtitle="Owned runtime environments and regional placement"
          resourceType="environment"
        />
      )),
  },
});

//==============================================================================
// SANDBOX INVENTORY PAGE
//==============================================================================

const sandboxesPage = PageBlueprint.make({
  name: 'sandboxes',
  params: {
    path: '/sandboxes',
    loader: () =>
      import('./CloudPage').then(module => (
        <module.CloudPage
          title="Sandboxes"
          subtitle="Time-bound environments, ownership, and lease expiry"
          resourceType="sandbox"
        />
      )),
  },
});

//==============================================================================
// INFRASTRUCTURE APPROVAL PAGE
//==============================================================================

const approvalsPage = PageBlueprint.make({
  name: 'approvals',
  params: {
    path: '/approvals',
    loader: () =>
      import('./CloudPage').then(module => (
        <module.CloudPage
          title="Approvals"
          subtitle="Repository-reviewed infrastructure and extension requests"
          resourceType="approval"
        />
      )),
  },
});

//==============================================================================
// PLATFORM OPERATIONS PAGE
//==============================================================================

const operationsPage = PageBlueprint.make({
  name: 'operations',
  params: {
    path: '/operations',
    loader: () =>
      import('./CloudPage').then(module => (
        <module.CloudPage
          title="Operations"
          subtitle="Managed platform services and operational resources"
          resourceType="platform-service"
        />
      )),
  },
});

//==============================================================================
// PLATFORM FEATURE REGISTRATION
//==============================================================================

export const platformPlugin = createFrontendPlugin({
  pluginId: 'platform',
  extensions: [
    rootPage,
    cloudPage,
    environmentsPage,
    sandboxesPage,
    approvalsPage,
    operationsPage,
  ],
});
