import { createBrowserRouter } from '@vkontakte/vk-mini-apps-router';

export const router = createBrowserRouter(
  [
    { path: '/', panel: 'shifts_panel', view: 'default_view' },
    { path: '/shifts', panel: 'shifts_panel', view: 'default_view' },
    { path: '/profile', panel: 'profile_panel', view: 'default_view' },
  ],
  { basename: '/shifttrack-vk' },
);