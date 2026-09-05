import type { Shift, Payment, Car, ShiftStats, Balance, CarStatus, TariffType } from '../types';

export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

export const calculateShift = (
  odometerStart: number,
  odometerEnd: number,
  tariff: number,
  tariffType: TariffType,
  timeStart?: string,
  timeEnd?: string,
) => {
  const distance = Math.max(0, odometerEnd - odometerStart);

  let earnings = 0;
  let durationMinutes = 0;

  if (tariffType === 'hour' && timeStart && timeEnd) {
    const start = timeStart.split(':').map(Number);
    const end = timeEnd.split(':').map(Number);
    const startMin = start[0] * 60 + start[1];
    const endMin = end[0] * 60 + end[1];
    durationMinutes = endMin - startMin;
    if (durationMinutes < 0) durationMinutes += 24 * 60;
    earnings = (durationMinutes / 60) * tariff;
  } else {
    earnings = distance * tariff;
  }

  return { distance, earnings, durationMinutes };
};

export const formatDuration = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} мин`;
  if (m === 0) return `${h} ч`;
  return `${h} ч ${m} мин`;
};

export const formatHours = (minutes: number) => {
  return (minutes / 60).toFixed(1);
};

export const calculateStats = (shifts: Shift[]): ShiftStats => {
  if (!shifts || shifts.length === 0) {
    return {
      totalDistance: 0,
      avgDistance: 0,
      totalDurationMinutes: 0,
      avgDurationMinutes: 0,
      totalHours: 0,
      totalEarnings: 0,
      avgEarnings: 0,
      count: 0,
    };
  }

  const totalDistance = shifts.reduce((sum, s) => sum + (s.distance || 0), 0);
  const totalEarnings = shifts.reduce((sum, s) => sum + (s.earnings || 0), 0);

  let totalDurationMinutes = 0;
  for (const s of shifts) {
    if (s.timeStart && s.timeEnd) {
      const start = s.timeStart.split(':').map(Number);
      const end = s.timeEnd.split(':').map(Number);
      const startMin = start[0] * 60 + start[1];
      const endMin = end[0] * 60 + end[1];
      let duration = endMin - startMin;
      if (duration < 0) duration += 24 * 60;
      totalDurationMinutes += duration;
    }
  }

  const count = shifts.length;

  return {
    totalDistance,
    avgDistance: count > 0 ? Math.round(totalDistance / count) : 0,
    totalDurationMinutes,
    totalHours: parseFloat((totalDurationMinutes / 60).toFixed(1)),
    avgDurationMinutes: count > 0 ? Math.round(totalDurationMinutes / count) : 0,
    totalEarnings,
    avgEarnings: count > 0 ? Math.round(totalEarnings / count) : 0,
    count,
  };
};

export const calculateBalance = (shifts: Shift[], payments: Payment[]): Balance => {
  const totalEarned = shifts.reduce((sum, s) => sum + (s.earnings || 0), 0);
  const totalReceived = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  return {
    totalEarned,
    totalReceived,
    remaining: totalEarned - totalReceived,
  };
};

export const calculateCarStatus = (
  car: Car,
  currentMileage?: number,
): CarStatus => {
  const now = new Date();
  const osagoDate = car.osagoExpiry ? parseDate(car.osagoExpiry) : null;
  const inspDate = car.inspectionDate ? parseDate(car.inspectionDate) : null;

  let osagoStatus: 'default' | 'warning' | 'error' = 'default';
  if (osagoDate) {
    const daysLeft = Math.ceil((osagoDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) osagoStatus = 'error';
    else if (daysLeft <= 30) osagoStatus = 'warning';
  }

  let inspStatus: 'default' | 'warning' | 'error' = 'default';
  if (inspDate) {
    const daysLeft = Math.ceil((inspDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) inspStatus = 'error';
    else if (daysLeft <= 30) inspStatus = 'warning';
  }
  if (currentMileage !== undefined && car.inspectionMileage) {
    const kmLeft = car.inspectionMileage - currentMileage;
    if (kmLeft < 0) inspStatus = 'error';
    else if (kmLeft <= 2000 && inspStatus !== 'error') inspStatus = 'warning';
  }

  let overall: 'default' | 'warning' | 'error' = 'default';
  if (osagoStatus === 'error' || inspStatus === 'error') overall = 'error';
  else if (osagoStatus === 'warning' || inspStatus === 'warning') overall = 'warning';

  return { osago: osagoStatus, inspection: inspStatus, overall };
};

export const generateCsvReport = (shifts: Shift[], cars: Car[]): string => {
  const header = [
    'Дата',
    'Машина',
    'Маршрут',
    'Время начала',
    'Время конца',
    'Пробег старт',
    'Пробег конец',
    'Расстояние',
    'Тип тарифа',
    'Тариф',
    'Заработок',
  ].join(';');

  const rows = shifts.map((shift) => {
    const car = cars.find((c) => c.id === shift.carId);
    const carName = car ? `${car.brand} (${car.plate})` : 'Неизвестная машина';
    const tariffTypeLabel = shift.tariffType === 'hour' ? 'Почасовой' : 'За км';
    return [
      shift.date,
      carName,
      shift.route || '',
      shift.timeStart || '',
      shift.timeEnd || '',
      shift.odometerStart,
      shift.odometerEnd,
      shift.distance,
      tariffTypeLabel,
      shift.tariff,
      shift.earnings,
    ].join(';');
  });

  return [header, ...rows].join('\n');
};
