import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthRateLimitGuard } from '../security/auth-rate-limit.guard';
import type { RequestWithUser } from '../auth/interfaces/request-with-user.interface';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('register')
  @UseGuards(AuthRateLimitGuard)
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getProfile(@Req() request: RequestWithUser) {
    return this.usersService.findOneById(request.user.userId);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard, AuthRateLimitGuard)
  updateProfile(@Req() request: RequestWithUser, @Body() dto: UpdateUserDto) {
    return this.usersService.update(request.user.userId, dto);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard, AuthRateLimitGuard)
  changePassword(
    @Req() request: RequestWithUser,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(
      request.user.userId,
      dto.currentPassword,
      dto.newPassword,
    );
  }

  @Delete('me')
  @UseGuards(JwtAuthGuard)
  remove(@Req() request: RequestWithUser) {
    return this.usersService.remove(request.user.userId);
  }
}
