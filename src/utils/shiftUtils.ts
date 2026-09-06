import type {
  Car, Shift, Payment, ShiftStats, Balance,
  CarStatus, StatusType, TariffType,
} from '../types';

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
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function calculateShift(
  odometerStart: number,
  odometerEnd: number,
  tariff: number,
  tariffType: TariffType,
  timeStart?: string,
  timeEnd?: string,
): { distance: number; earnings: number; durationMinutes: number } {
  const distance = Math.max(0, odometerEnd - odometerStart);
  let earnings = 0;
  let durationMinutes = 0;

  if (tariffType === 'km') {
    earnings = distance * tariff;
  } else {
    if (timeStart && timeEnd) {
      const [sh, sm] = timeStart.split(':').map(Number);
      const [eh, em] = timeEnd.split(':').map(Number);
      const startMin = sh * 60 + sm;
      let endMin = eh * 60 + em;
      if (endMin < startMin) endMin += 24 * 60;
      durationMinutes = endMin - startMin;
      earnings = (durationMinutes / 60) * tariff;
    }
  }

  return { distance, earnings, durationMinutes };
}

export function calculateStats(shifts: Shift[]): ShiftStats {
  if (shifts.length === 0) {
    return {
      count: 0, totalDistance: 0, avgDistance: 0,
      totalDurationMinutes: 0, avgDurationMinutes: 0,
      totalHours: 0, totalEarnings: 0, avgEarnings: 0,
    };
  }

  const totalDistance = shifts.reduce((s, sh) => s + sh.distance, 0);
  const totalEarnings = shifts.reduce((s, sh) => s + sh.earnings, 0);
  const totalDurationMinutes = shifts.reduce((s, sh) => {
    if (!sh.timeStart || !sh.timeEnd) return s;
    const calc = calculateShift(
      sh.odometerStart, sh.odometerEnd, sh.tariff,
      sh.tariffType, sh.timeStart, sh.timeEnd,
    );
    return s + calc.durationMinutes;
  }, 0);

  return {
    count: shifts.length,
    totalDistance,
    avgDistance: Math.round(totalDistance / shifts.length),
    totalDurationMinutes,
    avgDurationMinutes: Math.round(totalDurationMinutes / shifts.length),
    totalHours: Math.round((totalDurationMinutes / 60) * 10) / 10,
    totalEarnings,
    avgEarnings: Math.round(totalEarnings / shifts.length),
  };
}

export function calculateBalance(shifts: Shift[], payments: Payment[]): Balance {
  const totalEarned = shifts.reduce((s, sh) => s + sh.earnings, 0);
  const totalReceived = payments.reduce((s, p) => s + p.amount, 0);
  return {
    totalEarned,
    totalReceived,
    remaining: totalEarned - totalReceived,
  };
}

// НОВАЯ ФУНКЦИЯ: актуальный пробег авто = максимальный odometerEnd среди всех смен этого авто
export function getCurrentMileage(carId: string, shifts: Shift[]): number | undefined {
  const carShifts = shifts.filter((s) => s.carId === carId);
  if (carShifts.length === 0) return undefined;
  // Берём максимальный odometerEnd — это актуальный пробег
  return Math.max(...carShifts.map((s) => s.odometerEnd));
}

export function calculateCarStatus(car: Car, currentMileage?: number): CarStatus {
  const now = new Date();
  let osago: StatusType = 'default';
  let inspection: StatusType = 'default';

  // --- ОСАГО ---
  if (car.osagoExpiry) {
    const expiry = parseDate(car.osagoExpiry);
    const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) osago = 'error';
    else if (daysLeft <= 30) osago = 'warning';
  }

  // --- ТО ---
  // Логика: текущий пробег (odometerEnd последней смены) сравниваем с nextToMileage
  if (car.lastInspectionMileage > 0 && car.inspectionInterval > 0 && currentMileage !== undefined) {
    const nextToMileage = car.lastInspectionMileage + car.inspectionInterval;
    const reminderThreshold = car.reminderKm > 0 ? car.reminderKm : 2000;

    if (currentMileage >= nextToMileage) {
      inspection = 'error';
    } else if (currentMileage >= nextToMileage - reminderThreshold) {
      inspection = 'warning';
    }
  }

  const overall: StatusType =
    osago === 'error' || inspection === 'error' ? 'error'
    : osago === 'warning' || inspection === 'warning' ? 'warning'
    : 'default';

  return { osago, inspection, overall };
}

export function generateCsvReport(shifts: Shift[], cars: Car[]): string {
  const header = 'Дата;Марка;Госномер;Маршрут;Пробег начало;Пробег конец;Расстояние;Тариф;Тип;Заработок\n';
  const rows = shifts.map((s) => {
    const car = cars.find((c) => c.id === s.carId);
    return [
      s.date, car?.brand ?? '', car?.plate ?? '',
      s.route, s.odometerStart, s.odometerEnd,
      s.distance, s.tariff,
      s.tariffType === 'km' ? 'км' : 'час',
      s.earnings,
    ].join(';');
  }).join('\n');
  return header + rows;
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h} ч ${m} мин`;
}

export function formatHours(minutes: number): string {
  return (Math.round((minutes / 60) * 10) / 10).toString();
}
