import '@vkontakte/vkui/dist/vkui.css';
import { createRoot } from 'react-dom/client';
import vkBridge from '@vkontakte/vk-bridge';
import { AppConfig } from './AppConfig.tsx';

vkBridge.send('VKWebAppInit');

const root = createRoot(document.getElementById('root')!);
root.render(
  <AppConfig />
);

if (import.meta.env.MODE === 'development') {
  import('./eruda.ts').catch(() => {});
}
