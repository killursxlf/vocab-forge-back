import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

describe('Google account linking', () => {
  const users = {
    findOneByGoogleId: jest.fn(),
    findOneByEmail: jest.fn(),
    createWithGoogle: jest.fn(),
    linkGoogle: jest.fn(),
  };
  const service = new AuthService(
    users as unknown as UsersService,
    new JwtService(),
  );
  const profile = {
    googleId: 'google-id',
    email: 'user@example.com',
    name: 'User',
    verified: true,
  };
  beforeEach(() => {
    users.findOneByGoogleId.mockResolvedValue(null);
  });

  it('does not attach Google to an account based only on email', async () => {
    users.findOneByEmail.mockResolvedValue({
      id: 1,
      password: 'attacker-password',
    });
    await expect(service.validateGoogleUser(profile)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(users.linkGoogle).not.toHaveBeenCalled();
    expect(users.createWithGoogle).not.toHaveBeenCalled();
  });

  it('only links an explicitly authenticated account', async () => {
    users.linkGoogle.mockResolvedValue({
      id: 1,
      email: profile.email,
      name: profile.name,
      tokenVersion: 2,
    });
    await expect(
      service.validateGoogleUser(profile, 1, 2),
    ).resolves.toMatchObject({ userId: 1, tokenVersion: 2 });
    expect(users.linkGoogle).toHaveBeenCalledWith(1, 2, profile.googleId);
  });

  it('rejects unverified Google email', async () => {
    await expect(
      service.validateGoogleUser({ ...profile, verified: false }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
