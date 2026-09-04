import { paymentStatusFromAmounts, stayDebt } from './datetime';
import { homePath, normalizeRole } from './roles';

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
