import { useState, useEffect, Fragment } from 'react';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { PanelHeader, Group, Button, FormItem, Input, Select, Header } from '@vkontakte/vkui';
import { loadFromStorage, saveToStorage } from '../utils/storage';
import { calculateCarStatus, getCurrentMileage, generateId } from '../utils/shiftUtils';
import type { Car, StatusType, Shift } from '../types';

export const Profile = () => {
  const navigator = useRouteNavigator();

  const [cars, setCars] = useState<Car[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [driverName, setDriverName] = useState('');
  const [brand, setBrand] = useState('');
  const [plate, setPlate] = useState('');
  const [vin, setVin] = useState('');
  const [osagoExpiry, setOsagoExpiry] = useState('');
  const [lastInspectionDate, setLastInspectionDate] = useState('');
  const [lastInspectionMileage, setLastInspectionMileage] = useState('');
  const [inspectionInterval, setInspectionInterval] = useState<'10000' | '15000'>('10000');
  const [reminderKm, setReminderKm] = useState('2000');

  useEffect(() => {
    const loadData = async () => {
      try {
        const c = await loadFromStorage<Car[]>('shifttrack_cars', []);
        const s = await loadFromStorage<Shift[]>('shifttrack_shifts', []);
        setCars(c);
        setShifts(s);
      } catch (e) {
        console.error('Ошибка загрузки данных в Profile.tsx', e);
      }
    };
    loadData();
  }, []);

  const resetForm = () => {
    setDriverName('');
    setBrand('');
    setPlate('');
    setVin('');
    setOsagoExpiry('');
    setLastInspectionDate('');
    setLastInspectionMileage('');
    setInspectionInterval('10000');
    setReminderKm('2000');
    setEditingId(null);
    setShowForm(false);
  };

  const handleAdd = async () => {
    if (!driverName || !brand || !plate) {
      alert('Укажите ФИО водителя, марку и госномер');
      return;
    }

    const newCar: Car = {
      id: generateId(),
      driverName: driverName || '—',
      brand,
      plate,
      vin: vin || '—',
      osagoExpiry: osagoExpiry || '',
      lastInspectionDate: lastInspectionDate || '',
      lastInspectionMileage: Number(lastInspectionMileage) || 0,
      inspectionInterval: Number(inspectionInterval),
      reminderKm: Number(reminderKm) || 2000,
    };

    const updated = [...cars, newCar];
    setCars(updated);
    await saveToStorage('shifttrack_cars', updated);
    resetForm();
  };

  const handleEditStart = (car: Car) => {
    setDriverName(car.driverName === '—' ? '' : car.driverName);
    setBrand(car.brand);
    setPlate(car.plate);
    setVin(car.vin === '—' ? '' : car.vin);
    setOsagoExpiry(car.osagoExpiry);
    setLastInspectionDate(car.lastInspectionDate);
    setLastInspectionMileage(car.lastInspectionMileage.toString());
    setInspectionInterval(car.inspectionInterval === 15000 ? '15000' : '10000');
    setReminderKm(car.reminderKm.toString());
    setEditingId(car.id);
    setShowForm(true);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    if (!driverName || !brand || !plate) {
      alert('Укажите ФИО водителя, марку и госномер');
      return;
    }

    const updatedCar: Car = {
      id: editingId,
      driverName: driverName || '—',
      brand,
      plate,
      vin: vin || '—',
      osagoExpiry: osagoExpiry || '',
      lastInspectionDate: lastInspectionDate || '',
      lastInspectionMileage: Number(lastInspectionMileage) || 0,
      inspectionInterval: Number(inspectionInterval),
      reminderKm: Number(reminderKm) || 2000,
    };

    const updatedList = cars.map((c) => (c.id === editingId ? updatedCar : c));
    setCars(updatedList);
    await saveToStorage('shifttrack_cars', updatedList);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить автомобиль? Все связанные смены останутся, но авто исчезнет из списка.')) return;
    const filtered = cars.filter((c) => c.id !== id);
    setCars(filtered);
    await saveToStorage('shifttrack_cars', filtered);
  };

  const statusColors: Record<StatusType, string> = {
    default: '#8A8A99',
    warning: '#FFA000',
    error: '#D32F2F',
  };
  const statusText: Record<StatusType, string> = {
    default: 'В норме',
    warning: 'Скоро истекает',
    error: 'Просрочено',
  };

  return (
    <Fragment>
      <PanelHeader>Машины</PanelHeader>

      <Group>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
          <Button size="s" mode="secondary" onClick={() => navigator.push('/')}>Домой</Button>
          <Button size="s" mode="secondary" onClick={() => navigator.push('/shifts')}>Смены</Button>
          <Button size="s" mode="secondary" onClick={() => navigator.push('/profile')}>Машины</Button>
          <Button size="s" mode="secondary" onClick={() => navigator.push('/settings')}>Настройки</Button>
        </div>
      </Group>

      {showForm ? (
        <Group header={<Header size="s">{editingId ? 'Редактировать автомобиль' : 'Добавить автомобиль'}</Header>}>
          <FormItem top="ФИО водителя">
            <Input
              type="text"
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
              placeholder="Иванов Иван Иванович"
            />
          </FormItem>

          <FormItem top="Марка авто">
            <Input type="text" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Lada Granta" />
          </FormItem>
          <FormItem top="Госномер">
            <Input type="text" value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="А000АА 18" />
          </FormItem>

          <FormItem top="VIN (необязательно)">
            <Input type="text" value={vin} onChange={(e) => setVin(e.target.value)} />
          </FormItem>

          <div style={{ borderTop: '1px solid #E1E3E6', margin: '16px 0' }} />

          <FormItem top="Дата окончания ОСАГО">
            <Input type="date" value={osagoExpiry} onChange={(e) => setOsagoExpiry(e.target.value)} />
          </FormItem>

          <div style={{ borderTop: '1px solid #E1E3E6', margin: '16px 0' }} />

          <FormItem top="Дата последнего ТО">
            <Input type="date" value={lastInspectionDate} onChange={(e) => setLastInspectionDate(e.target.value)} />
          </FormItem>
          <FormItem top="Пробег на момент последнего ТО (км)">
            <Input
              type="number"
              value={lastInspectionMileage}
              onChange={(e) => setLastInspectionMileage(e.target.value)}
              placeholder="например, 45000"
            />
          </FormItem>
          <FormItem top="Регламент ТО (интервал)">
            <Select
              value={inspectionInterval}
              onChange={(e) => setInspectionInterval(e.target.value as '10000' | '15000')}
              options={[
                { label: 'Каждые 10 000 км', value: '10000' },
                { label: 'Каждые 15 000 км', value: '15000' },
              ]}
            />
          </FormItem>
          <FormItem top="Порог напоминания о ТО (км)">
            <Input
              type="number"
              value={reminderKm}
              onChange={(e) => setReminderKm(e.target.value)}
              placeholder="2000"
            />
          </FormItem>

          <FormItem>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button size="m" mode="secondary" onClick={resetForm}>Отмена</Button>
              <Button size="m" onClick={editingId ? handleSaveEdit : handleAdd}>
                {editingId ? 'Сохранить' : 'Добавить авто'}
              </Button>
            </div>
          </FormItem>
        </Group>
      ) : (
        <Fragment>
          <Group header={<Header size="s">Список автомобилей</Header>}>
            {cars.length === 0 ? (
              <div style={{ padding: '12px', color: '#8A8A99', fontSize: '14px' }}>
                Автомобилей пока нет. Нажмите «Добавить авто» ниже.
              </div>
            ) : (
              cars.map((car) => {
                const currentMileage = getCurrentMileage(car.id, shifts);
                const status = calculateCarStatus(car, currentMileage);
                const nextTo = car.lastInspectionMileage + car.inspectionInterval;
                const remaining = currentMileage !== undefined ? nextTo - currentMileage : null;

                return (
                  <div key={car.id} style={{ padding: '12px', borderBottom: '1px solid #E1E3E6' }}>
                    <div style={{ fontWeight: 600, fontSize: '15px' }}>
                      {car.brand} {car.plate}
                      <span style={{ marginLeft: '8px', fontSize: '13px', color: statusColors[status.overall] }}>
                        {statusText[status.overall]}
                      </span>
                    </div>
                    {car.driverName && car.driverName !== '—' && (
                      <div style={{ marginTop: '4px', fontSize: '13px', color: '#6D7885' }}>
                        Водитель: {car.driverName}
                      </div>
                    )}
                    <div style={{ marginTop: '4px', fontSize: '13px', color: '#6D7885' }}>
                      VIN: {car.vin}
                    </div>
                    <div style={{ marginTop: '8px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                      <div style={{ fontSize: '13px' }}>
                        ОСАГО: <span style={{ color: statusColors[status.osago] }}>
                          {car.osagoExpiry || 'не указано'}
                        </span>
                      </div>
                      <div style={{ fontSize: '13px' }}>
                        Последнее ТО: {car.lastInspectionDate || 'не указано'}, {car.lastInspectionMileage} км
                      </div>
                      <div style={{ fontSize: '13px' }}>Следующее ТО: {nextTo} км</div>
                      <div style={{ fontSize: '13px' }}>
                        Текущий пробег: {currentMileage !== undefined ? `${currentMileage} км` : 'нет смен'}
                      </div>
                      {remaining !== null && (
                        <div style={{ fontSize: '13px', color: remaining <= 0 ? '#D32F2F' : remaining <= car.reminderKm ? '#FFA000' : '#8A8A99' }}>
                          До ТО: {remaining > 0 ? `${remaining} км` : 'просрочено'}
                        </div>
                      )}
                    </div>

                    <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                      <Button size="s" mode="secondary" onClick={() => handleEditStart(car)}>Изменить</Button>
                      <Button
                        size="s"
                        mode="secondary"
                        style={{ color: '#D32F2F' }}
                        onClick={() => handleDelete(car.id)}
                      >
                        Удалить
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </Group>

          <Group>
            <div style={{ padding: '12px' }}>
              <Button
                size="m"
                mode="primary"
                style={{ width: '100%' }}
                onClick={() => setShowForm(true)}
              >
                + Добавить авто
              </Button>
            </div>
          </Group>
        </Fragment>
      )}
    </Fragment>
  );
};
