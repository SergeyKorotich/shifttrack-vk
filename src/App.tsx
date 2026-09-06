import React from 'react';
import {
  AppRoot, SplitLayout, SplitCol, View, Panel,
} from '@vkontakte/vkui';
import { useActiveVkuiLocation } from '@vkontakte/vk-mini-apps-router';
import { Home } from './panels/Home';
import { Shifts } from './panels/Shifts';
import { Profile } from './panels/Profile';
import { Settings } from './panels/Settings';

export const App = () => {
  const { panel: activePanel = 'home' } = useActiveVkuiLocation();

  React.useEffect(() => {
    document.title = 'ShiftTrack';
  }, []);

  return (
    <AppRoot>
      <SplitLayout header={null}>
        <SplitCol stretchedOnMobile autoSpaced>
          <View id="default" activePanel={activePanel}>
            <Panel id="home">
              <Home />
            </Panel>
            <Panel id="shifts">
              <Shifts />
            </Panel>
            <Panel id="profile">
              <Profile />
            </Panel>
            <Panel id="settings">
              <Settings />
            </Panel>
          </View>
        </SplitCol>
      </SplitLayout>
    </AppRoot>
  );
};
