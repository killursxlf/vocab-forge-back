import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Пользователь с таким email уже существует');
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(
      createUserDto.password,
      saltRounds,
    );

    const user = await this.prisma.user.create({
      data: {
        name: createUserDto.name,
        email: createUserDto.email,
        password: hashedPassword,
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user;
    return result;
  }

  async findOneByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findOneById(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException(`Пользователь с ID ${id} не найден`);
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user;
    return result;
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    if (updateUserDto.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: updateUserDto.email },
      });
      if (existingUser && existingUser.id !== id) {
        throw new ConflictException('Этот email уже используется');
      }
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: updateUserDto,
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user;
    return result;
  }

  async changePassword(id: number, currentPass: string, newPass: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    if (!user.password) {
      throw new BadRequestException(
        'Вы зарегистрировались через социальные сети и еще не установили пароль.',
      );
    }

    // Этот код выполнится, только если пароль в базе данных есть
    const isPasswordMatch = await bcrypt.compare(currentPass, user.password);
    if (!isPasswordMatch) {
      throw new UnauthorizedException('Неверный текущий пароль');
    }

    const saltRounds = 10;
    const hashedNewPassword = await bcrypt.hash(newPass, saltRounds);

    await this.prisma.user.update({
      where: { id },
      data: { password: hashedNewPassword },
    });

    return { message: 'Пароль успешно изменен' };
  }

  findAll() {
    return this.prisma.user.findMany({
      // Теперь эта строка не вызовет ошибку
      select: { id: true, email: true, name: true, createdAt: true },
    });
  }

  async remove(id: number) {
    await this.findOneById(id);
    await this.prisma.user.delete({ where: { id } });
    return { message: `Пользователь с ID ${id} успешно удален` };
  }
}
