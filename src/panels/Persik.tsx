import { FC } from 'react';
import {
  Panel,
  PanelHeader,
  Group,
  Header,
  Cell,
} from '@vkontakte/vkui';

export interface PersikProps {
  id: string;
}

export const Persik: FC<PersikProps> = ({ id }) => {
  return (
    <Panel id={id}>
      <PanelHeader>Персик</PanelHeader>
      <Group header={<Header size="s">Здесь будет Персик</Header>}>
        <Cell>Пока тут тестовая заглушка — чтобы приложение грузилось.</Cell>
      </Group>
    </Panel>
  );
};
