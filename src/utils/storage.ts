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

/**
 * Сохраняет значение. Если переданная функция — применяет её к текущему значению
 * (паттерн апдейтера) перед сохранением. Это нужно для безопасного обновления массивов/объектов.
 */
export async function saveToStorage(
  key: string,
  valueOrUpdater: unknown | ((prev: unknown) => unknown),
): Promise<void> {
  const getCurrent = async () => {
    // Для апдейтеров сначала читаем текущее значение
    if (!isInVK) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : undefined;
      } catch {
        return undefined;
      }
    }

    try {
      const response = await withTimeout(
        bridge.send('VKWebAppStorageGet', { keys: [key] }),
        3000,
      );
      if (response?.keys?.length && response.keys[0]?.value) {
        try {
          return JSON.parse(response.keys[0].value);
        } catch {
          return undefined;
        }
      }
      return undefined;
    } catch {
      return undefined;
    }
  };

  let finalValue: unknown;

  if (typeof valueOrUpdater === 'function') {
    const prev = await getCurrent();
    finalValue = valueOrUpdater(prev);
  } else {
    finalValue = valueOrUpdater;
  }

  // Локальная разработка: localStorage
  if (!isInVK) {
    try {
      localStorage.setItem(key, JSON.stringify(finalValue));
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
        value: JSON.stringify(finalValue),
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
