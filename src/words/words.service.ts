import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateWordDto } from './dto/create-word.dto';
import { UpdateWordDto } from './dto/update-word.dto';

@Injectable()
export class WordsService {
  constructor(private prisma: PrismaService) {}

  private async checkWordSetOwnership(wordSetId: number, userId: number) {
    const wordSet = await this.prisma.wordSet.findUnique({ where: { id: wordSetId } });
    if (!wordSet || wordSet.userId !== userId) {
      throw new ForbiddenException('Access to this resource is denied');
    }
  }

  async create(createWordDto: CreateWordDto, wordSetId: number, userId: number) {
    await this.checkWordSetOwnership(wordSetId, userId);
    return this.prisma.word.create({
      data: {
        ...createWordDto,
        wordSetId: wordSetId,
      },
    });
  }

  async update(wordId: number, updateWordDto: UpdateWordDto, userId: number) {
    const word = await this.prisma.word.findUnique({ where: { id: wordId } });
    if (!word) throw new NotFoundException('Word not found');
    
    await this.checkWordSetOwnership(word.wordSetId, userId);

    return this.prisma.word.update({
      where: { id: wordId },
      data: updateWordDto,
    });
  }

  async remove(wordId: number, userId: number) {
    const word = await this.prisma.word.findUnique({ where: { id: wordId } });
    if (!word) throw new NotFoundException('Word not found');

    await this.checkWordSetOwnership(word.wordSetId, userId);
    
    return this.prisma.word.delete({ where: { id: wordId } });
  }
}