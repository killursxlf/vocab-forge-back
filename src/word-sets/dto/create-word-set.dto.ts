import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateWordSetDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsArray()
  @IsOptional()
  customColumns?: any[];
}