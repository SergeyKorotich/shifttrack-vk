import { createHashRouter } from '@vkontakte/vk-mini-apps-router';

import Home from './panels/Home';
import Shifts from './panels/Shifts';
import Profile from './panels/Profile';
import Settings from './panels/Settings';

export const router = createHashRouter([
  {
    path: '/',
    panel: Home,          // <-- было 'home', теперь компонент
    view: 'default',
  },
  {
    path: '/shifts',
    panel: Shifts,        // <-- было 'shifts'
    view: 'default',
  },
  {
    path: '/profile',
    panel: Profile,       // <-- было 'profile'
    view: 'default',
  },
  {
    path: '/settings',
    panel: Settings,      // <-- было 'settings'
    view: 'default',
  },
]);
