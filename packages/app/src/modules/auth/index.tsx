//==============================================================================
// AUTHENTICATION MODULE
//==============================================================================

import { SignInPage } from '@backstage/core-components';
import { createFrontendModule } from '@backstage/frontend-plugin-api';
import { SignInPageBlueprint } from '@backstage/plugin-app-react';

//==============================================================================
// ENVIRONMENT-AWARE SIGN-IN PAGE
//==============================================================================

const signInPage = SignInPageBlueprint.make({
  params: {
    loader: async () => props =>
      <SignInPage {...props} providers={['guest']} />,
  },
});

//==============================================================================
// AUTHENTICATION FEATURE REGISTRATION
//==============================================================================

export const authModule = createFrontendModule({
  pluginId: 'app',
  extensions: [signInPage],
});
