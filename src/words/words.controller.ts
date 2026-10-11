import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ParseIdPipe } from '../common/parse-id.pipe';
import type { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateWordDto } from './dto/update-word.dto';
import { WordsService } from './words.service';
import { AnswerWordDto } from './dto/answer-word.dto';

@Controller('words')
@UseGuards(JwtAuthGuard)
export class WordsController {
  constructor(private readonly words: WordsService) {}

  @Patch(':id')
  update(
    @Param('id', ParseIdPipe) id: number,
    @Body() dto: UpdateWordDto,
    @Req() request: RequestWithUser,
  ) {
    return this.words.update(id, dto, request.user.userId);
  }

  @Post(':id/answer')
  answer(
    @Param('id', ParseIdPipe) id: number,
    @Body() dto: AnswerWordDto,
    @Req() request: RequestWithUser,
  ) {
    return this.words.submitAnswer(
      id,
      dto.knows,
      request.user.userId,
      dto.answerId,
    );
  }

  @Delete(':id')
  remove(
    @Param('id', ParseIdPipe) id: number,
    @Req() request: RequestWithUser,
  ) {
    return this.words.remove(id, request.user.userId);
  }
}
