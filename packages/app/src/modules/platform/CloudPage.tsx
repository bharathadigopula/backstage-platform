//==============================================================================
// CLOUD RESOURCE PAGE
//==============================================================================

import {
  Content,
  Header,
  Page,
  Progress,
  Table,
} from '@backstage/core-components';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { useApi } from '@backstage/core-plugin-api';
import { useEffect, useState } from 'react';

//==============================================================================
// CLOUD RESOURCE TYPES
//==============================================================================

type CloudResource = {
  name: string;
  provider: string;
  environment: string;
  region: string;
  owner: string;
  lifecycle: string;
  expiresAt: string;
  approval: string;
};

type PlatformPageProps = {
  title: string;
  subtitle: string;
  resourceType?: string;
};

//==============================================================================
// CLOUD RESOURCE CATALOG VIEW
//==============================================================================

export function CloudPage({
  title,
  subtitle,
  resourceType,
}: PlatformPageProps) {
  const catalogApi = useApi(catalogApiRef);
  const [resources, setResources] = useState<CloudResource[]>();

  //==============================================================================
  // CATALOG RESOURCE LOADING
  //==============================================================================

  useEffect(() => {
    let active = true;

    catalogApi.getEntities({ filter: { kind: 'Resource' } }).then(response => {
      if (!active) {
        return;
      }

      setResources(
        response.items
          .filter(entity => !resourceType || entity.spec?.type === resourceType)
          .map(entity => ({
            name: entity.metadata.title ?? entity.metadata.name,
            provider:
              entity.metadata.annotations?.[
                'cloud.bharathcoudops.dev/provider'
              ] ?? 'Unassigned',
            environment:
              entity.metadata.annotations?.[
                'cloud.bharathcoudops.dev/environment'
              ] ?? 'Unassigned',
            region:
              entity.metadata.annotations?.[
                'cloud.bharathcoudops.dev/region'
              ] ?? 'Global',
            owner: String(entity.spec?.owner ?? 'Unassigned'),
            lifecycle: String(entity.spec?.lifecycle ?? 'Unknown'),
            expiresAt:
              entity.metadata.annotations?.[
                'cloud.bharathcoudops.dev/expires-at'
              ] ?? 'Not applicable',
            approval:
              entity.metadata.annotations?.[
                'cloud.bharathcoudops.dev/approval-state'
              ] ?? 'Not required',
          })),
      );
    });

    return () => {
      active = false;
    };
  }, [catalogApi, resourceType]);

  //==============================================================================
  // RESOURCE TABLE RENDERING
  //==============================================================================

  return (
    <Page themeId="tool">
      <Header title={title} subtitle={subtitle} />
      <Content>
        {!resources ? (
          <Progress />
        ) : (
          <Table
            title="Managed resources"
            options={{ paging: true, search: true, pageSize: 20 }}
            columns={[
              { title: 'Resource', field: 'name' },
              { title: 'Provider', field: 'provider' },
              { title: 'Environment', field: 'environment' },
              { title: 'Region', field: 'region' },
              { title: 'Owner', field: 'owner' },
              { title: 'Lifecycle', field: 'lifecycle' },
              { title: 'Expires', field: 'expiresAt' },
              { title: 'Approval', field: 'approval' },
            ]}
            data={resources}
          />
        )}
      </Content>
    </Page>
  );
}
