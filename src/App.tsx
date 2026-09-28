import { useEffect, useState } from 'react';
import { SplitLayout, SplitCol, View, Panel, ConfigProvider } from '@vkontakte/vkui';
import { useActiveVkuiLocation } from '@vkontakte/vk-mini-apps-router';
import { Home } from './panels/Home';
import { Shifts } from './panels/Shifts';
import { Profile } from './panels/Profile';
import { Settings } from './panels/Settings';
import type { AppSettings } from './types';
import { loadFromStorage } from './utils/storage';

const SETTINGS_KEY = 'shifttrack_settings';

export const App = () => {
  const { panel: activePanel = 'home' } = useActiveVkuiLocation();
  const [colorScheme, setColorScheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    document.title = 'ShiftTrack';
  }, []);

  useEffect(() => {
    const loadSettings = async () => {
      const settings = await loadFromStorage<AppSettings>(SETTINGS_KEY, {
        theme: 'light',
        tariffs: [],
        report: {
          format: 'csv',
          destination: 'device',
          fileName: '',
          header: '',
        },
      });
      setColorScheme(settings.theme);
    };
    loadSettings();
  }, []);

  const handleThemeChange = (scheme: 'light' | 'dark') => {
    setColorScheme(scheme);
  };

  return (
    <ConfigProvider colorScheme={colorScheme}>
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
              <Settings onThemeChange={handleThemeChange} />
            </Panel>
          </View>
        </SplitCol>
      </SplitLayout>
    </ConfigProvider>
  );
};
