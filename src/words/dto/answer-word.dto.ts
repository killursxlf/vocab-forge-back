import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class AnswerWordDto {
  @IsBoolean()
  knows: boolean;

  @IsOptional()
  @IsUUID()
  answerId?: string;
}
