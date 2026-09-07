import { useState, useEffect, Fragment } from 'react';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import {
  PanelHeader, Group, Button, FormItem, Input, Select, Header,
} from '@vkontakte/vkui';
import { loadFromStorage, saveToStorage } from '../utils/storage';
import { calculateShift, generateId, formatDate, formatDuration } from '../utils/shiftUtils';
import type { Shift, Car, Payment, TariffType, PaymentType } from '../types';

function getDaysInMonth(year: number, month: number) {
  const lastDay = new Date(year, month + 1, 0);
  const days: { date: Date; day: number }[] = [];
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const date = new Date(year, month, d);
    days.push({ date, day: d });
  }
  return days;
}

function getFirstDayOffset(year: number, month: number) {
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  return firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
}

function groupShiftsByDate(shifts: Shift[]) {
  return shifts.reduce((acc, s) => {
    acc[s.date] = acc[s.date] || [];
    acc[s.date].push(s);
    return acc;
  }, {} as Record<string, Shift[]>);
}

function getDaySummary(dayShifts: Shift[]) {
  let totalDistance = 0;
  let totalEarnings = 0;
  let totalDurationMinutes = 0;

  for (const s of dayShifts) {
    totalDistance += s.distance;
    totalEarnings += s.earnings;
    if (s.timeStart && s.timeEnd) {
      const calc = calculateShift(s.odometerStart, s.odometerEnd, s.tariff, s.tariffType, s.timeStart, s.timeEnd);
      totalDurationMinutes += calc.durationMinutes;
    }
  }

  return { totalDistance, totalEarnings, totalDurationMinutes };
}

const paymentTypeLabels: Record<PaymentType, string> = {
  salary: 'Зарплата',
  advance: 'Аванс',
  bonus: 'Премия',
};

const monthNames = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

function formatPeriod(period: string): string {
  if (!period) return '—';
  const [y, m] = period.split('-').map(Number);
  if (!y || !m) return period;
  return `${monthNames[m - 1]} ${y}`;
}

function todayStr(): string {
  const d = new Date();
  return formatDate(d);
}

export const Shifts = () => {
  const navigator = useRouteNavigator();

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [cars, setCars] = useState<Car[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());

  // Форма смены
  const [carId, setCarId] = useState('');
  const [route, setRoute] = useState('');
  const [odometerStart, setOdometerStart] = useState('');
  const [odometerEnd, setOdometerEnd] = useState('');
  const [tariffType, setTariffType] = useState<TariffType>('km');
  const [tariff, setTariff] = useState('');
  const [timeStart, setTimeStart] = useState('');
  const [timeEnd, setTimeEnd] = useState('');

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);

  // Форма выплаты
  const [paymentType, setPaymentType] = useState<PaymentType>('advance');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMonth, setPaymentMonth] = useState('');
  const [paymentDate, setPaymentDate] = useState(todayStr());
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const s = await loadFromStorage<Shift[]>('shifttrack_shifts', []);
      const c = await loadFromStorage<Car[]>('shifttrack_cars', []);
      const p = await loadFromStorage<Payment[]>('shifttrack_payments', []);
      setShifts(s);
      setCars(c);
      setPayments(p);

      if (s.length > 0) {
        const sorted = [...s].sort((a, b) => b.date.localeCompare(a.date));
        const lastShift = sorted[0];
        setTariffType(lastShift.tariffType);
        setTariff(lastShift.tariff.toString());
      }
    };
    loadData();
  }, []);

  // Синхронизация месяца выплат с месяцем календаря
  useEffect(() => {
    const m = String(month + 1).padStart(2, '0');
    setPaymentMonth(`${year}-${m}`);
  }, [year, month]);

  // Предзаполнение формы смены при выборе даты
  useEffect(() => {
    if (!selectedDate) {
      setEditingShiftId(null);
      return;
    }

    const key = formatDate(selectedDate);
    const dayShifts = shifts.filter((s) => s.date === key);
    const sortedAll = [...shifts].sort((a, b) => b.date.localeCompare(a.date));
    const lastShiftOverall = sortedAll[0] || null;

    if (dayShifts.length > 0) {
      const lastShift = dayShifts[dayShifts.length - 1];
      setCarId(lastShift.carId);
      setRoute(lastShift.route === '—' ? '' : lastShift.route);
      setOdometerStart(lastShift.odometerStart.toString());
      setOdometerEnd(lastShift.odometerEnd.toString());
      setTariffType(lastShift.tariffType);
      setTariff(lastShift.tariff.toString());
      setTimeStart(lastShift.timeStart || '');
      setTimeEnd(lastShift.timeEnd || '');
      setEditingShiftId(lastShift.id);
    } else {
      setEditingShiftId(null);
      setRoute('');
      setOdometerEnd('');
      setTimeStart('');
      setTimeEnd('');

      if (lastShiftOverall) {
        setCarId(lastShiftOverall.carId);
        setTariffType(lastShiftOverall.tariffType);
        setTariff(lastShiftOverall.tariff.toString());
        setOdometerStart(lastShiftOverall.odometerEnd.toString());
      } else {
        setOdometerStart('');
      }
    }
  }, [selectedDate, shifts]);

  const preview = calculateShift(
    Number(odometerStart) || 0,
    Number(odometerEnd) || 0,
    Number(tariff) || 0,
    tariffType,
    timeStart || undefined,
    timeEnd || undefined,
  );

  const handleSave = async () => {
    if (!editingShiftId) return;
    if (!carId) {
      alert('Выберите автомобиль');
      return;
    }

    const updated = shifts.map((s) => {
      if (s.id === editingShiftId) {
        return {
          ...s,
          carId,
          route: route || '—',
          odometerStart: Number(odometerStart) || 0,
          odometerEnd: Number(odometerEnd) || 0,
          timeStart: timeStart || undefined,
          timeEnd: timeEnd || undefined,
          tariff: Number(tariff) || 0,
          tariffType,
          distance: preview.distance,
          earnings: preview.earnings,
        };
      }
      return s;
    });

    setShifts(updated);
    await saveToStorage('shifttrack_shifts', updated);
    setSelectedDate(null);
  };

  const handleAdd = async () => {
    if (!carId) {
      alert('Выберите автомобиль');
      return;
    }
    if (!selectedDate) return;

    const newShift: Shift = {
      id: generateId(),
      date: formatDate(selectedDate),
      carId,
      route: route || '—',
      odometerStart: Number(odometerStart) || 0,
      odometerEnd: Number(odometerEnd) || 0,
      timeStart: timeStart || undefined,
      timeEnd: timeEnd || undefined,
      tariff: Number(tariff) || 0,
      tariffType,
      distance: preview.distance,
      earnings: preview.earnings,
    };

    const updated = [...shifts, newShift];
    setShifts(updated);
    await saveToStorage('shifttrack_shifts', updated);

    const nextDay = new Date(selectedDate);
    nextDay.setDate(nextDay.getDate() + 1);

    if (nextDay.getMonth() !== month) {
      setMonth(nextDay.getMonth());
    }
    if (nextDay.getFullYear() !== year) {
      setYear(nextDay.getFullYear());
    }

    setSelectedDate(nextDay);
  };

  const handleDelete = async () => {
    if (!editingShiftId) return;
    if (!confirm('Удалить эту смену?')) return;

    const updated = shifts.filter((s) => s.id !== editingShiftId);
    setShifts(updated);
    await saveToStorage('shifttrack_shifts', updated);

    if (selectedDate) {
      const key = formatDate(selectedDate);
      const remaining = updated.filter((s) => s.date === key);
      if (remaining.length === 0) {
        setSelectedDate(null);
      }
    } else {
      setSelectedDate(null);
    }
  };

  // --- Выплаты ---

  const resetPaymentForm = () => {
    setPaymentType('advance');
    setPaymentAmount('');
    setPaymentDate(todayStr());
    setEditingPaymentId(null);
  };

  const handleAddPayment = async () => {
    if (!paymentAmount || Number(paymentAmount) <= 0) {
      alert('Укажите сумму выплаты');
      return;
    }
    if (!paymentMonth) {
      alert('Выберите месяц');
      return;
    }
    if (!paymentDate) {
      alert('Выберите дату выплаты');
      return;
    }

    if (editingPaymentId) {
      const updated = payments.map((p) => {
        if (p.id === editingPaymentId) {
          return {
            ...p,
            type: paymentType,
            amount: Number(paymentAmount),
            period: paymentMonth,
            date: paymentDate,
          };
        }
        return p;
      });
      setPayments(updated);
      await saveToStorage('shifttrack_payments', updated);
    } else {
      const newPayment: Payment = {
        id: generateId(),
        date: paymentDate,
        type: paymentType,
        amount: Number(paymentAmount),
        period: paymentMonth,
      };
      const updated = [...payments, newPayment];
      setPayments(updated);
      await saveToStorage('shifttrack_payments', updated);
    }

    resetPaymentForm();
  };

  const handleEditPayment = (p: Payment) => {
    setPaymentType(p.type);
    setPaymentAmount(p.amount.toString());
    setPaymentDate(p.date);
    setPaymentMonth(p.period);
    setEditingPaymentId(p.id);
  };

  const handleDeletePayment = async (id: string) => {
    if (!confirm('Удалить эту выплату?')) return;
    const updated = payments.filter((p) => p.id !== id);
    setPayments(updated);
    await saveToStorage('shifttrack_payments', updated);
    if (editingPaymentId === id) {
      resetPaymentForm();
    }
  };

  // ---

  const grouped = groupShiftsByDate(shifts);
  const days = getDaysInMonth(year, month);
  const firstDayOffset = getFirstDayOffset(year, month);

  const goPrevMonth = () => {
    if (month === 0) {
      setYear((y) => y - 1);
      setMonth(11);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const goNextMonth = () => {
    if (month === 11) {
      setYear((y) => y + 1);
      setMonth(0);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const paymentsForMonth = payments.filter((p) => p.period === paymentMonth);
  const totalPaymentsForMonth = paymentsForMonth.reduce((s, p) => s + p.amount, 0);

  return (
    <Fragment>
      <PanelHeader>Смены</PanelHeader>

      {/* Общая навигация под заголовком */}
      <Group>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          <Button size="s" mode="secondary" onClick={() => navigator.push('/')}>Домой</Button>
          <Button size="s" mode="secondary" onClick={() => navigator.push('/profile')}>Машины</Button>
          <Button size="s" mode="secondary" onClick={() => navigator.push('/shifts')}>Смены</Button>
        </div>
      </Group>

      {selectedDate === null ? (
        <Fragment>
          {/* Календарь смен */}
          <Group header={<Header size="s">Календарь смен</Header>}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Button size="s" mode="secondary" onClick={goPrevMonth}>←</Button>
              <div style={{ flex: 1, textAlign: 'center', fontWeight: 600, fontSize: '16px' }}>
                {new Date(year, month).toLocaleString('ru-RU', { month: 'long', year: 'numeric' })}
              </div>
              <Button size="s" mode="secondary" onClick={goNextMonth}>→</Button>
            </div>

            <div style={{ margin: '12px 0', borderBottom: '1px solid #E1E3E6' }} />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', padding: '4px 0' }}>
              {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((d) => (
                <div key={d} style={{ textAlign: 'center', color: '#8A8A99', fontSize: '13px' }}>{d}</div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', marginTop: '8px' }}>
              {Array.from({ length: firstDayOffset }).map((_, i) => (
                <div key={`empty-${i}`} style={{ height: '84px' }} />
              ))}

              {days.map(({ date, day }) => {
                const key = formatDate(date);
                const dayShifts = grouped[key] || [];
                const summary = getDaySummary(dayShifts);
                const isToday = date.toDateString() === new Date().toDateString();
                const hasShifts = dayShifts.length > 0;

                return (
                  <div
                    key={key}
                    onClick={() => setSelectedDate(date)}
                    style={{
                      height: '84px',
                      padding: '6px 4px',
                      borderRadius: '8px',
                      backgroundColor: hasShifts ? '#E8F0FE' : '#F7F8FA',
                      cursor: 'pointer',
                      textAlign: 'center',
                      border: isToday ? '1px solid #1A73E8' : '1px solid transparent',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      gap: '1px',
                      boxSizing: 'border-box',
                    }}
                  >
                    <div style={{ fontSize: '14px', fontWeight: 700, color: isToday ? '#1A73E8' : '#262629' }}>
                      {day}
                    </div>
                    <div style={{ fontSize: '11px', color: '#5F6368' }}>
                      {hasShifts ? `${summary.totalDistance} км` : ''}
                    </div>
                    <div style={{ fontSize: '11px', color: '#5F6368' }}>
                      {hasShifts && summary.totalDurationMinutes > 0
                        ? formatDuration(summary.totalDurationMinutes)
                        : ''}
                    </div>
                    <div style={{ fontSize: '11px', color: '#1B5E20', fontWeight: 600 }}>
                      {hasShifts ? `${summary.totalEarnings.toLocaleString()} ₽` : ''}
                    </div>
                  </div>
                );
              })}
            </div>
          </Group>

          {/* Форма выплаты */}
          <Group header={<Header size="s">Добавить выплату</Header>}>
            <FormItem top="Дата выплаты">
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </FormItem>

            <FormItem top="Тип выплаты">
              <Select
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value as PaymentType)}
                options={[
                  { label: 'Аванс', value: 'advance' },
                  { label: 'Зарплата', value: 'salary' },
                  { label: 'Премия', value: 'bonus' },
                ]}
              />
            </FormItem>

            <FormItem top="Сумма, ₽">
              <Input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="5000"
              />
            </FormItem>

            <FormItem top="За месяц">
              <Input
                type="month"
                value={paymentMonth}
                onChange={(e) => setPaymentMonth(e.target.value)}
              />
            </FormItem>

            <FormItem>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button size="m" onClick={handleAddPayment}>
                  {editingPaymentId ? 'Сохранить' : 'Добавить выплату'}
                </Button>
                {editingPaymentId && (
                  <Button size="m" mode="secondary" onClick={resetPaymentForm}>
                    Отмена
                  </Button>
                )}
              </div>
            </FormItem>
          </Group>

          {/* Список выплат и итог — внизу под кнопкой */}
          <Group header={<Header size="s">Выплаты за {formatPeriod(paymentMonth)}</Header>}>
            {paymentsForMonth.length > 0 && (
              <div>
                {paymentsForMonth.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 0',
                      borderBottom: '1px solid #E1E3E6',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '14px' }}>
                        {paymentTypeLabels[p.type]}: {p.amount.toLocaleString('ru-RU')} ₽
                      </div>
                      <div style={{ fontSize: '12px', color: '#8A8A99' }}>
                        За: {formatPeriod(p.period)} · выплата: {p.date}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <Button
                        size="s"
                        mode="secondary"
                        onClick={() => handleEditPayment(p)}
                      >
                        Изменить
                      </Button>
                      <Button
                        size="s"
                        mode="secondary"
                        style={{ color: '#D32F2F' }}
                        onClick={() => handleDeletePayment(p.id)}
                      >
                        Удалить
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: '12px', padding: '12px', textAlign: 'center', borderTop: '2px solid #7B61FF' }}>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#7B61FF' }}>
                {totalPaymentsForMonth.toLocaleString('ru-RU')} ₽
              </div>
              <div style={{ color: '#8A8A99', fontSize: '13px' }}>
                Всего выплат за {formatPeriod(paymentMonth)}
              </div>
            </div>
          </Group>
        </Fragment>
      ) : (
        <Fragment>
          {/* Форма дня (только смены) */}
          <Group>
            <Button size="m" mode="secondary" onClick={() => setSelectedDate(null)}>← Назад к календарю</Button>
          </Group>

          <Group header={<Header size="s">{selectedDate.toLocaleDateString('ru-RU')}</Header>}>
            <FormItem top="Автомобиль">
              <Select
                value={carId}
                onChange={(e) => setCarId(e.target.value)}
                placeholder="— выберите —"
                options={cars.map((c) => ({ label: `${c.brand} ${c.plate}`, value: c.id }))}
              />
            </FormItem>

            <FormItem top="Маршрут">
              <Input type="text" value={route} onChange={(e) => setRoute(e.target.value)} placeholder="Откуда — куда" />
            </FormItem>

            <FormItem top="Одометр: начало">
              <Input
                type="number"
                value={odometerStart}
                onChange={(e) => setOdometerStart(e.target.value)}
                placeholder="Подтягивается из конца последней смены"
              />
            </FormItem>

            <FormItem top="Одометр: конец">
              <Input
                type="number"
                value={odometerEnd}
                onChange={(e) => setOdometerEnd(e.target.value)}
              />
            </FormItem>

            <FormItem top="Тип тарифа">
              <Select
                value={tariffType}
                onChange={(e) => setTariffType(e.target.value as TariffType)}
                options={[
                  { label: 'За километр', value: 'km' },
                  { label: 'За час', value: 'hour' },
                ]}
              />
            </FormItem>

            <FormItem top={`Тариф (${tariffType === 'km' ? '₽/км' : '₽/час'})`}>
              <Input
                type="number"
                value={tariff}
                onChange={(e) => setTariff(e.target.value)}
              />
            </FormItem>

            {tariffType === 'hour' && (
              <Fragment>
                <FormItem top="Время начала">
                  <Input type="time" value={timeStart} onChange={(e) => setTimeStart(e.target.value)} />
                </FormItem>
                <FormItem top="Время конца">
                  <Input type="time" value={timeEnd} onChange={(e) => setTimeEnd(e.target.value)} />
                </FormItem>
              </Fragment>
            )}

            <FormItem>
              <div style={{ display: 'flex', gap: '8px', fontSize: '14px' }}>
                <span>Пробег: <b>{preview.distance} км</b></span>
                <span>Заработок: <b>{preview.earnings.toLocaleString('ru-RU')} ₽</b></span>
              </div>
            </FormItem>

            <FormItem>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {editingShiftId && (
                  <Fragment>
                    <Button
                      size="m"
                      mode="secondary"
                      style={{ color: '#D32F2F' }}
                      onClick={handleDelete}
                    >
                      Удалить
                    </Button>
                    <Button size="m" onClick={handleSave}>
                      Сохранить
                    </Button>
                  </Fragment>
                )}
                <Button size="m" onClick={handleAdd}>
                  Добавить
                </Button>
                <Button size="m" mode="secondary" onClick={() => setSelectedDate(null)}>
                  Отмена
                </Button>
              </div>
            </FormItem>
          </Group>
        </Fragment>
      )}
    </Fragment>
  );
};
