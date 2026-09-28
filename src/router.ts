import { createHashRouter } from '@vkontakte/vk-mini-apps-router';

export const router = createHashRouter([
  {
    path: '/',
    panel: 'home',
    view: 'default',
  },
  {
    path: '/shifts',
    panel: 'shifts',
    view: 'default',
  },
  {
    path: '/profile',
    panel: 'profile',
    view: 'default',
  },
  {
    path: '/settings',
    panel: 'settings',
    view: 'default',
  },
]);
