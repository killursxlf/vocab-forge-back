import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';

describe('UsersService', () => {
  const prisma = {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn((args: Prisma.UserCreateArgs) => Promise.resolve(args)),
      update: jest.fn((args: Prisma.UserUpdateArgs) => Promise.resolve(args)),
      updateMany: jest.fn((args: Prisma.UserUpdateManyArgs) => {
        void args;
        return Promise.resolve({ count: 1 });
      }),
    },
  };
  const service = new UsersService(prisma as unknown as PrismaService);

  beforeEach(() => {
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.findUnique.mockResolvedValue({
      id: 1,
      email: 'user@example.com',
      password: null,
      tokenVersion: 0,
    });
  });

  it('hashes registration passwords and only selects public fields', async () => {
    await service.create({
      name: 'User',
      email: 'user@example.com',
      password: 'Password123',
    });
    const args = prisma.user.create.mock.calls[0][0];
    expect(
      await bcrypt.compare('Password123', args.data.password as string),
    ).toBe(true);
    expect(args.select).not.toHaveProperty('password');
    expect(args.select).not.toHaveProperty('tokenVersion');
  });

  it('rejects passwords that exceed bcrypt UTF-8 byte limits', async () => {
    await expect(
      service.create({
        name: 'User',
        email: 'user@example.com',
        password: '😀'.repeat(20),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('only writes profile fields even if called outside HTTP validation', async () => {
    await service.update(
      1,
      Object.assign(
        { name: 'New name' },
        { password: 'injected', googleId: 'injected' },
      ),
    );
    expect(prisma.user.update.mock.calls[0][0].data).toEqual({
      name: 'New name',
      email: undefined,
    });
  });

  it('requires the current password before changing email', async () => {
    await expect(
      service.update(1, { email: 'other@example.com' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('increments the session version on password change', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 1,
      password: await bcrypt.hash('OldPassword', 4),
      tokenVersion: 3,
    });
    await service.changePassword(1, 'OldPassword', 'NewPassword');
    const args = prisma.user.updateMany.mock.calls[0][0];
    expect(args.where).toEqual({ id: 1, tokenVersion: 3 });
    expect(args.data.tokenVersion).toEqual({ increment: 1 });
    expect(
      await bcrypt.compare('NewPassword', args.data.password as string),
    ).toBe(true);
  });
});
