import {
  ArrayMaxSize,
  IsArray,
  IsNotEmpty,
  IsObject,
  ValidateIf,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateWordSetDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsArray()
  @ArrayMaxSize(50)
  @IsObject({ each: true })
  customColumns?: Record<string, unknown>[];
}
