import bridge from '@vkontakte/vk-bridge';
import { loadFromStorage, saveToStorage } from './storage';
import { detectGroupRole } from './vkApi';
import type { User } from '../types';

const IS_DEV = typeof window !== 'undefined' && window.location.hostname === 'localhost';

export async function getCurrentUser(): Promise<User | null> {
  try {
    if (IS_DEV) {
      const stored = await loadFromStorage<User | null>('shifttrack_user', null);
      if (stored) return stored;

      return {
        vkId: 123456789,
        firstName: 'Иван',
        lastName: 'Водитель',
        photo: 'https://sun9-xx.userapi.com/impg/xxxx/yyyy.jpg?size=100x100',
        fio: 'Иван Водитель',
        role: 'employee',
        groupId: undefined,
        groupName: undefined,
      };
    }

    const userInfo = await bridge.send('VKWebAppGetUserInfo') as {
      id: number;
      first_name: string;
      last_name: string;
      photo_100?: string;
    };

    const stored = await loadFromStorage<User | null>('shifttrack_user', null);
    const groupInfo = await detectGroupRole(userInfo.id);

    if (stored && stored.vkId === userInfo.id) {
      return {
        ...stored,
        firstName: userInfo.first_name,
        lastName: userInfo.last_name,
        photo: userInfo.photo_100,
        groupId: groupInfo.groupId > 0 ? String(groupInfo.groupId) : undefined,
        groupName: groupInfo.groupName || undefined,
        role: groupInfo.role,
      };
    }

    return {
      vkId: userInfo.id,
      firstName: userInfo.first_name,
      lastName: userInfo.last_name,
      photo: userInfo.photo_100,
      fio: `${userInfo.first_name} ${userInfo.last_name}`,
      role: groupInfo.role,
      groupId: groupInfo.groupId > 0 ? String(groupInfo.groupId) : undefined,
      groupName: groupInfo.groupName || undefined,
    };
  } catch {
    const stored = await loadFromStorage<User | null>('shifttrack_user', null);
    return stored;
  }
}

export async function saveCurrentUser(user: User): Promise<void> {
  await saveToStorage('shifttrack_user', user);
}
