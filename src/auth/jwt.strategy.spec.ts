import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtStrategy } from './jwt.strategy';

describe('JWT session validation', () => {
  const users = { findForAuthentication: jest.fn() };
  const strategy = new JwtStrategy(
    new ConfigService({ JWT_SECRET: 'x'.repeat(64) }),
    users as unknown as UsersService,
  );

  it('rejects tokens from a previous password or logout session version', async () => {
    users.findForAuthentication.mockResolvedValue({
      id: 1,
      email: 'user@example.com',
      tokenVersion: 2,
    });
    await expect(
      strategy.validate({ sub: 1, version: 1 }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
  it('rejects deleted accounts and legacy tokens', async () => {
    users.findForAuthentication.mockResolvedValue(null);
    await expect(
      strategy.validate({ sub: 1, version: 0 }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(strategy.validate({ sub: 1 })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
  it('returns current account data for a valid session', async () => {
    users.findForAuthentication.mockResolvedValue({
      id: 1,
      email: 'updated@example.com',
      tokenVersion: 2,
    });
    await expect(
      strategy.validate({ sub: 1, version: 2 }),
    ).resolves.toMatchObject({ userId: 1, email: 'updated@example.com' });
  });
});
