import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ParseIdPipe } from '../common/parse-id.pipe';
import type { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { PaginationDto } from '../common/pagination.dto';
import { CreateWordSetDto } from './dto/create-word-set.dto';
import { UpdateWordSetDto } from './dto/update-word-set.dto';
import { WordSetQueryDto } from './dto/word-set-query.dto';
import { WordSetsService } from './word-sets.service';
import { WordsService } from '../words/words.service';
import { CreateWordDto } from '../words/dto/create-word.dto';

@Controller('word-sets')
@UseGuards(JwtAuthGuard)
export class WordSetsController {
  constructor(
    private readonly sets: WordSetsService,
    private readonly words: WordsService,
  ) {}

  @Post(':id/words')
  addWord(
    @Param('id', ParseIdPipe) id: number,
    @Body() dto: CreateWordDto,
    @Req() request: RequestWithUser,
  ) {
    return this.words.create(dto, id, request.user.userId);
  }

  @Post()
  create(@Body() dto: CreateWordSetDto, @Req() request: RequestWithUser) {
    return this.sets.create(dto, request.user.userId);
  }

  @Get()
  async findAll(
    @Req() request: RequestWithUser,
    @Query() page: PaginationDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const sets = await this.sets.findAll(request.user.userId, page);
    if (sets.length === page.limit)
      response.setHeader('X-Next-Offset', page.offset + page.limit);
    return sets;
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIdPipe) id: number,
    @Req() request: RequestWithUser,
    @Query() query: WordSetQueryDto,
  ) {
    return this.sets.findOne(id, request.user.userId, query);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIdPipe) id: number,
    @Body() dto: UpdateWordSetDto,
    @Req() request: RequestWithUser,
  ) {
    return this.sets.update(id, dto, request.user.userId);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseIdPipe) id: number,
    @Req() request: RequestWithUser,
  ) {
    return this.sets.remove(id, request.user.userId);
  }
}
