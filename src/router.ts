import { createHashRouter } from '@vkontakte/vk-mini-apps-router';

// Именованные импорты — потому что у тебя везде export const X
import { Home } from './panels/Home';
import { Shifts } from './panels/Shifts';
import { Profile } from './panels/Profile';
import { Settings } from './panels/Settings';

export const router = createHashRouter([
  {
    path: '/',
    panel: Home,
    view: 'default',
  },
  {
    path: '/shifts',
    panel: Shifts,
    view: 'default',
  },
  {
    path: '/profile',
    panel: Profile,
    view: 'default',
  },
  {
    path: '/settings',
    panel: Settings,
    view: 'default',
  },
]);
