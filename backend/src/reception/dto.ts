import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  birthDate?: string | null;

  @ApiProperty({ example: 'AA1234567' })
  @Transform(({ value }) => toPassportId(value))
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

  @ApiProperty()
  @IsUUID()
  bedId!: string;

  @ApiProperty({ enum: ['DAILY', 'MONTHLY'] })
  @IsIn(['DAILY', 'MONTHLY'])
  stayType!: 'DAILY' | 'MONTHLY';

  @ApiProperty()
  @IsDateString()
  startDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
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

  @ApiPropertyOptional({ enum: ['CASH', 'CARD', 'BANK', 'BANK_TRANSFER', 'OTHER'] })
  @IsOptional()
  @IsIn(['CASH', 'CARD', 'BANK', 'BANK_TRANSFER', 'OTHER'])
  paymentMethod?: 'CASH' | 'CARD' | 'BANK' | 'BANK_TRANSFER' | 'OTHER';
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  birthDate?: string | null;

  @ApiProperty({ example: 'AA1234567' })
  @Transform(({ value }) => toPassportId(value))
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

  @ApiPropertyOptional({ enum: ['CASH', 'CARD', 'BANK', 'BANK_TRANSFER', 'OTHER'] })
  @IsOptional()
  @IsIn(['CASH', 'CARD', 'BANK', 'BANK_TRANSFER', 'OTHER'])
  method?: 'CASH' | 'CARD' | 'BANK' | 'BANK_TRANSFER' | 'OTHER';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  @ApiPropertyOptional({ enum: ['DAILY', 'MONTHLY'] })
  @IsOptional()
  @IsIn(['DAILY', 'MONTHLY'])
  type?: 'DAILY' | 'MONTHLY';

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
