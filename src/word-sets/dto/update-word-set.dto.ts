import { PartialType } from '@nestjs/mapped-types';
import { CreateWordSetDto } from './create-word-set.dto';

export class UpdateWordSetDto extends PartialType(CreateWordSetDto, {
  skipNullProperties: false,
}) {}
