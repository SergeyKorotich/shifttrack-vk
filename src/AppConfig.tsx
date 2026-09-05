import { RouterProvider } from '@vkontakte/vk-mini-apps-router';
import { AdaptivityProvider, AppRoot } from '@vkontakte/vkui';
import { router } from './routes';
import { App } from './App';

export const AppConfig = () => {
  return (
    <AdaptivityProvider>
      <AppRoot>
        <RouterProvider router={router}>
          <App />
        </RouterProvider>
      </AppRoot>
    </AdaptivityProvider>
  );
};
