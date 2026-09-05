import { FC, useState, useEffect } from 'react';
import {
  Panel,
  PanelHeader,
  Group,
  SimpleCell,
  Avatar,
  Button,
  Header,
} from '@vkontakte/vkui';
import { UserInfo } from '@vkontakte/vk-bridge';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';

export interface HomeProps {
  id: string;
  fetchedUser?: UserInfo;
}

export const Home: FC<HomeProps> = ({ id, fetchedUser }) => {
  const routeNavigator = useRouteNavigator();
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('ru-RU', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      );
    };
    update();
    const interval = setInterval(update, 1000 * 30);
    return () => clearInterval(interval);
  }, []);

  return (
    <Panel id={id}>
      <PanelHeader>Главная</PanelHeader>

      <Group header={<Header size="s">Время</Header>}>
        <div style={{ textAlign: 'center', fontSize: '48px', fontWeight: 'bold', padding: '16px' }}>
          {time}
        </div>
      </Group>

      {fetchedUser && (
        <Group header={<Header size="s">Профиль ВК</Header>}>
          <SimpleCell
            before={fetchedUser.photo_200 ? <Avatar src={fetchedUser.photo_200} /> : null}
            subtitle={(fetchedUser as any).city?.title || ''}
          >
            {fetchedUser.first_name} {fetchedUser.last_name}
          </SimpleCell>
        </Group>
      )}

      <Group header={<Header size="s">Навигация</Header>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px' }}>
          <Button
            mode="primary"
            stretched
            size="l"
            onClick={() => routeNavigator.push('profile')}
          >
            Профиль
          </Button>
          <Button
            mode="secondary"
            stretched
            size="l"
            onClick={() => routeNavigator.push('shifts')}
          >
            Смены
          </Button>
        </div>
      </Group>
    </Panel>
  );
};
