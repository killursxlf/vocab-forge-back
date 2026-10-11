import { WordStatus } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateWordDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  original: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  translation: string;

  @IsEnum(WordStatus)
  @IsOptional()
  status?: WordStatus;

  @IsObject()
  @IsOptional()
  customFields?: Record<string, unknown> | null;
}
