import { IsBoolean } from 'class-validator';

export class AnswerWordDto {
  @IsBoolean()
  knows: boolean;
}
