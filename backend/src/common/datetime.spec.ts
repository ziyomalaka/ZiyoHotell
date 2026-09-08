import { paymentStatusFromAmounts, stayDebt } from './datetime';
import { homePath, normalizeRole } from './roles';
import { checkoutDate, daysForAmount, describeDays, paymentPeriod } from './billing';

describe('money source of truth', () => {
  it('UNPAID when paid is 0', () => {
    expect(paymentStatusFromAmounts(100000, 0)).toBe('UNPAID');
  });
  it('PARTIAL when paid is between', () => {
    expect(paymentStatusFromAmounts(100000, 40000)).toBe('PARTIAL');
  });
  it('PAID when paid covers expected', () => {
    expect(paymentStatusFromAmounts(100000, 100000)).toBe('PAID');
  });
  it('does not go negative', () => {
    expect(stayDebt(100, 150)).toBe(0);
  });
});

describe('roles', () => {
  it('maps legacy aliases', () => {
    expect(normalizeRole('SOFTWARE_ADMIN')).toBe('SYSTEM_ADMIN');
    expect(normalizeRole('BOSHLIQ')).toBe('MANAGER');
  });
  it('homes', () => {
    expect(homePath('SYSTEM_ADMIN')).toBe('/admin');
    expect(homePath('MANAGER')).toBe('/manager');
    expect(homePath('RECEPTION')).toBe('/register');
  });
});

describe('billing period', () => {
  it('25 000 so‘m = 1 kun, 750 000 = 30 kun = 1 oy', () => {
    expect(daysForAmount(25000, 750000)).toBe(1);
    expect(daysForAmount(750000, 750000)).toBe(30);
    expect(daysForAmount(2250000, 750000)).toBe(90);
    expect(describeDays(90)).toBe('3 oy');
    expect(describeDays(45)).toBe('1 oy 15 kun');
  });

  it('hisob kirish kunidan boshlanadi', () => {
    const startDate = new Date(Date.UTC(2026, 8, 1, 12, 0, 0));
    const paidAt = new Date(Date.UTC(2026, 8, 8, 15, 40, 0));
    const period = paymentPeriod({ amount: 750000, monthlyPrice: 750000, paidAt, startDate });
    expect(period.days).toBe(30);
    expect(period.from.toISOString().slice(0, 10)).toBe('2026-09-01');
    expect(period.to.toISOString().slice(0, 10)).toBe('2026-10-01');
  });

  it('keyingi to‘lov kirish kunidan hisoblangan kunlar ustiga qo‘shiladi', () => {
    const startDate = new Date(Date.UTC(2026, 8, 1, 12, 0, 0));
    const paidAt = new Date(Date.UTC(2026, 8, 20, 9, 0, 0));
    const period = paymentPeriod({
      amount: 750000,
      monthlyPrice: 750000,
      paidAt,
      startDate,
      currentPaidDays: 30,
    });
    expect(period.from.toISOString().slice(0, 10)).toBe('2026-10-01');
    expect(period.to.toISOString().slice(0, 10)).toBe('2026-10-31');
  });

  it('chiqish kuni to‘lov yopgan sana, chiqib ketganda haqiqiy sana', () => {
    const planned = checkoutDate({
      status: 'ACTIVE',
      paidUntil: new Date(Date.UTC(2026, 9, 1, 12, 0, 0)),
      endDate: null,
    });
    const actual = checkoutDate({
      status: 'COMPLETED',
      paidUntil: new Date(Date.UTC(2026, 9, 1, 12, 0, 0)),
      endDate: new Date(Date.UTC(2026, 8, 20, 12, 0, 0)),
    });
    expect(planned instanceof Date ? planned.toISOString().slice(0, 10) : planned).toBe('2026-10-01');
    expect(actual instanceof Date ? actual.toISOString().slice(0, 10) : actual).toBe('2026-09-20');
  });

  it('paidUntil yo‘q bo‘lsa chiqish kirish + to‘langan kunlardan chiqadi', () => {
    const planned = checkoutDate({
      status: 'ACTIVE',
      startDate: new Date(Date.UTC(2026, 8, 1, 12, 0, 0)),
      paidDays: 30,
      paidUntil: null,
      endDate: null,
    });
    expect(planned instanceof Date ? planned.toISOString().slice(0, 10) : planned).toBe('2026-10-01');
  });
});
