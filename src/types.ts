export type TariffType = 'km' | 'hour';
export type PaymentType = 'salary' | 'advance' | 'bonus';
export type StatusType = 'default' | 'warning' | 'error';

export interface Car {
  id: string;
  brand: string;
  plate: string;
  vin: string;
  osagoExpiry: string;
  inspectionDate: string;
  inspectionMileage: number;
}

export interface Shift {
  id: string;
  date: string;
  carId: string;
  route: string;
  odometerStart: number;
  odometerEnd: number;
  timeStart: string;
  timeEnd: string;
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
  periodFrom: string;
  periodTo: string;
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
