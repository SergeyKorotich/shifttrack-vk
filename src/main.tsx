import { createRoot } from 'react-dom/client';
import { RouterProvider } from '@vkontakte/vk-mini-apps-router';
import { ConfigProvider, AdaptivityProvider, AppRoot } from '@vkontakte/vkui';
import '@vkontakte/vkui/dist/vkui.css';

import vkBridge, { parseURLSearchParamsForGetLaunchParams } from '@vkontakte/vk-bridge';
import { useAppearance, useInsets, useAdaptivity } from '@vkontakte/vk-bridge-react';

import { router } from './router';
import { App } from './App';
import { transformVKBridgeAdaptivity } from './helpers/transformVKBridgeAdaptivity';

// Инициализация VK Mini App — первой строкой, синхронно
vkBridge.send('VKWebAppInit');

const Root = () => {
  const colorScheme = useAppearance() || undefined;
  const insets = useInsets() || undefined;
  const adaptivityProps = transformVKBridgeAdaptivity(useAdaptivity());
  const { vk_platform } = parseURLSearchParamsForGetLaunchParams(window.location.search);

  return (
    <ConfigProvider
      colorScheme={colorScheme}
      platform={vk_platform === 'desktop_web' ? 'vkcom' : undefined}
      isWebView={vkBridge.isWebView()}
      hasCustomPanelHeaderAfter={true}
    >
      <AdaptivityProvider {...adaptivityProps}>
        <AppRoot mode="full" safeAreaInsets={insets}>
          <RouterProvider router={router}>
            <App />
          </RouterProvider>
        </AppRoot>
      </AdaptivityProvider>
    </ConfigProvider>
  );
};

const container = document.getElementById('root');

if (!container) {
  console.error('#root не найден в index.html');
} else {
  createRoot(container).render(<Root />);
}
