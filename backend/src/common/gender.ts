/** Xona va mijoz jinsi: MALE — bollar, FEMALE — qizlar. */
export type Gender = 'MALE' | 'FEMALE';

export const GENDERS: Gender[] = ['MALE', 'FEMALE'];

/**
 * Tashqaridan kelgan qiymatni MALE/FEMALE ga keltiradi.
 * Noto‘g‘ri yoki bo‘sh bo‘lsa `fallback` qaytariladi (standart holatda MALE).
 */
export function roomGender(value?: string | null, fallback: string = 'MALE'): Gender {
  if (value === 'FEMALE' || value === 'MALE') return value;
  return fallback === 'FEMALE' ? 'FEMALE' : 'MALE';
}

/** Xato xabarlari uchun ko‘plik shakli: "qizlar" / "bollar". */
export function genderWord(value?: string | null) {
  return roomGender(value) === 'FEMALE' ? 'qizlar' : 'bollar';
}

/** Hisobot va Excel uchun: "Qizlar" / "Bollar". */
export function genderLabel(value?: string | null) {
  return roomGender(value) === 'FEMALE' ? 'Qizlar' : 'Bollar';
}
