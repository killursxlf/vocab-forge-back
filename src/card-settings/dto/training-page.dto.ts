import { Type } from 'class-transformer';
import {
  IsInt,
  IsISO8601,
  Matches,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { PaginationDto } from '../../common/pagination.dto';

export class TrainingPageDto extends PaginationDto {
  @ValidateIf(
    (page: TrainingPageDto) =>
      page.afterId !== undefined || page.afterReviewAt !== undefined,
  )
  @IsISO8601({ strict: true, strictSeparator: true })
  @Matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
  afterReviewAt?: string;

  @ValidateIf(
    (page: TrainingPageDto) =>
      page.afterId !== undefined || page.afterReviewAt !== undefined,
  )
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  afterId?: number;
}
