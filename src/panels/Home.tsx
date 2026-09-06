import { useEffect, useState } from 'react';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import {
  PanelHeader, Group, Header, Button, Card,
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

export const Home = () => {
  const navigator = useRouteNavigator();

  const [cars, setCars] = useState<Car[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const c = await loadFromStorage<Car[]>('shifttrack_cars', []);
      const s = await loadFromStorage<Shift[]>('shifttrack_shifts', []);
      const p = await loadFromStorage<Payment[]>('shifttrack_payments', []);
      setCars(c);
      setShifts(s);
      setPayments(p);
      setLoading(false);
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <>
        <PanelHeader>ShiftTrack</PanelHeader>
        <Group>
          <div style={{ padding: '24px', textAlign: 'center', color: '#8A8A99' }}>Загрузка данных...</div>
        </Group>
      </>
    );
  }

  // --- Статистика за текущий месяц ---
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthShifts = shifts.filter((s) => s.date.startsWith(currentMonth));
  const monthPayments = payments.filter((p) => p.date.startsWith(currentMonth));
  const monthStats = calculateStats(monthShifts);

  const monthEarned = monthStats.totalEarnings;
  const monthReceived = monthPayments.reduce((sum, p) => sum + p.amount, 0);
  const monthRemaining = monthEarned - monthReceived;

  // --- Общая статистика ---
  const totalStats = calculateStats(shifts);

  // --- Статусы авто ---
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
    default: '#1B5E20',
    warning: '#FFA000',
    error: '#D32F2F',
  };
  const statusTexts: Record<StatusType, string> = {
    default: 'В норме',
    warning: 'Скоро ТО',
    error: 'Просрочено',
  };
  const statusBg: Record<StatusType, string> = {
    default: '#E8F5E9',
    warning: '#FFF8E1',
    error: '#FFEBEE',
  };

  const monthName = now.toLocaleDateString('ru-RU', { month: 'long' });

  return (
    <>
      <PanelHeader>ShiftTrack</PanelHeader>

      {/* --- ВЕРХ: Автомобили --- */}
      <Group header={<Header size="s">Автомобили</Header>}>
        {cars.length === 0 ? (
          <div style={{ padding: '12px', color: '#8A8A99' }}>Добавьте автомобиль в разделе «Машины»</div>
        ) : (
          cars.map((car) => {
            const status = carStatuses.find((s) => s.id === car.id);
            if (!status) return null;

            return (
              <Card key={car.id} mode="shadow" style={{ padding: '12px', marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{car.brand} {car.plate}</div>
                    {status.osagoDays !== null && (
                      <div
                        style={{
                          fontSize: '13px',
                          color: status.osagoDays <= 7 ? '#D32F2F' : '#8A8A99',
                        }}
                      >
                        ОСАГО: {status.osagoDays > 0 ? `${status.osagoDays} дн.` : 'Истёк'}
                      </div>
                    )}
                    <div style={{ fontSize: '13px', color: '#8A8A99', marginTop: '2px' }}>
                      Пробег: {status.currentMileage !== undefined ? `${status.currentMileage} км` : 'нет смен'}
                      {status.remaining !== null && status.remaining > 0 && (
                        <> · до ТО: {status.remaining} км</>
                      )}
                    </div>
                  </div>
                  <div
                    style={{
                      color: statusColors[status.overallStatus],
                      fontWeight: 600,
                      fontSize: '14px',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      backgroundColor: statusBg[status.overallStatus],
                    }}
                  >
                    {statusTexts[status.overallStatus]}
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </Group>

      {/* --- СЕРЕДИНА: Общая статистика (в две строки) --- */}
      <Group header={<Header size="s">Общая статистика</Header>}>
        <Card mode="outline" style={{ padding: '16px' }}>
          {/* Первая строка */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '12px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#1A73E8' }}>{totalStats.count}</div>
              <div style={{ color: '#8A8A99', fontSize: '12px' }}>смен</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#1B5E20' }}>{totalStats.totalDistance.toLocaleString('ru-RU')}</div>
              <div style={{ color: '#8A8A99', fontSize: '12px' }}>км</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#7B61FF' }}>{totalStats.totalHours.toLocaleString('ru-RU')}</div>
              <div style={{ color: '#8A8A99', fontSize: '12px' }}>часов</div>
            </div>
          </div>

          {/* Вторая строка */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#D32F2F' }}>{totalStats.totalEarnings.toLocaleString('ru-RU')}</div>
              <div style={{ color: '#8A8A99', fontSize: '12px' }}>₽ заработок</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#262629' }}>{totalStats.avgDistance.toLocaleString('ru-RU')}</div>
              <div style={{ color: '#8A8A99', fontSize: '12px' }}>км/смена</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#262629' }}>
                {totalStats.totalDurationMinutes > 0
                  ? formatDuration(totalStats.avgDurationMinutes)
                  : '0 ч 0 мин'}
              </div>
              <div style={{ color: '#8A8A99', fontSize: '12px' }}>ср. за смену</div>
            </div>
          </div>
        </Card>
      </Group>

      {/* --- НИЗ: Баланс за месяц --- */}
      <Group header={<Header size="s">Баланс за {monthName}</Header>}>
        <Card mode="outline" style={{ padding: '16px' }}>
          <div style={{ fontSize: '28px', fontWeight: 700, color: monthRemaining >= 0 ? '#2688EB' : '#E64646' }}>
            {monthRemaining.toLocaleString('ru-RU')} ₽
          </div>
          <div style={{ fontSize: '13px', color: '#8A8A99', marginTop: '4px' }}>
            Заработано: {monthEarned.toLocaleString('ru-RU')} ₽ · Выплачено: {monthReceived.toLocaleString('ru-RU')} ₽
          </div>
        </Card>
      </Group>

      {/* Предупреждения */}
      {(osagoWarnings.length > 0 || toWarnings.length > 0 || toErrors.length > 0) && (
        <Group header={<Header size="s">Предупреждения</Header>}>
          {osagoWarnings.length > 0 && (
            <div style={{ padding: '12px', background: '#FFF3CD', borderRadius: '8px', color: '#856404' }}>
              ⚠️ ОСАГО скоро истекает (≤ 30 дней):{' '}
              {osagoWarnings.map((a, i) => (
                <span key={i}>
                  {a.brand} {a.plate} ({a.osagoDays} дн.){' '}
                  {i < osagoWarnings.length - 1 ? ', ' : ''}
                </span>
              ))}
            </div>
          )}

          {toWarnings.length > 0 && (
            <div style={{ padding: '12px', marginTop: '8px', background: '#FFECB3', borderRadius: '8px', color: '#795548' }}>
              ⚠️ Скоро ТО (осталось ≤ порога напоминания):{' '}
              {toWarnings.map((a, i) => (
                <span key={i}>
                  {a.brand} {a.plate}
                  {a.remaining !== null ? ` (${a.remaining} км)` : ''}{' '}
                  {i < toWarnings.length - 1 ? ', ' : ''}
                </span>
              ))}
            </div>
          )}

          {toErrors.length > 0 && (
            <div style={{ padding: '12px', marginTop: '8px', background: '#FFEBEE', borderRadius: '8px', color: '#C62828' }}>
              ❌ Просрочено ТО:{' '}
              {toErrors.map((a, i) => (
                <span key={i}>
                  {a.brand} {a.plate}
                  {a.remaining !== null ? ` (на ${Math.abs(a.remaining)} км)` : ''}{' '}
                  {i < toErrors.length - 1 ? ', ' : ''}
                </span>
              ))}
            </div>
          )}
        </Group>
      )}

      {/* Быстрые действия */}
      <Group>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <Button size="m" mode="secondary" onClick={() => navigator.push('/profile')}>
            Машины
          </Button>
          <Button size="m" mode="secondary" onClick={() => navigator.push('/shifts')}>
            Смены
          </Button>
        </div>
      </Group>
    </>
  );
};
