Object.assign(process.env, {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://test:test@localhost:5432/vocab_forge_test',
  DIRECT_URL: 'postgresql://test:test@localhost:5432/vocab_forge_test',
  JWT_SECRET: 'test-only-secret-that-is-at-least-32-characters-long',
  FRONTEND_URL: 'http://localhost:8080',
  CORS_ORIGINS: 'http://localhost:8080',
  GOOGLE_CLIENT_ID: 'test-client',
  GOOGLE_CLIENT_SECRET: 'test-secret',
  GOOGLE_CALLBACK_URL: 'http://localhost:3000/auth/google/callback',
  AUTH_RATE_LIMIT: '20',
  AUTH_RATE_WINDOW_SECONDS: '60',
});
