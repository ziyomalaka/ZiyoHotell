import { paymentStatusFromAmounts, stayDebt } from './datetime';
import { homePath, normalizeRole } from './roles';
import { daysForAmount, describeDays, paymentPeriod } from './billing';

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
  it('750 000 so‘m = 30 kun, 2 250 000 = 3 oy', () => {
    expect(daysForAmount(750000, 750000)).toBe(30);
    expect(daysForAmount(2250000, 750000)).toBe(90);
    expect(describeDays(90)).toBe('3 oy');
    expect(describeDays(45)).toBe('1 oy 15 kun');
  });

  it('hisob to‘lov qilingan kundan boshlanadi', () => {
    const paidAt = new Date(Date.UTC(2026, 8, 7, 15, 40, 0));
    const period = paymentPeriod({ amount: 2250000, monthlyPrice: 750000, paidAt });
    expect(period.days).toBe(90);
    expect(period.from.toISOString().slice(0, 10)).toBe('2026-09-07');
    expect(period.to.toISOString().slice(0, 10)).toBe('2026-12-06');
  });

  it('keyingi to‘lov qolgan muddat ustiga qo‘shiladi', () => {
    const current = new Date(Date.UTC(2026, 11, 6, 12, 0, 0));
    const paidAt = new Date(Date.UTC(2026, 8, 20, 9, 0, 0));
    const period = paymentPeriod({ amount: 750000, monthlyPrice: 750000, paidAt, currentPaidUntil: current });
    expect(period.from.toISOString().slice(0, 10)).toBe('2026-12-06');
    expect(period.to.toISOString().slice(0, 10)).toBe('2027-01-05');
  });
});
