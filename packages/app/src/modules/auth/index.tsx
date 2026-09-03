//==============================================================================
// AUTHENTICATION MODULE
//==============================================================================

import {
  configApiRef,
  microsoftAuthApiRef,
  useApi,
} from '@backstage/core-plugin-api';
import { SignInPage } from '@backstage/core-components';
import { createFrontendModule } from '@backstage/frontend-plugin-api';
import { SignInPageBlueprint } from '@backstage/plugin-app-react';

//==============================================================================
// ENVIRONMENT-AWARE SIGN-IN PAGE
//==============================================================================

const signInPage = SignInPageBlueprint.make({
  params: {
    loader: async () => props => {
      const configApi = useApi(configApiRef);

      if (configApi.getString('auth.environment') === 'development') {
        return <SignInPage {...props} providers={['guest']} />;
      }

      return (
        <SignInPage
          {...props}
          provider={{
            id: 'microsoft-auth-provider',
            title: 'Microsoft Entra ID',
            message: 'Sign in with your organization account',
            apiRef: microsoftAuthApiRef,
          }}
        />
      );
    },
  },
});

//==============================================================================
// AUTHENTICATION FEATURE REGISTRATION
//==============================================================================

export const authModule = createFrontendModule({
  pluginId: 'app',
  extensions: [signInPage],
});
