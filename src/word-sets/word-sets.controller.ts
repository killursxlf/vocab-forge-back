import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import type { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { CreateWordSetDto } from './dto/create-word-set.dto';
import { UpdateWordSetDto } from './dto/update-word-set.dto';
import { WordSetsService } from './word-sets.service';
import { WordsService } from 'src/words/words.service';
import { CreateWordDto } from 'src/words/dto/create-word.dto';


@Controller('word-sets')
@UseGuards(JwtAuthGuard) 
export class WordSetsController {
  constructor(
    private readonly wordSetsService: WordSetsService,
    private readonly wordsService: WordsService, 
  ) {}

  @Post(':id/words')
  addWord(
    @Param('id', ParseIntPipe) id: number,
    @Body() createWordDto: CreateWordDto,
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user.userId;
    return this.wordsService.create(createWordDto, id, userId);
  }

  @Post()
  create(@Body() createWordSetDto: CreateWordSetDto, @Req() req: RequestWithUser) {
    return this.wordSetsService.create(createWordSetDto, req.user.userId);
  }

  @Get()
  findAll(@Req() req: RequestWithUser) {
    return this.wordSetsService.findAll(req.user.userId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithUser) {
    return this.wordSetsService.findOne(id, req.user.userId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateWordSetDto: UpdateWordSetDto,
    @Req() req: RequestWithUser,
  ) {
    return this.wordSetsService.update(id, updateWordSetDto, req.user.userId);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithUser) {
    return this.wordSetsService.remove(id, req.user.userId);
  }
}