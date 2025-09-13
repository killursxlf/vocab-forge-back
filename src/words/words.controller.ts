import {
  Body,
  Controller,
  Delete,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { RequestWithUser } from 'src/auth/interfaces/request-with-user.interface';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { UpdateWordDto } from './dto/update-word.dto';
import { WordsService } from './words.service';
import { AnswerWordDto } from './dto/answer-word.dto';

@Controller('words')
@UseGuards(JwtAuthGuard)
export class WordsController {
  constructor(private readonly wordsService: WordsService) {}

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateWordDto: UpdateWordDto,
    @Req() req: RequestWithUser,
  ) {
    return this.wordsService.update(id, updateWordDto, req.user.userId);
  }

  @Post(':id/answer')
  answer(@Param('id') id: string, @Body() dto: AnswerWordDto, @Req() req: any) {
    return this.wordsService.submitAnswer(+id, dto.knows, req.user.userId);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithUser) {
    return this.wordsService.remove(id, req.user.userId);
  }
}
