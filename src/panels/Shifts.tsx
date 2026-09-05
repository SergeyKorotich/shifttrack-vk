import { useState, useEffect, useCallback } from 'react';
import {
  Panel,
  PanelHeader,
  Group,
  Header,
  Button,
  NativeSelect,
  Input,
  FormItem,
  SimpleCell,
  Calendar,
  Caption,
} from '@vkontakte/vkui';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import type { Shift, Payment, Car, PaymentType, TariffType } from '../types';
import { loadFromStorage, saveToStorage } from '../utils/storage';
import {
  formatDate,
  calculateShift,
  calculateStats,
  calculateBalance,
  formatDuration,
  formatHours,
  generateId,
} from '../utils/shiftUtils';

const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  salary: 'Зарплата',
  advance: 'Аванс',
  bonus: 'Премия',
};

export const Shifts = () => {
  const routeNavigator = useRouteNavigator();

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [cars, setCars] = useState<Car[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const [carId, setCarId] = useState('');
  const [route, setRoute] = useState('');
  const [odometerStart, setOdometerStart] = useState('');
  const [odometerEnd, setOdometerEnd] = useState('');
  const [timeStart, setTimeStart] = useState('');
  const [timeEnd, setTimeEnd] = useState('');
  const [tariff, setTariff] = useState('');
  const [tariffType, setTariffType] = useState<TariffType>('km');

  const [paymentType, setPaymentType] = useState<PaymentType>('salary');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [periodFrom, setPeriodFrom] = useState('');
  const [periodTo, setPeriodTo] = useState('');

  const loadData = useCallback(async () => {
    const loadedShifts = await loadFromStorage<Shift[]>('shifts_list', []);
    const loadedPayments = await loadFromStorage<Payment[]>('payments_list', []);
    const loadedCars = await loadFromStorage<Car[]>('cars_list', []);
    setShifts(loadedShifts);
    setPayments(loadedPayments);
    setCars(loadedCars);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const dateStr = formatDate(selectedDate);
  const existingShift = shifts.find((s) => s.date === dateStr);
  const dayPayments = payments.filter((p) => p.date === dateStr);

  useEffect(() => {
    const shift = shifts.find((s) => s.date === dateStr);
    if (shift) {
      setCarId(shift.carId);
      setRoute(shift.route);
      setOdometerStart(String(shift.odometerStart));
      setOdometerEnd(String(shift.odometerEnd));
      setTimeStart(shift.timeStart);
      setTimeEnd(shift.timeEnd);
      setTariff(String(shift.tariff));
      setTariffType(shift.tariffType);
    } else {
      setCarId(cars[0]?.id || '');
      setRoute('');
      setOdometerStart('');
      setOdometerEnd('');
      setTimeStart('');
      setTimeEnd('');
      setTariff('');
      setTariffType('km');
    }

    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setPeriodFrom(formatDate(firstDay));
    setPeriodTo(formatDate(lastDay));
    setPaymentType('salary');
    setPaymentAmount('');
  }, [dateStr, shifts, cars]);

  const stats = calculateStats(shifts);
  const balance = calculateBalance(shifts, payments);

  const preview = calculateShift(
    Number(odometerStart) || 0,
    Number(odometerEnd) || 0,
    Number(tariff) || 0,
    tariffType,
    timeStart,
    timeEnd,
  );

  const handleSaveShift = async () => {
    const calc = calculateShift(
      Number(odometerStart) || 0,
      Number(odometerEnd) || 0,
      Number(tariff) || 0,
      tariffType,
      timeStart,
      timeEnd,
    );

    const shiftData: Shift = {
      id: existingShift?.id || generateId(),
      date: dateStr,
      carId,
      route,
      odometerStart: Number(odometerStart) || 0,
      odometerEnd: Number(odometerEnd) || 0,
      timeStart,
      timeEnd,
      tariff: Number(tariff) || 0,
      tariffType,
      distance: calc.distance,
      earnings: calc.earnings,
    };

    let updated: Shift[];
    if (existingShift) {
      updated = shifts.map((s) => (s.id === existingShift.id ? shiftData : s));
    } else {
      updated = [...shifts, shiftData];
    }
    setShifts(updated);
    await saveToStorage('shifts_list', updated);
  };

  const handleDeleteShift = async () => {
    if (!existingShift) return;
    const updated = shifts.filter((s) => s.id !== existingShift.id);
    setShifts(updated);
    await saveToStorage('shifts_list', updated);
  };

  const handleAddPayment = async () => {
    const payment: Payment = {
      id: generateId(),
      date: dateStr,
      type: paymentType,
      amount: Number(paymentAmount) || 0,
      periodFrom,
      periodTo,
    };
    const updated = [...payments, payment];
    setPayments(updated);
    await saveToStorage('payments_list', updated);
    setPaymentAmount('');
  };

  const handleDeletePayment = async (paymentId: string) => {
    const updated = payments.filter((p) => p.id !== paymentId);
    setPayments(updated);
    await saveToStorage('payments_list', updated);
  };

  const selectedDateLabel = selectedDate.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <Panel id="shifts_panel">
      <PanelHeader>Смены</PanelHeader>

      <Group>
        <Calendar
          value={selectedDate}
          onChange={(date: Date) => setSelectedDate(date)}
          size="m"
        />
      </Group>

      <Group header={<Header size="s">Смена за {selectedDateLabel}</Header>}>
        <FormItem top="Автомобиль">
          <NativeSelect value={carId} onChange={(e) => setCarId(e.target.value)}>
            <option value="">Выберите машину</option>
            {cars.map((car) => (
              <option key={car.id} value={car.id}>
                {car.brand} — {car.plate}
              </option>
            ))}
          </NativeSelect>
        </FormItem>

        <FormItem top="Маршрут">
          <Input
            type="text"
            value={route}
            onChange={(e) => setRoute(e.target.value)}
            placeholder="Откуда — куда"
          />
        </FormItem>

        <FormItem top="Тип тарифа">
          <NativeSelect
            value={tariffType}
            onChange={(e) => setTariffType(e.target.value as TariffType)}
          >
            <option value="km">За километр</option>
            <option value="hour">Почасовой</option>
          </NativeSelect>
        </FormItem>

        <FormItem top={`Тариф (${tariffType === 'km' ? '₽/км' : '₽/час'})`}>
          <Input
            type="number"
            value={tariff}
            onChange={(e) => setTariff(e.target.value)}
            placeholder="0"
          />
        </FormItem>

        <FormItem top="Пробег начало (км)">
          <Input
            type="number"
            value={odometerStart}
            onChange={(e) => setOdometerStart(e.target.value)}
            placeholder="0"
          />
        </FormItem>

        <FormItem top="Пробег конец (км)">
          <Input
            type="number"
            value={odometerEnd}
            onChange={(e) => setOdometerEnd(e.target.value)}
            placeholder="0"
          />
        </FormItem>

        <FormItem top="Время начала">
          <Input
            type="time"
            value={timeStart}
            onChange={(e) => setTimeStart(e.target.value)}
          />
        </FormItem>

        <FormItem top="Время окончания">
          <Input
            type="time"
            value={timeEnd}
            onChange={(e) => setTimeEnd(e.target.value)}
          />
        </FormItem>

        {(odometerStart && odometerEnd) || (timeStart && timeEnd) ? (
          <div style={{ padding: '0 16px 12px' }}>
            <Caption>Расстояние: {preview.distance} км</Caption>
            {preview.durationMinutes > 0 && (
              <Caption>
                Длительность: {formatDuration(preview.durationMinutes)}
              </Caption>
            )}
            <Caption>Заработок: {preview.earnings.toFixed(0)} ₽</Caption>
          </div>
        ) : null}

        <div style={{ display: 'flex', gap: '8px', padding: '0 16px 12px' }}>
          <Button
            mode="primary"
            size="l"
            onClick={handleSaveShift}
            disabled={!carId}
            style={{ flex: 1 }}
          >
            {existingShift ? 'Обновить смену' : 'Добавить смену'}
          </Button>
          {existingShift && (
            <Button
              mode="outline"
              appearance="negative"
              onClick={handleDeleteShift}
            >
              Удалить
            </Button>
          )}
        </div>
      </Group>

      <Group header={<Header size="s">Платежи за {selectedDateLabel}</Header>}>
        <FormItem top="Тип платежа">
          <NativeSelect
            value={paymentType}
            onChange={(e) => setPaymentType(e.target.value as PaymentType)}
          >
            <option value="salary">Зарплата</option>
            <option value="advance">Аванс</option>
            <option value="bonus">Премия</option>
          </NativeSelect>
        </FormItem>

        <FormItem top="Сумма (₽)">
          <Input
            type="number"
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(e.target.value)}
            placeholder="0"
          />
        </FormItem>

        <FormItem top="Период с">
          <Input
            type="date"
            value={periodFrom}
            onChange={(e) => setPeriodFrom(e.target.value)}
          />
        </FormItem>

        <FormItem top="Период по">
          <Input
            type="date"
            value={periodTo}
            onChange={(e) => setPeriodTo(e.target.value)}
          />
        </FormItem>

        <div style={{ padding: '0 16px 12px' }}>
          <Button
            mode="secondary"
            onClick={handleAddPayment}
            disabled={!paymentAmount}
          >
            Добавить платёж
          </Button>
        </div>

        {dayPayments.length > 0 && (
          <div style={{ padding: '0 16px 12px' }}>
            {dayPayments.map((payment) => (
              <SimpleCell
                key={payment.id}
                subtitle={`${PAYMENT_TYPE_LABELS[payment.type]} • ${payment.periodFrom} — ${payment.periodTo}`}
                after={
                  <Button
                    mode="tertiary"
                    size="s"
                    appearance="negative"
                    onClick={() => handleDeletePayment(payment.id)}
                  >
                    Удалить
                  </Button>
                }
              >
                {payment.amount} ₽
              </SimpleCell>
            ))}
          </div>
        )}
      </Group>

      <Group header={<Header size="s">Статистика по сменам</Header>}>
        <SimpleCell indicator={`${stats.count}`}>Всего смен</SimpleCell>
        <SimpleCell indicator={`${stats.avgDistance} км`}>Средний пробег</SimpleCell>
        <SimpleCell indicator={`${formatHours(stats.avgDurationMinutes)} ч`}>
          Средняя длительность
        </SimpleCell>
        <SimpleCell indicator={`${stats.avgEarnings} ₽`}>Средний заработок</SimpleCell>
      </Group>

      <Group header={<Header size="s">Баланс</Header>}>
        <SimpleCell indicator={`${balance.totalEarned} ₽`}>Заработано всего</SimpleCell>
        <SimpleCell indicator={`${balance.totalReceived} ₽`}>Получено всего</SimpleCell>
        <div
          style={{
            padding: '12px 16px',
            borderTop: '1px solid var(--vkui--color_separator_alpha)',
          }}
        >
          <Caption>Остаток к получению</Caption>
          <div
            style={{
              color: balance.remaining >= 0 ? '#2688EB' : '#E64646',
              fontWeight: 'bold',
              fontSize: '24px',
              marginTop: '4px',
            }}
          >
            {balance.remaining > 0 ? '+' : ''}
            {balance.remaining} ₽
          </div>
        </div>
      </Group>

      <Group>
        <div style={{ padding: '12px 16px' }}>
          <Button mode="tertiary" onClick={() => routeNavigator.push('/profile')}>
            Профиль
          </Button>
        </div>
      </Group>
    </Panel>
  );
};
