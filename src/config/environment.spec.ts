import { validateEnvironment } from './environment';

const base = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/test',
  JWT_SECRET: 'x'.repeat(64),
};

describe('environment validation', () => {
  it('applies bounded numeric defaults', () => {
    expect(validateEnvironment(base)).toMatchObject({
      PORT: 3000,
      AUTH_RATE_LIMIT: 20,
      LEARN_STREAK_THRESHOLD: 3,
    });
  });
  it.each(['0', '-1', 'NaN', '1.5', '101'])(
    'rejects invalid training threshold %s',
    (value) => {
      expect(() =>
        validateEnvironment({ ...base, LEARN_STREAK_THRESHOLD: value }),
      ).toThrow();
    },
  );
  it('requires HTTPS and TCP credentials in production', () => {
    expect(() =>
      validateEnvironment({ ...base, NODE_ENV: 'production' }),
    ).toThrow('DIRECT_URL');
    expect(() =>
      validateEnvironment({
        ...base,
        NODE_ENV: 'production',
        DIRECT_URL: base.DATABASE_URL,
      }),
    ).toThrow('FRONTEND_URL');
    expect(() =>
      validateEnvironment({
        ...base,
        NODE_ENV: 'production',
        DATABASE_URL:
          'prisma+postgres://accelerate.prisma-data.net/?api_key=test',
      }),
    ).toThrow('DATABASE_URL');
  });
  it('rejects wildcard origins, weak secrets and unrestricted proxy trust', () => {
    expect(() =>
      validateEnvironment({ ...base, TRUST_PROXY: '0.0.0.0/0' }),
    ).toThrow();
    expect(() => validateEnvironment({ ...base, CORS_ORIGINS: '*' })).toThrow();
    expect(() =>
      validateEnvironment({ ...base, JWT_SECRET: 'short' }),
    ).toThrow();
    expect(() =>
      validateEnvironment({ ...base, TRUST_PROXY: 'true' }),
    ).toThrow();
  });
});
