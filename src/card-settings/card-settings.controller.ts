import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { TrainingPageDto } from './dto/training-page.dto';
import { CardSettingsService } from './card-settings.service';
import { CardFiltersDto, TablesQueryDto } from './dto/card-settings.dto';
import { UpdateCardSettingsDto } from './dto/update-card-settings.dto';

@Controller('card-settings')
@UseGuards(JwtAuthGuard)
export class CardSettingsController {
  constructor(private readonly settings: CardSettingsService) {}

  @Get()
  async getSettings(
    @Req() request: RequestWithUser,
    @Query() query: TablesQueryDto,
  ) {
    return {
      data: await this.settings.getSettings(request.user.userId, query.tables),
    };
  }

  @Put()
  async updateSettings(
    @Req() request: RequestWithUser,
    @Body() dto: UpdateCardSettingsDto,
  ) {
    await this.settings.updateSettings(request.user.userId, dto);
    return {
      data: await this.settings.getSettings(
        request.user.userId,
        dto.selectedTables,
      ),
    };
  }

  @Post('count')
  async countWords(
    @Req() request: RequestWithUser,
    @Body() dto: CardFiltersDto,
  ) {
    return {
      data: await this.settings.getReviewSummary(request.user.userId, dto),
    };
  }

  @Get('cards')
  async getTrainingCards(
    @Req() request: RequestWithUser,
    @Query() page: TrainingPageDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    if (page.afterId !== undefined && page.offset !== 0)
      throw new BadRequestException(
        'Do not combine a review cursor with offset',
      );
    const cards = await this.settings.getTrainingCards(
      request.user.userId,
      page,
    );
    if (page.afterId === undefined && cards.length === page.limit)
      response.setHeader('X-Next-Offset', page.offset + page.limit);
    return cards;
  }
}
