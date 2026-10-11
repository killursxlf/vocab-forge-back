import { isIP } from 'node:net';

export function validateEnvironment(input: Record<string, unknown>) {
  const config = { ...input };
  const production = config.NODE_ENV === 'production';
  const number = (key: string, fallback: number, max: number) => {
    const value = Number(config[key] ?? fallback);
    if (!Number.isInteger(value) || value < 1 || value > max) {
      throw new Error(key + ' must be an integer between 1 and ' + max);
    }
    config[key] = value;
  };
  const url = (key: string, protocols: string[]) => {
    try {
      const value = new URL(String(config[key]));
      if (!protocols.includes(value.protocol)) throw new Error();
      return value;
    } catch {
      throw new Error(key + ' must be a valid ' + protocols.join('/') + ' URL');
    }
  };

  url(
    'DATABASE_URL',
    production
      ? ['postgres:', 'postgresql:']
      : ['postgres:', 'postgresql:', 'prisma+postgres:'],
  );
  if (production || config.DIRECT_URL)
    url('DIRECT_URL', ['postgres:', 'postgresql:']);
  if (typeof config.JWT_SECRET !== 'string' || config.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must contain at least 32 characters');
  }
  config.FRONTEND_URL ??= 'http://localhost:8080';
  const frontend = url(
    'FRONTEND_URL',
    production ? ['https:'] : ['http:', 'https:'],
  );
  config.FRONTEND_URL = frontend.origin;
  config.CORS_ORIGINS ??= frontend.origin;
  const origins = String(config.CORS_ORIGINS)
    .split(',')
    .map((origin) => origin.trim());
  if (
    !origins.length ||
    origins.some((origin) => {
      try {
        const value = new URL(origin);
        return (
          value.origin !== origin ||
          (production && value.protocol !== 'https:') ||
          !['http:', 'https:'].includes(value.protocol)
        );
      } catch {
        return true;
      }
    })
  )
    throw new Error('CORS_ORIGINS must contain explicit HTTP(S) origins');
  config.CORS_ORIGINS = origins.join(',');
  if (
    Boolean(config.GOOGLE_CLIENT_ID) !== Boolean(config.GOOGLE_CLIENT_SECRET)
  ) {
    throw new Error(
      'Set both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, or neither',
    );
  }
  config.GOOGLE_CALLBACK_URL ??= 'http://localhost:3000/auth/google/callback';
  if (config.GOOGLE_CLIENT_ID)
    url('GOOGLE_CALLBACK_URL', production ? ['https:'] : ['http:', 'https:']);
  number('PORT', 3000, 65535);
  number('LEARN_STREAK_THRESHOLD', 3, 100);
  number('DOWNGRADE_MISS_THRESHOLD', 3, 100);
  number('AUTH_RATE_LIMIT', 20, 10000);
  number('AUTH_RATE_WINDOW_SECONDS', 60, 3600);
  config.DOWNGRADE_ON_MISS ??= 'true';
  if (!['true', 'false'].includes(String(config.DOWNGRADE_ON_MISS))) {
    throw new Error('DOWNGRADE_ON_MISS must be true or false');
  }
  if (config.TRUST_PROXY) {
    if (typeof config.TRUST_PROXY !== 'string')
      throw new Error('TRUST_PROXY must be a string');
    for (const subnet of config.TRUST_PROXY.split(',')) {
      const [address, prefix] = subnet.trim().split('/');
      const family = isIP(address);
      if (
        !family ||
        (prefix !== undefined &&
          (!/^\d+$/.test(prefix) ||
            Number(prefix) === 0 ||
            Number(prefix) > (family === 4 ? 32 : 128)))
      ) {
        throw new Error(
          'TRUST_PROXY must contain explicit IP addresses or CIDR subnets',
        );
      }
    }
  }
  return config;
}
