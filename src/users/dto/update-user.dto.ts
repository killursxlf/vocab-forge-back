import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  ValidateIf,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateUserDto {
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @MaxLength(72)
  currentPassword?: string;
}
