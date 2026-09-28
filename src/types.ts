export type TariffType = 'km' | 'hour';
export type PaymentType = 'salary' | 'advance' | 'bonus';
export type StatusType = 'default' | 'warning' | 'error';
export type UserRole = 'admin' | 'employee' | 'none';
export type Theme = 'light' | 'dark';
export type ReportFormat = 'csv' | 'pdf';
export type ReportDestination = 'device' | 'yandexDisk' | 'googleDrive' | 'email';

export interface Car {
  id: string;
  driverName: string;
  brand: string;
  plate: string;
  vin: string;
  osagoExpiry: string;
  lastInspectionDate: string;
  lastInspectionMileage: number;
  inspectionInterval: number;
  reminderKm: number;
}

export interface Shift {
  id: string;
  date: string;
  carId: string;
  route: string;
  odometerStart: number;
  odometerEnd: number;
  timeStart?: string;
  timeEnd?: string;
  tariff: number;
  tariffType: TariffType;
  distance: number;
  earnings: number;
}

export interface Payment {
  id: string;
  date: string;
  type: PaymentType;
  amount: number;
  period: string; // "YYYY-MM"
}

export interface ShiftStats {
  count: number;
  totalDistance: number;
  avgDistance: number;
  totalDurationMinutes: number;
  avgDurationMinutes: number;
  totalHours: number;
  totalEarnings: number;
  avgEarnings: number;
}

export interface Balance {
  totalEarned: number;
  totalReceived: number;
  remaining: number;
}

export interface CarStatus {
  osago: StatusType;
  inspection: StatusType;
  overall: StatusType;
}

export interface User {
  vkId: number;
  firstName: string;
  lastName: string;
  photo?: string;
  fio: string;
  role: UserRole;
  groupId?: string;
  groupName?: string;
}

// ─── Тарифы с историей ───

export interface TariffEntry {
  id: string;
  effectiveFrom: string; // ISO-дата, с которой тариф начал действовать
  kmRate: number;
  hourRate: number;
}

// ─── Настройки отчётов ───

export interface ReportSettings {
  format: ReportFormat;
  destination: ReportDestination;
  fileName: string; // по умолчанию "2026-09" (месяц и год)
  header: string; // по умолчанию "Иванов И.И., Toyota Camry А123ВС, Сентябрь 2026"
}

// ─── Общие настройки приложения ───

export interface AppSettings {
  theme: Theme;
  tariffs: TariffEntry[];
  report: ReportSettings;
}
