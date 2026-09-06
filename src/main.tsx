import { createRoot } from 'react-dom/client';
import { RouterProvider } from '@vkontakte/vk-mini-apps-router';
import { ConfigProvider, AdaptivityProvider } from '@vkontakte/vkui';
import '@vkontakte/vkui/dist/vkui.css';

import bridge from '@vkontakte/vk-bridge';
import { router } from './router';
import { App } from './App';

const container = document.getElementById('root');

function renderApp() {
  if (!container) {
    console.error('#root не найден в index.html');
    return;
  }
  createRoot(container).render(
    <ConfigProvider>
      <AdaptivityProvider>
        <RouterProvider router={router}>
          <App />
        </RouterProvider>
      </AdaptivityProvider>
    </ConfigProvider>,
  );
}

// Сначала рендерим сразу, чтобы не было пустой страницы
renderApp();

// Потом пытаемся отправить VKWebAppInit — но это уже не блокирует интерфейс
bridge
  .send('VKWebAppInit')
  .then(() => {
    // Можно добавить логирование, если нужно
  })
  .catch((err) => {
    // В локальной разработке это нормально — VK не отвечает
    console.warn('VKWebAppInit не сработал (локальная среда):', err);
  });
