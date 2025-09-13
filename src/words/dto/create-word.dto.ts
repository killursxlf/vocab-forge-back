import { WordStatus } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateWordDto {
  @IsString()
  @IsNotEmpty()
  original: string;

  @IsString()
  @IsNotEmpty()
  translation: string;

  @IsEnum(WordStatus)
  @IsOptional()
  status?: WordStatus;

  @IsObject()
  @IsOptional()
  customFields?: Record<string, any>;
}
