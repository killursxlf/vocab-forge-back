import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
  Put,
  Query,
  Req,
  UseGuards
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CardSettingsService } from './card-settings.service';

export class UpdateCardSettingsDto {
  frontKey?: string;
  backKey?: string;
  selectedStatuses?: string[];
  hintKey?: string | null;
  selectedTables?: string[]; 
}

class GetTrainingCardsDto {
  frontKey: string;
  backKey: string;
  hintKey: string | null;
  status: string;
  tables: string; 
}

class CountWordsDto {
  frontKey: string;
  backKey: string;
  selectedStatuses: string[];
  hintKey: string | null;
  selectedTables: string[];
}

interface AuthenticatedRequest extends Request {
  user: {
    userId: number;
    email: string;
  };
}

@Controller('card-settings')
@UseGuards(JwtAuthGuard)
export class CardSettingsController {
  constructor(private readonly cardSettingsService: CardSettingsService) {}

  @Get()
  async getSettings(
    @Req() req: AuthenticatedRequest,
    @Query('tables') tables?: string
  ) {
    try {
      const userId = req.user.userId;
      if (!userId) {
        throw new HttpException('User not found', HttpStatus.UNAUTHORIZED);
      }

      const selectedTables = tables ? tables.split(',') : undefined;
      const result = await this.cardSettingsService.getSettings(userId, selectedTables);

      return {
        data: {
          frontKey: result.frontKey,
          backKey: result.backKey,
          hintKey: result.hintKey,
          selectedStatuses: result.selectedStatuses,
          selectedTables: result.selectedTables,
          userColumns: result.userColumns || []
        }
      };
    } catch (error) {
      console.error('Error getting card settings:', error);
      throw new HttpException(
        'Failed to get card settings',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Put()
  async updateSettings(
    @Req() req: AuthenticatedRequest,
    @Body() updateData: UpdateCardSettingsDto,
  ) {
    try {
      const userId = req.user.userId;
      if (!userId) {
        throw new HttpException('User not found', HttpStatus.UNAUTHORIZED);
      }

      const result = await this.cardSettingsService.updateSettings(userId, updateData);
      
      const settingsWithColumns = await this.cardSettingsService.getSettings(
        userId, 
        updateData.selectedTables
      );

      return {
        data: {
          frontKey: result.frontKey,
          backKey: result.backKey,
          hintKey: result.hintKey,
          selectedStatuses: result.selectedStatuses,
          selectedTables: result.selectedTables,
          userColumns: settingsWithColumns.userColumns || []
        }
      };
    } catch (error) {
      console.error('Error updating card settings:', error);
      throw new HttpException(
        'Failed to update card settings',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('count')
  async countWords(
    @Req() req: AuthenticatedRequest,
    @Body() body: CountWordsDto,
  ) {
    const userId = req.user.userId;
    if (!userId) {
      throw new HttpException('User not found', HttpStatus.UNAUTHORIZED);
    }

    const count = await this.cardSettingsService.countWords(userId, body);
    return { data: { count } };
  }

  @Get('cards')
  async getTrainingCards(@Req() req: AuthenticatedRequest) {
    const userId = req.user.userId;
    if (!userId) {
      throw new HttpException('User not found', HttpStatus.UNAUTHORIZED);
    }
    
    return this.cardSettingsService.getTrainingCards(userId);
  }
} 
