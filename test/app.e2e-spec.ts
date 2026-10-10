import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import type { Server } from 'node:http';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { PrismaService } from '../src/prisma/prisma.service';

describe('HTTP security boundaries', () => {
  let app: NestExpressApplication;
  let server: Server;
  let cookie: string;
  const user = {
    id: 1,
    email: 'user@example.com',
    name: 'User',
    tokenVersion: 0,
  };
  const prisma = {
    user: { findUnique: jest.fn(), findFirst: jest.fn() },
    wordSet: { findMany: jest.fn(), findUnique: jest.fn() },
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn().mockResolvedValue(0),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();
    app = module.createNestApplication<NestExpressApplication>({
      bodyParser: false,
      logger: false,
    });
    configureApp(app);
    await app.init();
    server = app.getHttpServer<Server>();
    cookie =
      'access_token=' +
      app.get(JwtService).sign({ sub: 1, email: user.email, version: 0 });
  });

  beforeEach(() => {
    prisma.user.findUnique.mockResolvedValue(user);
    prisma.wordSet.findMany.mockResolvedValue([]);
    prisma.wordSet.findUnique.mockResolvedValue(null);
    prisma.$queryRaw.mockResolvedValue([
      { count: 1, expiresAt: new Date(Date.now() + 60000) },
    ]);
  });

  afterAll(async () => {
    await app.close();
  });

  it('requires authentication for profiles and collections', async () => {
    for (const path of [
      '/users/me',
      '/auth/profile',
      '/word-sets',
      '/card-settings/cards',
    ]) {
      await request(server).get(path).expect(401);
    }
  });

  it('removes public account enumeration and ID-based mutations', async () => {
    await request(server).get('/users').expect(404);
    await request(server).get('/users/1').expect(404);
    await request(server)
      .patch('/users/1')
      .send({ name: 'Attack' })
      .expect(404);
    await request(server).delete('/users/1').send({}).expect(404);
  });

  it('rejects protected fields and invalid or null values before service writes', async () => {
    for (const payload of [
      { password: 'plaintext' },
      { googleId: 'injected' },
      { name: null },
      { email: null },
    ]) {
      await request(server)
        .patch('/users/me')
        .set('Cookie', cookie)
        .send(payload)
        .expect(400);
    }
    await request(server)
      .post('/word-sets')
      .set('Cookie', cookie)
      .send({ title: 'Set', userId: 2 })
      .expect(400);
    await request(server)
      .patch('/words/1')
      .set('Cookie', cookie)
      .send({ wordSet: { connect: { id: 2 } } })
      .expect(400);
    await request(server)
      .put('/card-settings')
      .set('Cookie', cookie)
      .send({ selectedStatuses: null })
      .expect(400);
  });

  it('validates numeric IDs and bounded query parameters', async () => {
    await request(server)
      .post('/words/abc/answer')
      .set('Cookie', cookie)
      .send({ knows: true })
      .expect(400);
    await request(server)
      .post('/words/2147483648/answer')
      .set('Cookie', cookie)
      .send({ knows: true })
      .expect(400);
    await request(server)
      .get('/word-sets?limit=101')
      .set('Cookie', cookie)
      .expect(400);
    await request(server)
      .get('/word-sets/1?status=INVALID')
      .set('Cookie', cookie)
      .expect(400);
    await request(server).get('/word-sets/1').set('Cookie', cookie).expect(404);
    await request(server)
      .get('/word-sets')
      .set('Cookie', cookie)
      .expect(200)
      .expect([]);
  });

  it('rejects hostile origins and browser form requests', async () => {
    await request(server)
      .post('/auth/login')
      .set('Origin', 'https://evil.example')
      .send({})
      .expect(403);
    await request(server)
      .post('/auth/login')
      .type('form')
      .send({ email: 'user@example.com', password: 'Password' })
      .expect(403);
    await request(server)
      .post('/auth/login')
      .set('Origin', 'http://localhost:8080')
      .send({})
      .expect(400);
  });

  it('rejects malformed and oversized JSON bodies', async () => {
    await request(server)
      .post('/auth/login')
      .type('json')
      .send('{')
      .expect(400);
    await request(server)
      .post('/auth/login')
      .send({ password: 'a'.repeat(70000) })
      .expect(413);
  });

  it('enforces the shared authentication rate limit', async () => {
    prisma.$queryRaw.mockResolvedValue([
      { count: 21, expiresAt: new Date(Date.now() + 60000) },
    ]);
    const result = await request(server)
      .post('/auth/login')
      .send({})
      .expect(429);
    expect(result.headers['retry-after']).toBeDefined();
  });

  it('rejects revoked sessions even if the JWT signature is valid', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...user, tokenVersion: 1 });
    await request(server)
      .get('/auth/profile')
      .set('Cookie', cookie)
      .expect(401);
  });

  it('requires OAuth state and an authenticated explicit linking flow', async () => {
    await request(server).get('/auth/google/callback?code=mock').expect(401);
    await request(server)
      .get('/auth/google/callback?state=forged&code=mock')
      .set('Cookie', 'google_oauth_state=forged')
      .expect(401);
    await request(server).get('/auth/google/link').expect(401);
    const result = await request(server).get('/auth/google').expect(302);
    const location = result.headers.location;
    const state = new URL(location).searchParams.get('state');
    expect(state).toBeTruthy();
    const headers = result.headers['set-cookie'] as unknown as string[];
    expect(headers.join(';')).toContain('google_oauth_state=' + state);
    expect(
      app
        .get(JwtService)
        .verify<
          Record<string, unknown>
        >(state!, { audience: 'google-oauth-state' }),
    ).toHaveProperty('nonce');
  });

  it('exposes separate liveness/readiness checks and request IDs', async () => {
    const result = await request(server).get('/health/live').expect(200);
    expect(result.headers['x-request-id']).toMatch(/^[a-f0-9-]{36}$/);
    expect(result.headers['x-powered-by']).toBeUndefined();
    await request(server).get('/health/ready').expect(200);
    prisma.$queryRaw.mockRejectedValue(new Error('private database details'));
    await request(server).get('/health/ready').expect(503);
  });
});
