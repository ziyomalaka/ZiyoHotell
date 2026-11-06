import { paymentStatusFromAmounts, stayDebt } from './datetime';
import { homePath, normalizeRole } from './roles';
import { capacityMonthlyPrice, cashCardTotals, checkoutDate, daysForAmount, describeDays, netIncome, paymentPeriod, refundableAmount } from './billing';

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

  it('kunlik yashashda 50 000 so‘m = 1 kun', () => {
    expect(daysForAmount(50000, 750000, 'DAILY')).toBe(1);
    expect(daysForAmount(150000, 750000, 'DAILY')).toBe(3);
    expect(daysForAmount(750000, 750000, 'DAILY')).toBe(15);
    expect(describeDays(3, 'DAILY')).toBe('3 kun');
    const startDate = new Date(Date.UTC(2026, 8, 1, 12, 0, 0));
    const paidAt = new Date(Date.UTC(2026, 8, 1, 15, 0, 0));
    const period = paymentPeriod({
      amount: 50000,
      monthlyPrice: 750000,
      paidAt,
      startDate,
      type: 'DAILY',
    });
    expect(period.days).toBe(1);
    expect(period.to.toISOString().slice(0, 10)).toBe('2026-09-02');
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

describe('capacity pricing', () => {
  it('prices rooms by number of beds, "up to N"', () => {
    expect([2, 3, 4, 5, 6, 7, 8, 9, 14, 16].map(capacityMonthlyPrice)).toEqual([
      1200000, 950000, 950000, 900000, 900000, 850000, 850000, 750000, 750000, 750000,
    ]);
  });

  it('paying above the monthly price adds extra days', () => {
    // 2 kishilik: 1 200 000 / 30 = 40 000 so‘m kuniga.
    expect(daysForAmount(1200000, capacityMonthlyPrice(2), 'MONTHLY')).toBe(30);
    expect(daysForAmount(1500000, capacityMonthlyPrice(2), 'MONTHLY')).toBe(37);
    expect(describeDays(37, 'MONTHLY')).toContain('1 oy');
  });
});

describe('checkout refund', () => {
  const day = (iso: string) => new Date(`${iso}T12:00:00.000Z`);
  const pay = (amount: number, days: number, from: string, to: string) => ({
    status: 'PAID',
    amount,
    days,
    coversFrom: day(from),
    coversTo: day(to),
  });

  it('returns unused days of a monthly payment', () => {
    // 750 000 = 30 kun, 10 kun yashab chiqdi: 20 kun x 25 000.
    const r = refundableAmount([pay(750000, 30, '2026-11-01', '2026-12-01')], day('2026-11-11'));
    expect(r).toEqual({ days: 20, amount: 500000 });
  });

  it('counts prepaid periods and subtracts earlier refunds', () => {
    const payments = [pay(750000, 30, '2026-11-01', '2026-12-01'), pay(750000, 30, '2026-12-01', '2026-12-31')];
    expect(refundableAmount(payments, day('2026-11-21'))).toEqual({ days: 40, amount: 1000000 });
    const refunded = [...payments, { status: 'REFUND', amount: 400000, days: 0, coversFrom: null, coversTo: null }];
    expect(refundableAmount(refunded, day('2026-11-21')).amount).toBe(600000);
  });

  it('returns nothing after the paid period ends', () => {
    expect(refundableAmount([pay(750000, 30, '2026-11-01', '2026-12-01')], day('2026-12-05'))).toEqual({ days: 0, amount: 0 });
  });

  it('subtracts refunds from cash income', () => {
    const rows = [
      { status: 'PAID', amount: 900000, method: 'CASH' },
      { status: 'REFUND', amount: 200000, method: 'CASH' },
      { status: 'UNPAID', amount: 50000, method: 'CASH' },
    ];
    expect(netIncome(rows)).toBe(700000);
    expect(cashCardTotals(rows.filter((r) => r.status !== 'UNPAID')).cash).toBe(700000);
  });
});
