import { useState, useEffect, Fragment } from 'react';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import {
  PanelHeader, Group, Header, Button, FormItem, Input, Card,
  Select, Text,
} from '@vkontakte/vkui';
import type { User, AppSettings, TariffEntry, Theme, ReportFormat, ReportDestination } from '../types';
import { loadFromStorage, saveToStorage } from '../utils/storage';
import { generateId, formatDate } from '../utils/shiftUtils';
import { getCurrentUser } from '../utils/user';

const SETTINGS_KEY = 'shifttrack_settings';

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light',
  tariffs: [],
  report: {
    format: 'csv',
    destination: 'device',
    fileName: '',
    header: '',
  },
};

interface SettingsProps {
  onThemeChange?: (scheme: 'light' | 'dark') => void;
}

export const Settings = ({ onThemeChange }: SettingsProps) => {
  const navigator = useRouteNavigator();
  const [user, setUser] = useState<User | null>(null);
  const [fio, setFio] = useState('');
  const [loading, setLoading] = useState(true);

  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  const [newTariffDate, setNewTariffDate] = useState(formatDate(new Date()));
  const [newKmRate, setNewKmRate] = useState('');
  const [newHourRate, setNewHourRate] = useState('');

  const [reportFileName, setReportFileName] = useState('');
  const [reportHeader, setReportHeader] = useState('');

  useEffect(() => {
    const load = async () => {
      const u = await getCurrentUser();
      setUser(u);
      setFio(u?.fio || '');

      const s = await loadFromStorage<AppSettings>(SETTINGS_KEY, DEFAULT_SETTINGS);
      setSettings(s);
      setReportFileName(s.report.fileName);
      setReportHeader(s.report.header);

      setLoading(false);
      if (u) await saveToStorage('shifttrack_user', u);
    };
    load();
  }, []);

  const handleThemeChange = async (theme: Theme) => {
    const updated = { ...settings, theme };
    setSettings(updated);
    await saveToStorage(SETTINGS_KEY, updated);
    if (onThemeChange) onThemeChange(theme);
  };

  const handleAddTariff = async () => {
    if (!newTariffDate || (!newKmRate && !newHourRate)) return;

    const entry: TariffEntry = {
      id: generateId(),
      effectiveFrom: newTariffDate,
      kmRate: Number(newKmRate) || 0,
      hourRate: Number(newHourRate) || 0,
    };

    const updated = {
      ...settings,
      tariffs: [...settings.tariffs, entry].sort(
        (a, b) => new Date(a.effectiveFrom).getTime() - new Date(b.effectiveFrom).getTime(),
      ),
    };
    setSettings(updated);
    await saveToStorage(SETTINGS_KEY, updated);

    setNewKmRate('');
    setNewHourRate('');
  };

  const handleDeleteTariff = async (id: string) => {
    const updated = {
      ...settings,
      tariffs: settings.tariffs.filter((t) => t.id !== id),
    };
    setSettings(updated);
    await saveToStorage(SETTINGS_KEY, updated);
  };

  const handleReportSetting = async (
    field: 'format' | 'destination' | 'fileName' | 'header',
    value: string,
  ) => {
    const updated = {
      ...settings,
      report: { ...settings.report, [field]: value },
    };
    setSettings(updated);
    await saveToStorage(SETTINGS_KEY, updated);
  };

  const handleSaveFio = async () => {
    if (!user) return;
    const updated = { ...user, fio };
    setUser(updated);
    await saveToStorage('shifttrack_user', updated);
  };

  if (loading || !user) {
    return (
      <Fragment>
        <PanelHeader>Настройки</PanelHeader>
        <Group>
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--vkui--color_text_secondary)' }}>
            Загрузка профиля...
          </div>
        </Group>
      </Fragment>
    );
  }

  return (
    <Fragment>
      <PanelHeader>Настройки</PanelHeader>

      <Group>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          <Button size="s" mode="secondary" onClick={() => navigator.push('/')}>Домой</Button>
          <Button size="s" mode="secondary" onClick={() => navigator.push('/profile')}>Машины</Button>
          <Button size="s" mode="secondary" onClick={() => navigator.push('/shifts')}>Смены</Button>
        </div>
      </Group>

      <Group header={<Header size="s">Профиль</Header>}>
        <Card mode="outline" Component="div" style={{ padding: '16px', margin: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {user.photo && (
              <img
                src={user.photo}
                alt=""
                style={{ width: '48px', height: '48px', borderRadius: '50%' }}
              />
            )}
            <div>
              <div style={{ fontWeight: 600, color: 'var(--vkui--color_text_primary)' }}>
                {user.firstName} {user.lastName}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--vkui--color_text_secondary)' }}>
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
          <Button size="m" mode="primary" onClick={handleSaveFio}>Сохранить ФИО</Button>
        </FormItem>
      </Group>

      <Group header={<Header size="s">Оформление</Header>}>
        <FormItem top="Тема">
          <Select
            options={[
              { label: 'Светлая', value: 'light' },
              { label: 'Тёмная', value: 'dark' },
            ]}
            value={settings.theme}
            onChange={(e) => handleThemeChange(e.target.value as Theme)}
          />
        </FormItem>
      </Group>

      <Group header={<Header size="s">Тарифы</Header>}>
        {settings.tariffs.length > 0 && (
          <div style={{ padding: '0 12px' }}>
            {settings.tariffs.map((t) => (
              <Card
                key={t.id}
                mode="outline"
                Component="div"
                style={{ padding: '12px', marginBottom: '8px' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <Text weight="2" style={{ color: 'var(--vkui--color_text_primary)' }}>
                      с {t.effectiveFrom}
                    </Text>
                    <Text weight="3" style={{ color: 'var(--vkui--color_text_secondary)', marginTop: '4px' }}>
                      {t.kmRate > 0 && `${t.kmRate} ₽/км`}
                      {t.kmRate > 0 && t.hourRate > 0 && ' · '}
                      {t.hourRate > 0 && `${t.hourRate} ₽/ч`}
                    </Text>
                  </div>
                  <Button
                    mode="tertiary"
                    size="s"
                    onClick={() => handleDeleteTariff(t.id)}
                  >
                    Удалить
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        <FormItem top="Дата начала действия">
          <Input
            type="date"
            value={newTariffDate}
            onChange={(e) => setNewTariffDate(e.target.value)}
          />
        </FormItem>
        <FormItem top="Ставка за км (₽)">
          <Input
            type="number"
            value={newKmRate}
            onChange={(e) => setNewKmRate(e.target.value)}
            placeholder="например, 15"
          />
        </FormItem>
        <FormItem top="Ставка за час (₽)">
          <Input
            type="number"
            value={newHourRate}
            onChange={(e) => setNewHourRate(e.target.value)}
            placeholder="например, 500"
          />
        </FormItem>
        <FormItem>
          <Button size="m" mode="primary" onClick={handleAddTariff}>
            Добавить тариф
          </Button>
        </FormItem>
      </Group>

      <Group header={<Header size="s">Отчёты</Header>}>
        <FormItem top="Формат отчёта">
          <Select
            options={[
              { label: 'Таблица (CSV)', value: 'csv' },
              { label: 'PDF', value: 'pdf' },
            ]}
            value={settings.report.format}
            onChange={(e) => handleReportSetting('format', e.target.value as ReportFormat)}
          />
        </FormItem>

        <FormItem top="Куда отправить">
          <Select
            options={[
              { label: 'Сохранить на устройстве', value: 'device' },
              { label: 'Яндекс Диск', value: 'yandexDisk' },
              { label: 'Google Drive', value: 'googleDrive' },
              { label: 'Отправить на email', value: 'email' },
            ]}
            value={settings.report.destination}
            onChange={(e) => handleReportSetting('destination', e.target.value as ReportDestination)}
          />
        </FormItem>

        <FormItem top="Название файла (по умолчанию: месяц и год)">
          <Input
            type="text"
            value={reportFileName}
            onChange={(e) => {
              setReportFileName(e.target.value);
              handleReportSetting('fileName', e.target.value);
            }}
            placeholder="2026-09"
          />
        </FormItem>

        <FormItem top="Заголовок отчёта (по умолчанию: ФИО, марка, номер, месяц)">
          <Input
            type="text"
            value={reportHeader}
            onChange={(e) => {
              setReportHeader(e.target.value);
              handleReportSetting('header', e.target.value);
            }}
            placeholder="Иванов И.И., Toyota Camry А123ВС, Сентябрь 2026"
          />
        </FormItem>
      </Group>
    </Fragment>
  );
};
