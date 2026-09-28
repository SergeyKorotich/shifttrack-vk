import { useEffect, useState } from 'react';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import {
  PanelHeader, Group, Header, Button, Card, Div,
} from '@vkontakte/vkui';
import { loadFromStorage } from '../utils/storage';
import { calculateCarStatus, getCurrentMileage, calculateStats, formatDuration } from '../utils/shiftUtils';
import type { Car, Shift, Payment, StatusType } from '../types';

function daysUntilExpiry(dateStr: string): number | null {
  if (!dateStr) return null;
  const expiry = new Date(dateStr);
  const now = new Date();
  expiry.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

const monthNames = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

export const Home = () => {
  const navigator = useRouteNavigator();

  const [cars, setCars] = useState<Car[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  const [selYear, setSelYear] = useState(new Date().getFullYear());
  const [selMonth, setSelMonth] = useState(new Date().getMonth());

  useEffect(() => {
    const loadData = async () => {
      try {
        const c = await loadFromStorage<Car[]>('shifttrack_cars', []);
        const s = await loadFromStorage<Shift[]>('shifttrack_shifts', []);
        const p = await loadFromStorage<Payment[]>('shifttrack_payments', []);
        setCars(c);
        setShifts(s);
        setPayments(p);
      } catch (e) {
        console.error('Ошибка загрузки данных в Home.tsx', e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const goPrevMonth = () => {
    if (selMonth === 0) {
      setSelYear((y) => y - 1);
      setSelMonth(11);
    } else {
      setSelMonth((m) => m - 1);
    }
  };

  const goNextMonth = () => {
    if (selMonth === 11) {
      setSelYear((y) => y + 1);
      setSelMonth(0);
    } else {
      setSelMonth((m) => m + 1);
    }
  };

  if (loading) {
    return (
      <>
        <PanelHeader>ShiftTrack</PanelHeader>
        <Group>
          <Div style={{ textAlign: 'center', color: 'var(--vkui--text_secondary)' }}>
            Загрузка данных...
          </Div>
        </Group>
      </>
    );
  }

  const monthStr = `${selYear}-${String(selMonth + 1).padStart(2, '0')}`;
  const monthShifts = shifts.filter((s) => s.date.startsWith(monthStr));
  const monthPayments = payments.filter((p) => p.period === monthStr);
  const monthStats = calculateStats(monthShifts);

  const monthEarned = monthStats.totalEarnings;
  const monthReceived = monthPayments.reduce((sum, p) => sum + p.amount, 0);
  const monthRemaining = monthEarned - monthReceived;

  const carStatuses = cars.map((car) => {
    const currentMileage = getCurrentMileage(car.id, shifts);
    const status = calculateCarStatus(car, currentMileage);
    const osagoDays = daysUntilExpiry(car.osagoExpiry);
    const nextToMileage = car.lastInspectionMileage + car.inspectionInterval;
    const remaining = currentMileage !== undefined ? nextToMileage - currentMileage : null;

    return {
      id: car.id,
      brand: car.brand,
      plate: car.plate,
      osagoDays,
      inspectionStatus: status.inspection,
      overallStatus: status.overall,
      currentMileage,
      nextToMileage,
      remaining,
    };
  });

  const osagoWarnings = carStatuses.filter(
    (c) => c.osagoDays !== null && c.osagoDays <= 30 && c.osagoDays >= 0,
  );
  const toWarnings = carStatuses.filter((c) => c.inspectionStatus === 'warning');
  const toErrors = carStatuses.filter((c) => c.inspectionStatus === 'error');

  const statusColors: Record<StatusType, string> = {
    default: 'var(--vkui--color_accent_positive)',
    warning: 'var(--vkui--color_accent_attention)',
    error: 'var(--vkui--color_accent_negative)',
  };
  const statusTexts: Record<StatusType, string> = {
    default: 'В норме',
    warning: 'Скоро ТО',
    error: 'Просрочено',
  };
  const statusBg: Record<StatusType, string> = {
    default: 'var(--vkui--color_background_positive_subdued)',
    warning: 'var(--vkui--color_background_attention_subdued)',
    error: 'var(--vkui--color_background_negative_subdued)',
  };

  const monthName = `${monthNames[selMonth]} ${selYear}`;

  return (
    <>
      <PanelHeader>ShiftTrack</PanelHeader>

      <Group>
        <Div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          <Button size="s" mode="secondary" onClick={() => navigator.push('/profile')}>Машины</Button>
          <Button size="s" mode="secondary" onClick={() => navigator.push('/shifts')}>Смены</Button>
          <Button size="s" mode="secondary" onClick={() => navigator.push('/settings')}>Настройки</Button>
        </Div>
      </Group>

      <Group header={<Header size="s">Автомобили</Header>}>
        {cars.length === 0 ? (
          <Div style={{ color: 'var(--vkui--text_secondary)' }}>
            Добавьте автомобиль в разделе «Машины»
          </Div>
        ) : (
          cars.map((car) => {
            const status = carStatuses.find((s) => s.id === car.id);
            if (!status) return null;

            return (
              <Card key={car.id} mode="shadow" style={{ padding: '12px', marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--vkui--text_primary)' }}>
                      {car.brand} {car.plate}
                    </div>
                    {status.osagoDays !== null && (
                      <div style={{
                        fontSize: '13px',
                        color: status.osagoDays <= 7
                          ? 'var(--vkui--color_accent_negative)'
                          : 'var(--vkui--text_secondary)',
                      }}>
                        ОСАГО: {status.osagoDays > 0 ? `${status.osagoDays} дн.` : 'Истёк'}
                      </div>
                    )}
                    <div style={{ fontSize: '13px', color: 'var(--vkui--text_secondary)', marginTop: '2px' }}>
                      Пробег: {status.currentMileage !== undefined ? `${status.currentMileage} км` : 'нет смен'}
                      {status.remaining !== null && status.remaining > 0 && (
                        <> · до ТО: {status.remaining} км</>
                      )}
                    </div>
                  </div>
                  <div style={{
                    color: statusColors[status.overallStatus],
                    fontWeight: 600,
                    fontSize: '14px',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    backgroundColor: statusBg[status.overallStatus],
                  }}>
                    {statusTexts[status.overallStatus]}
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </Group>

      <Group header={<Header size="s">Статистика</Header>}>
        <Card mode="outline">
          <Div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <Button size="s" mode="secondary" onClick={goPrevMonth}>←</Button>
              <div style={{ flex: 1, textAlign: 'center', fontWeight: 600, fontSize: '16px', color: 'var(--vkui--text_primary)' }}>
                {monthName}
              </div>
              <Button size="s" mode="secondary" onClick={goNextMonth}>→</Button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '12px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--vkui--text_primary)' }}>{monthStats.count}</div>
                <div style={{ color: 'var(--vkui--text_secondary)', fontSize: '12px' }}>смен</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--vkui--color_accent_positive)' }}>{monthStats.totalDistance.toLocaleString('ru-RU')}</div>
                <div style={{ color: 'var(--vkui--text_secondary)', fontSize: '12px' }}>км</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--vkui--text_primary)' }}>{monthStats.totalHours.toLocaleString('ru-RU')}</div>
                <div style={{ color: 'var(--vkui--text_secondary)', fontSize: '12px' }}>часов</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--vkui--color_accent_negative)' }}>{monthStats.totalEarnings.toLocaleString('ru-RU')}</div>
                <div style={{ color: 'var(--vkui--text_secondary)', fontSize: '12px' }}>₽ заработок</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--vkui--text_primary)' }}>{monthStats.avgDistance.toLocaleString('ru-RU')}</div>
                <div style={{ color: 'var(--vkui--text_secondary)', fontSize: '12px' }}>км/смена</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--vkui--text_primary)' }}>
                  {monthStats.totalDurationMinutes > 0
                    ? formatDuration(monthStats.avgDurationMinutes)
                    : '0 ч 0 мин'}
                </div>
                <div style={{ color: 'var(--vkui--text_secondary)', fontSize: '12px' }}>ср. за смену</div>
              </div>
            </div>
          </Div>
        </Card>
      </Group>

      <Group header={<Header size="s">Баланс за {monthName}</Header>}>
        <Card mode="outline">
          <Div>
            <div style={{
              fontSize: '28px',
              fontWeight: 700,
              color: monthRemaining >= 0
                ? 'var(--vkui--color_accent_primary)'
                : 'var(--vkui--color_accent_negative)',
            }}>
              {monthRemaining.toLocaleString('ru-RU')} ₽
            </div>
            <div style={{ fontSize: '13px', color: 'var(--vkui--text_secondary)', marginTop: '4px' }}>
              Заработано: {monthEarned.toLocaleString('ru-RU')} ₽ · Выплачено: {monthReceived.toLocaleString('ru-RU')} ₽
            </div>
          </Div>
        </Card>
      </Group>

      {(osagoWarnings.length > 0 || toWarnings.length > 0 || toErrors.length > 0) && (
        <Group header={<Header size="s">Предупреждения</Header>}>
          {osagoWarnings.length > 0 && (
            <Div style={{
              borderRadius: '8px',
              backgroundColor: 'var(--vkui--color_background_attention_subdued)',
              color: 'var(--vkui--color_accent_attention)',
            }}>
              ⚠️ ОСАГО скоро истекает (≤ 30 дней):{' '}
              {osagoWarnings.map((a, i) => (
                <span key={i}>
                  {a.brand} {a.plate} ({a.osagoDays} дн.){' '}
                  {i < osagoWarnings.length - 1 ? ', ' : ''}
                </span>
              ))}
            </Div>
          )}

          {toWarnings.length > 0 && (
            <Div style={{
              marginTop: '8px',
              borderRadius: '8px',
              backgroundColor: 'var(--vkui--color_background_attention_subdued)',
              color: 'var(--vkui--color_accent_attention)',
            }}>
              ⚠️ Скоро ТО (осталось ≤ порога напоминания):{' '}
              {toWarnings.map((a, i) => (
                <span key={i}>
                  {a.brand} {a.plate}
                  {a.remaining !== null ? ` (${a.remaining} км)` : ''}{' '}
                  {i < toWarnings.length - 1 ? ', ' : ''}
                </span>
              ))}
            </Div>
          )}

          {toErrors.length > 0 && (
            <Div style={{
              marginTop: '8px',
              borderRadius: '8px',
              backgroundColor: 'var(--vkui--color_background_negative_subdued)',
              color: 'var(--vkui--color_accent_negative)',
            }}>
              ❌ Просрочено ТО:{' '}
              {toErrors.map((a, i) => (
                <span key={i}>
                  {a.brand} {a.plate}
                  {a.remaining !== null ? ` (на ${Math.abs(a.remaining)} км)` : ''}{' '}
                  {i < toErrors.length - 1 ? ', ' : ''}
                </span>
              ))}
            </Div>
          )}
        </Group>
      )}
    </>
  );
};
