import { useState, useEffect, Fragment } from 'react';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import {
  PanelHeader, Group, Header, Button, FormItem, Input, Card,
} from '@vkontakte/vkui';
import bridge from '@vkontakte/vk-bridge';
import type { User } from '../types';
import { loadFromStorage, saveToStorage } from '../utils/storage';
// Убираем detectGroupRole из импорта — пока не делаем запросы к API

async function getBasicUserInfo(): Promise<User | null> {
  try {
    const userInfo = await Promise.race([
      bridge.send('VKWebAppGetUserInfo'),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000)),
    ]) as { id: number; first_name: string; last_name: string; photo_100?: string };

    const stored = await loadFromStorage<User | null>('shifttrack_user', null);

    if (stored && stored.vkId === userInfo.id) {
      return { ...stored, firstName: userInfo.first_name, lastName: userInfo.last_name, photo: userInfo.photo_100 };
    }

    return {
      vkId: userInfo.id,
      firstName: userInfo.first_name,
      lastName: userInfo.last_name,
      photo: userInfo.photo_100,
      fio: `${userInfo.first_name} ${userInfo.last_name}`,
      role: 'none', // Пока не запрашиваем роль через API
      groupId: undefined,
      groupName: undefined,
    };
  } catch {
    return await loadFromStorage<User | null>('shifttrack_user', null);
  }
}

async function saveCurrentUser(user: User): Promise<void> {
  await saveToStorage('shifttrack_user', user);
}

export const Settings = () => {
  const navigator = useRouteNavigator();
  const [user, setUser] = useState<User | null>(null);
  const [fio, setFio] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const u = await getBasicUserInfo();
      setUser(u);
      setFio(u?.fio || '');
      setLoading(false);
      if (u) await saveCurrentUser(u);
    };
    load();
  }, []);

  const handleSaveFio = async () => {
    if (!user) return;
    const updated = { ...user, fio };
    setUser(updated);
    await saveCurrentUser(updated);
    alert('ФИО сохранено');
  };

  if (loading || !user) {
    return (
      <Fragment>
        <PanelHeader>Настройки</PanelHeader>
        <Group>
          <div style={{ padding: '24px', textAlign: 'center', color: '#8A8A99' }}>
            Загрузка профиля...
          </div>
        </Group>
      </Fragment>
    );
  }

  return (
    <Fragment>
      <PanelHeader>Настройки</PanelHeader>

      <Group header={<Header size="s">Профиль</Header>}>
        <Card mode="outline" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {user.photo && (
              <img
                src={user.photo}
                alt=""
                style={{ width: '48px', height: '48px', borderRadius: '50%' }}
              />
            )}
            <div>
              <div style={{ fontWeight: 600 }}>
                {user.firstName} {user.lastName}
              </div>
              <div style={{ fontSize: '13px', color: '#8A8A99' }}>
                VK ID: {user.vkId}
              </div>
            </div>
          </div>
        </Card>

        <FormItem top="ФИО для отчётов">
          <Input
            type="text"
            value={fio}
            onChange={(e) => setFio(e.target.value)}
            placeholder="Иванов Иван Иванович"
          />
        </FormItem>
        <FormItem>
          <Button size="m" onClick={handleSaveFio}>Сохранить ФИО</Button>
        </FormItem>
      </Group>

      {/* Блок про группу убираем, чтобы не делать лишних запросов */}
      
      <Group>
        <div style={{ padding: '12px', display: 'flex', gap: '8px' }}>
          <Button size="m" mode="secondary" onClick={() => navigator.push('/')}>Домой</Button>
          <Button size="m" mode="secondary" onClick={() => navigator.push('/shifts')}>Смены</Button>
          <Button size="m" mode="secondary" onClick={() => navigator.push('/profile')}>Машины</Button>
        </div>
      </Group>
    </Fragment>
  );
};
