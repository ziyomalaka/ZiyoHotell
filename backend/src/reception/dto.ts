import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { PAYMENT_METHODS, PaymentMethod, STAY_TYPES, type StayType } from '../common/billing';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

const PASSPORT_ID_MSG = 'ID raqami 2 ta harf va 7 ta raqam bo‘lishi kerak. Masalan: AA1234567.';
const PHONE_MSG = 'Telefon raqami +998 dan keyin 9 ta raqam bo‘lishi kerak.';

function toPassportId(value: unknown) {
  return typeof value === 'string' ? value.trim().toUpperCase() : value;
}

function toUzPhone(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return typeof value === 'string' ? '' : value;
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('998')) digits = digits.slice(3);
  if (!digits) return '';
  return `+998${digits}`;
}

export class RegisterDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  fullName!: string;

  @ApiPropertyOptional({ example: '+998901234567' })
  @Transform(({ value }) => toUzPhone(value))
  @IsOptional()
  @ValidateIf((_, v) => !!v)
  @IsString()
  @Matches(/^\+998\d{9}$/, { message: PHONE_MSG })
  phone?: string;

  @ApiPropertyOptional({ enum: ['MALE', 'FEMALE'] })
  @IsOptional()
  @IsIn(['MALE', 'FEMALE'])
  gender?: string;

  @ApiPropertyOptional({ example: '2004-05-17' })
  @IsOptional()
  @ValidateIf((_, v) => !!v)
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Tug‘ilgan sana noto‘g‘ri.' })
  birthDate?: string | null;

  @ApiProperty({ example: 'AA1234567', description: 'Migrantda istalgan format: 3–20 ta harf yoki raqam (servis tekshiradi).' })
  @Transform(({ value }) => toPassportId(value))
  @ValidateIf((o: RegisterDto) => o.stayType !== 'MIGRANT')
  @IsString()
  @Matches(/^[A-Z]{2}\d{7}$/, { message: PASSPORT_ID_MSG })
  passportId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  extraPhone?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string | null;

  @ApiPropertyOptional({ description: 'Berilmasa roomId dagi bo‘sh o‘rin avtomatik tanlanadi.' })
  @ValidateIf((o: RegisterDto) => !o.roomId)
  @IsUUID()
  bedId?: string;

  @ApiPropertyOptional()
  @ValidateIf((o: RegisterDto) => !o.bedId)
  @IsUUID()
  roomId?: string;

  @ApiProperty({ enum: STAY_TYPES })
  @IsIn([...STAY_TYPES])
  stayType!: StayType;

  @ApiProperty()
  @IsDateString()
  startDate!: string;

  @ApiPropertyOptional({ description: 'Kunlik va migrant uchun. Migrantda majburiy.' })
  // Xato matni pastki dekoratordan olinadi: kun kiritilmasa "kiriting" chiqishi uchun IsInt eng pastda.
  @ValidateIf((o: RegisterDto) => o.stayType === 'MIGRANT' || o.daysCount != null)
  @Type(() => Number)
  @Max(3650, { message: 'Kunlar soni juda katta.' })
  @Min(1, { message: 'Kunlar soni kamida 1 bo‘lishi kerak.' })
  @IsInt({ message: 'Migrant uchun kunlar sonini kiriting.' })
  daysCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentMonth?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  paidAmount?: number;

  @ApiProperty({ enum: ['PAID', 'UNPAID'] })
  @IsIn(['PAID', 'UNPAID', 'PARTIAL'])
  paymentStatus!: 'PAID' | 'UNPAID' | 'PARTIAL';

  @ApiPropertyOptional({ enum: PAYMENT_METHODS })
  @IsOptional()
  @IsIn([...PAYMENT_METHODS])
  paymentMethod?: PaymentMethod;
}

export class UpdateCustomerDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  fullName!: string;

  @ApiPropertyOptional({ example: '+998901234567' })
  @Transform(({ value }) => toUzPhone(value))
  @IsOptional()
  @ValidateIf((_, v) => !!v)
  @IsString()
  @Matches(/^\+998\d{9}$/, { message: PHONE_MSG })
  phone?: string;

  @ApiPropertyOptional({ enum: ['MALE', 'FEMALE'] })
  @IsOptional()
  @IsIn(['MALE', 'FEMALE'])
  gender?: string;

  @ApiPropertyOptional({ example: '2004-05-17' })
  @IsOptional()
  @ValidateIf((_, v) => !!v)
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Tug‘ilgan sana noto‘g‘ri.' })
  birthDate?: string | null;

  @ApiProperty({ example: 'AA1234567', description: 'Format servisda tekshiriladi: migrant mijozda istalgan.' })
  @Transform(({ value }) => toPassportId(value))
  @IsString()
  @MinLength(1)
  passportId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  extraPhone?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  bedId?: string;
}

export class CheckoutDto {
  @ApiProperty()
  @IsUUID()
  stayId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  at?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ description: 'Muddat tugamagan bo‘lsa: to‘lov qaytariladimi (true) yoki yo‘q (false).' })
  @IsOptional()
  @IsBoolean()
  refund?: boolean;

  @ApiPropertyOptional({ description: 'Qaytim summasi. Berilmasa foydalanilmagan kunlardan hisoblanadi.' })
  @IsOptional()
  @Type(() => Number)
  @Min(1, { message: 'Qaytim summasi noto‘g‘ri.' })
  @IsInt({ message: 'Qaytim summasi butun son bo‘lishi kerak.' })
  refundAmount?: number;

  @ApiPropertyOptional({ enum: PAYMENT_METHODS })
  @IsOptional()
  @IsIn([...PAYMENT_METHODS])
  refundMethod?: PaymentMethod;
}

export class CreatePaymentDto {
  @ApiProperty()
  @IsUUID()
  stayId!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  amount!: number;

  @ApiPropertyOptional({ enum: PAYMENT_METHODS })
  @IsOptional()
  @IsIn([...PAYMENT_METHODS])
  method?: PaymentMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  @ApiPropertyOptional({ enum: STAY_TYPES })
  @IsOptional()
  @IsIn([...STAY_TYPES])
  type?: StayType;

  @ApiPropertyOptional({ description: 'Migrant to‘lovi qancha kun berishi (xodim kiritadi). 0 — faqat qarz yopiladi.' })
  @IsOptional()
  @Type(() => Number)
  @Max(3650, { message: 'Kunlar soni juda katta.' })
  @Min(0, { message: 'Kunlar soni manfiy bo‘lmaydi.' })
  @IsInt({ message: 'Kunlar soni butun son bo‘lishi kerak.' })
  days?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  period?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export class CancelPaymentDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  reason!: string;
}

export class PageQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tab?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  range?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  age?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sort?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  order?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pay?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  method?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  year?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  month?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  staffId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  room?: string;

  @ApiPropertyOptional({ description: 'Qavat raqami bo‘yicha filtr' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  floor?: number;
}
