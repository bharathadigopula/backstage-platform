//==============================================================================
// APPLICATION SIDEBAR NAVIGATION
//==============================================================================

import {
  Sidebar,
  SidebarDivider,
  SidebarGroup,
  SidebarItem,
  SidebarScrollWrapper,
  SidebarSpace,
} from '@backstage/core-components';
import { NavContentBlueprint } from '@backstage/plugin-app-react';
import { SidebarLogo } from './SidebarLogo';
import MenuIcon from '@material-ui/icons/Menu';
import SearchIcon from '@material-ui/icons/Search';
import { SidebarSearchModal } from '@backstage/plugin-search';
import { UserSettingsSignInAvatar } from '@backstage/plugin-user-settings';
import { NotificationsSidebarItem } from '@backstage/plugin-notifications';
import CloudQueueIcon from '@material-ui/icons/CloudQueue';
import AccountTreeIcon from '@material-ui/icons/AccountTree';
import HourglassEmptyIcon from '@material-ui/icons/HourglassEmpty';
import HowToVoteIcon from '@material-ui/icons/HowToVote';
import SettingsInputComponentIcon from '@material-ui/icons/SettingsInputComponent';

//==============================================================================
// SIDEBAR CONTENT BLUEPRINT
//==============================================================================

export const SidebarContent = NavContentBlueprint.make({
  params: {
    component: ({ navItems }) => {
      const nav = navItems.withComponent(item => (
        <SidebarItem icon={() => item.icon} to={item.href} text={item.title} />
      ));

      //==============================================================================
      // CUSTOM NAVIGATION ITEM FILTERING
      //==============================================================================

      nav.take('page:search');
      nav.take('page:notifications');
      nav.take('page:platform/cloud');
      nav.take('page:platform/environments');
      nav.take('page:platform/sandboxes');
      nav.take('page:platform/approvals');
      nav.take('page:platform/operations');

      return (
        <Sidebar>
          <SidebarLogo />
          <SidebarGroup label="Search" icon={<SearchIcon />} to="/search">
            <SidebarSearchModal />
          </SidebarGroup>
          <SidebarDivider />
          <SidebarGroup label="Menu" icon={<MenuIcon />}>
            {nav.take('page:home')}
            {nav.take('page:catalog')}
            {nav.take('page:scaffolder')}
            <SidebarItem icon={CloudQueueIcon} to="/cloud" text="Cloud" />
            <SidebarItem
              icon={AccountTreeIcon}
              to="/environments"
              text="Environments"
            />
            <SidebarItem
              icon={HourglassEmptyIcon}
              to="/sandboxes"
              text="Sandboxes"
            />
            <SidebarItem
              icon={HowToVoteIcon}
              to="/approvals"
              text="Approvals"
            />
            <SidebarItem
              icon={SettingsInputComponentIcon}
              to="/operations"
              text="Operations"
            />
            <SidebarDivider />
            <SidebarScrollWrapper>
              {nav.rest({ sortBy: 'title' })}
            </SidebarScrollWrapper>
          </SidebarGroup>
          <SidebarSpace />
          <SidebarDivider />
          <NotificationsSidebarItem />
          <SidebarDivider />
          <SidebarGroup
            label="Settings"
            icon={<UserSettingsSignInAvatar />}
            to="/settings"
          >
            {nav.take('page:app-visualizer')}
            {nav.take('page:user-settings')}
          </SidebarGroup>
        </Sidebar>
      );
    },
  },
});
