import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateWordSetDto } from './dto/create-word-set.dto';
import { UpdateWordSetDto } from './dto/update-word-set.dto';

@Injectable()
export class WordSetsService {
  constructor(private prisma: PrismaService) {}

  // Create a new word set for a specific user
  create(createWordSetDto: CreateWordSetDto, userId: number) {
    return this.prisma.wordSet.create({
      data: {
        ...createWordSetDto,
        userId: userId, // Link to the user
      },
    });
  }

  // Find all word sets belonging to a specific user
  findAll(userId: number) {
    return this.prisma.wordSet.findMany({
      where: {
        userId: userId,
      },
      // You might want to order them, for example:
      orderBy: {
        id: 'desc',
      },
    });
  }

  // Find a single word set, ensuring it belongs to the user
  async findOne(id: number, userId: number) {
    const wordSet = await this.prisma.wordSet.findUnique({
      where: { id },
      include: {
        words: true, // Also include all words in this set
      },
    });

    if (!wordSet || wordSet.userId !== userId) {
      throw new NotFoundException('Word set not found');
    }
    return wordSet;
  }

  // Update a word set, ensuring it belongs to the user
  async update(id: number, updateWordSetDto: UpdateWordSetDto, userId: number) {
    // First, verify ownership
    await this.findOne(id, userId);
    return this.prisma.wordSet.update({
      where: { id },
      data: updateWordSetDto,
    });
  }

  // Remove a word set, ensuring it belongs to the user
  async remove(id: number, userId: number) {
    await this.findOne(id, userId);
    return this.prisma.wordSet.delete({
      where: { id },
    });
  }
}