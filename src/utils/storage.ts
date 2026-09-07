import bridge from '@vkontakte/vk-bridge';

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), ms),
    ),
  ]);
}

// Проверяем, запущено ли приложение внутри VK
const isInVK = bridge.isEmbedded();

export async function loadFromStorage<T>(key: string, defaultValue: T): Promise<T> {
  // Локальная разработка: используем localStorage
  if (!isInVK) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        return JSON.parse(raw) as T;
      }
    } catch {
      return defaultValue;
    }
    return defaultValue;
  }

  // В VK: используем VK Storage
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
  // Локальная разработка: localStorage
  if (!isInVK) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return;
    } catch (error) {
      console.error(`Не удалось сохранить ключ ${key} в localStorage:`, error);
      return;
    }
  }

  // В VK: VK Storage
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
  if (!isInVK) {
    localStorage.removeItem(key);
    return;
  }

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
