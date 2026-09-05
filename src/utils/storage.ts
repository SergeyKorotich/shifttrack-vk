import bridge from '@vkontakte/vk-bridge';

export async function loadFromStorage<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const result = await bridge.send('VKWebAppStorageGet', { keys: [key] });
    const raw = result.keys?.[0]?.value;
    if (raw) {
      return JSON.parse(raw) as T;
    }
    return defaultValue;
  } catch {
    const local = localStorage.getItem(key);
    return local ? (JSON.parse(local) as T) : defaultValue;
  }
}

export async function saveToStorage<T>(key: string, value: T): Promise<void> {
  const str = JSON.stringify(value);
  try {
    await bridge.send('VKWebAppStorageSet', { key, value: str });
  } catch {
    localStorage.setItem(key, str);
  }
}
