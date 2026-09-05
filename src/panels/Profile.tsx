import { useState, useEffect, useCallback } from 'react';
import {
  Panel,
  PanelHeader,
  Group,
  Header,
  Button,
  Input,
  FormItem,
  SimpleCell,
  Caption,
  IconButton,
} from '@vkontakte/vkui';
import { Icon16Delete, Icon28ChevronBack } from '@vkontakte/icons';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import type { Car } from '../types';
import { loadFromStorage, saveToStorage } from '../utils/storage';
import { generateId, calculateCarStatus } from '../utils/shiftUtils';

const STATUS_LABELS: Record<string, string> = {
  default: 'Норма',
  warning: 'Внимание',
  error: 'Просрочено',
};

const STATUS_COLORS: Record<string, string> = {
  default: 'var(--vkui--color_text_positive)',
  warning: '#FF9800',
  error: '#E64646',
};

export const Profile = () => {
  const routeNavigator = useRouteNavigator();
  const [cars, setCars] = useState<Car[]>([]);
  const [editingCarId, setEditingCarId] = useState<string | null>(null);

  const [brand, setBrand] = useState('');
  const [plate, setPlate] = useState('');
  const [vin, setVin] = useState('');
  const [osagoExpiry, setOsagoExpiry] = useState('');
  const [inspectionDate, setInspectionDate] = useState('');
  const [inspectionMileage, setInspectionMileage] = useState('');

  const loadCars = useCallback(async () => {
    const loaded = await loadFromStorage<Car[]>('cars_list', []);
    setCars(loaded);
  }, []);

  useEffect(() => {
    loadCars();
  }, [loadCars]);

  const resetForm = () => {
    setEditingCarId(null);
    setBrand('');
    setPlate('');
    setVin('');
    setOsagoExpiry('');
    setInspectionDate('');
    setInspectionMileage('');
  };

  const startEdit = (car: Car) => {
    setEditingCarId(car.id);
    setBrand(car.brand);
    setPlate(car.plate);
    setVin(car.vin);
    setOsagoExpiry(car.osagoExpiry);
    setInspectionDate(car.inspectionDate);
    setInspectionMileage(String(car.inspectionMileage));
  };

  const handleSaveCar = async () => {
    const carData: Car = {
      id: editingCarId || generateId(),
      brand,
      plate,
      vin,
      osagoExpiry,
      inspectionDate,
      inspectionMileage: Number(inspectionMileage) || 0,
    };

    let updated: Car[];
    if (editingCarId) {
      updated = cars.map((c) => (c.id === editingCarId ? carData : c));
    } else {
      updated = [...cars, carData];
    }
    setCars(updated);
    await saveToStorage('cars_list', updated);
    resetForm();
  };

  const handleDeleteCar = async (carId: string) => {
    const updated = cars.filter((c) => c.id !== carId);
    setCars(updated);
    await saveToStorage('cars_list', updated);
    if (editingCarId === carId) resetForm();
  };

  return (
    <Panel id="profile_panel">
      <PanelHeader
        before={
          <IconButton onClick={() => routeNavigator.push('/')}>
            <Icon28ChevronBack />
          </IconButton>
        }
      >
        Профиль
      </PanelHeader>

      <Group header={<Header size="s">Автомобили</Header>}>
        {cars.length === 0 && (
          <div style={{ padding: '12px 16px' }}>
            <Caption>Нет добавленных машин</Caption>
          </div>
        )}
        {cars.map((car) => {
          const status = calculateCarStatus(car);
          return (
            <div key={car.id}>
              <SimpleCell
                onClick={() => startEdit(car)}
                subtitle={`${car.plate} • VIN: ${car.vin || '—'}`}
                after={
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <span
                      style={{
                        color: STATUS_COLORS[status.overall],
                        fontSize: '12px',
                        fontWeight: 'bold',
                      }}
                    >
                      {STATUS_LABELS[status.overall]}
                    </span>
                  </div>
                }
              >
                {car.brand}
              </SimpleCell>
              <div style={{ padding: '4px 16px 8px' }}>
                <Caption>
                  ОСАГО: {car.osagoExpiry || '—'}{' '}
                  <span style={{ color: STATUS_COLORS[status.osago] }}>
                    ({STATUS_LABELS[status.osago]})
                  </span>
                </Caption>
                <Caption>
                  ТО: {car.inspectionDate || '—'} • {car.inspectionMileage} км{' '}
                  <span style={{ color: STATUS_COLORS[status.inspection] }}>
                    ({STATUS_LABELS[status.inspection]})
                  </span>
                </Caption>
              </div>
              <div style={{ padding: '0 16px 8px' }}>
                <Button
                  mode="tertiary"
                  size="s"
                  appearance="negative"
                  before={<Icon16Delete />}
                  onClick={() => handleDeleteCar(car.id)}
                >
                  Удалить машину
                </Button>
              </div>
            </div>
          );
        })}
      </Group>

      <Group
        header={
          <Header size="s">
            {editingCarId ? 'Редактировать машину' : 'Добавить машину'}
          </Header>
        }
      >
        <FormItem top="Марка / модель">
          <Input
            type="text"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="Lada Vesta"
          />
        </FormItem>

        <FormItem top="Госномер">
          <Input
            type="text"
            value={plate}
            onChange={(e) => setPlate(e.target.value)}
            placeholder="А123ВС77"
          />
        </FormItem>

        <FormItem top="VIN">
          <Input
            type="text"
            value={vin}
            onChange={(e) => setVin(e.target.value)}
            placeholder="XTA12345678901234"
          />
        </FormItem>

        <FormItem top="ОСАГО действительна до">
          <Input
            type="date"
            value={osagoExpiry}
            onChange={(e) => setOsagoExpiry(e.target.value)}
          />
        </FormItem>

        <FormItem top="Дата следующего ТО">
          <Input
            type="date"
            value={inspectionDate}
            onChange={(e) => setInspectionDate(e.target.value)}
          />
        </FormItem>

        <FormItem top="Пробег следующего ТО (км)">
          <Input
            type="number"
            value={inspectionMileage}
            onChange={(e) => setInspectionMileage(e.target.value)}
            placeholder="150000"
          />
        </FormItem>

        <div style={{ display: 'flex', gap: '8px', padding: '0 16px 12px' }}>
          <Button
            mode="primary"
            onClick={handleSaveCar}
            disabled={!brand || !plate}
            style={{ flex: 1 }}
          >
            {editingCarId ? 'Сохранить' : 'Добавить'}
          </Button>
          {editingCarId && (
            <Button mode="outline" onClick={resetForm}>
              Отмена
            </Button>
          )}
        </div>
      </Group>

      <Group>
        <div style={{ padding: '12px 16px' }}>
          <Button mode="tertiary" onClick={() => routeNavigator.push('/')}>
            К сменам
          </Button>
        </div>
      </Group>
    </Panel>
  );
};
