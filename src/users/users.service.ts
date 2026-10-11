import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const publicUser = {
  id: true,
  email: true,
  name: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private checkPasswordSize(password: string) {
    if (Buffer.byteLength(password, 'utf8') > 72)
      throw new BadRequestException('Password must not exceed 72 UTF-8 bytes');
  }

  async create(dto: CreateUserDto) {
    this.checkPasswordSize(dto.password);
    if (await this.findOneByEmail(dto.email))
      throw new ConflictException('Email is already registered');
    return this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: await bcrypt.hash(dto.password, 10),
      },
      select: publicUser,
    });
  }

  findOneByEmail(email: string) {
    return this.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });
  }

  async findOneById(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: publicUser,
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  findForAuthentication(id: number) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async update(id: number, dto: UpdateUserDto) {
    const user = await this.findForAuthentication(id);
    if (!user) throw new NotFoundException('User not found');
    const changingEmail = dto.email !== undefined && dto.email !== user.email;
    if (changingEmail) {
      if (
        !user.password ||
        !dto.currentPassword ||
        !(await bcrypt.compare(dto.currentPassword, user.password))
      ) {
        throw new UnauthorizedException(
          'Current password is required to change email',
        );
      }
      const existing = await this.findOneByEmail(dto.email!);
      if (existing && existing.id !== id)
        throw new ConflictException('Email is already registered');
    }
    return this.prisma.user.update({
      where: { id, tokenVersion: user.tokenVersion },
      data: {
        name: dto.name,
        email: dto.email,
        ...(changingEmail ? { tokenVersion: { increment: 1 } } : {}),
      },
      select: publicUser,
    });
  }

  async changePassword(
    id: number,
    currentPassword: string,
    newPassword: string,
  ) {
    this.checkPasswordSize(newPassword);
    const user = await this.findForAuthentication(id);
    if (!user) throw new NotFoundException('User not found');
    if (
      !user.password ||
      !(await bcrypt.compare(currentPassword, user.password))
    ) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    const password = await bcrypt.hash(newPassword, 10);
    const updated = await this.prisma.user.updateMany({
      where: { id, tokenVersion: user.tokenVersion },
      data: { password, tokenVersion: { increment: 1 } },
    });
    if (!updated.count)
      throw new ConflictException('Account changed; sign in again');
    return { message: 'Password changed; sign in again' };
  }

  async revokeTokens(id: number, tokenVersion: number) {
    await this.prisma.user.updateMany({
      where: { id, tokenVersion },
      data: { tokenVersion: { increment: 1 } },
    });
  }

  async remove(id: number) {
    await this.prisma.user.delete({ where: { id } });
    return { message: 'Account deleted' };
  }

  findOneByGoogleId(googleId: string) {
    return this.prisma.user.findUnique({ where: { googleId } });
  }

  async linkGoogle(id: number, tokenVersion: number, googleId: string) {
    const user = await this.findForAuthentication(id);
    if (!user || user.tokenVersion !== tokenVersion)
      throw new UnauthorizedException('Sign in again before linking Google');
    if (user.googleId && user.googleId !== googleId)
      throw new ConflictException(
        'A different Google account is already linked',
      );
    return this.prisma.user.update({
      where: { id, tokenVersion },
      data: { googleId },
    });
  }

  createWithGoogle(data: { email: string; name: string; googleId: string }) {
    return this.prisma.user.create({
      data: { email: data.email, name: data.name, googleId: data.googleId },
    });
  }
}
