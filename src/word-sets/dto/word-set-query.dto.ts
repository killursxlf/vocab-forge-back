import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { WordStatus } from '@prisma/client';
import { PaginationDto } from '../../common/pagination.dto';

export class WordSetQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @IsOptional()
  @IsEnum(WordStatus)
  status?: WordStatus;
}
