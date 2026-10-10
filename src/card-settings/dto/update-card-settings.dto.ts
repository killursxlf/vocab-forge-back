import { PartialType } from '@nestjs/mapped-types';
import { CardFiltersDto } from './card-settings.dto';

export class UpdateCardSettingsDto extends PartialType(CardFiltersDto, {
  skipNullProperties: false,
}) {}
