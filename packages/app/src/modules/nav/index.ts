//==============================================================================
// NAVIGATION MODULE
//==============================================================================

import { createFrontendModule } from '@backstage/frontend-plugin-api';
import { SidebarContent } from './Sidebar';

//==============================================================================
// NAVIGATION FEATURE REGISTRATION
//==============================================================================

export const navModule = createFrontendModule({
  pluginId: 'app',
  extensions: [SidebarContent],
});
