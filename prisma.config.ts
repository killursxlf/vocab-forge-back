import 'dotenv/config';
import { defineConfig } from 'prisma/config';

if (process.env.NODE_ENV === 'production' && !process.env.DIRECT_URL) {
  throw new Error(
    'DIRECT_URL is required for production migrations and admin commands',
  );
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  engine: 'classic',
  datasource: {
    url:
      process.env.DIRECT_URL ??
      process.env.DATABASE_URL ??
      'postgresql://build:build@localhost:5432/build',
  },
});
