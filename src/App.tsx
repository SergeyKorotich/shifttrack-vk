import { View, Panel } from '@vkontakte/vkui';
import { useActiveVkuiLocation } from '@vkontakte/vk-mini-apps-router';
import { Shifts } from './panels/Shifts';
import { Profile } from './panels/Profile';

export const App = () => {
  const { panel: activePanel } = useActiveVkuiLocation();

  return (
    <View activePanel={activePanel || 'shifts_panel'}>
      <Panel id="shifts_panel">
        <Shifts />
      </Panel>

      <Panel id="profile_panel">
        <Profile />
      </Panel>
    </View>
  );
};
