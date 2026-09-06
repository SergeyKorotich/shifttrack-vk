import bridge from '@vkontakte/vk-bridge';

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), ms),
    ),
  ]);
}

export async function loadFromStorage<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const response = await withTimeout(
      bridge.send('VKWebAppStorageGet', { keys: [key] }),
      3000,
    );
    if (response && response.keys && response.keys.length > 0) {
      const raw = response.keys[0].value;
      if (raw) {
        try {
          return JSON.parse(raw) as T;
        } catch {
          return defaultValue;
        }
      }
    }
    return defaultValue;
  } catch {
    return defaultValue;
  }
}

export async function saveToStorage(key: string, value: unknown): Promise<void> {
  try {
    await withTimeout(
      bridge.send('VKWebAppStorageSet', {
        key,
        value: JSON.stringify(value),
      }),
      3000,
    );
  } catch (error) {
    console.error(`Не удалось сохранить ключ ${key} в VK Storage:`, error);
  }
}

export async function deleteFromStorage(key: string): Promise<void> {
  try {
    await withTimeout(
      bridge.send('VKWebAppStorageSet', {
        key,
        value: '',
      }),
      3000,
    );
  } catch (error) {
    console.error(`Не удалось удалить ключ ${key} из VK Storage:`, error);
  }
}
