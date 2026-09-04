import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsArray, IsIn, IsInt, IsOptional, IsString, IsUUID, Min, MinLength } from 'class-validator';

export class FloorDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  number!: number;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;
}

export class RoomDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  floorId?: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  number!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  roomType?: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacity!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  dailyPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  monthlyPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class BedDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiProperty()
  @IsUUID()
  roomId!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  number!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;
}

export class StaffDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  fullName!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  login!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  })
  @IsString()
  @MinLength(5, { message: 'Parol kamida 5 ta belgidan iborat bo‘lishi kerak.' })
  password?: string;

  @ApiProperty()
  @IsString()
  role!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  workStatus?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RolePermissionsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  permissions!: string[];
}

export class AdminCancelPaymentDto {
  @ApiProperty()
  @IsUUID()
  id!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class SettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  hostelName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  hours?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dateFormat?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dailyPrice?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  monthlyPrice?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentDueDays?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  allowPartial?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  payCash?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  payCard?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  payBank?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  payOther?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sessionHours?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  loginAttempts?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  minPassword?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  strongPassword?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  blockMinutes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  auditEnabled?: string;
}

export class RestoreDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  password!: string;
}
