process.env.DATABASE_URL ??= 'postgresql://test:test@127.0.0.1:5432/erp_test';
process.env.JWT_SECRET ??= 'test-only-access-secret-at-least-32-characters';
process.env.JWT_REFRESH_SECRET ??=
  'test-only-refresh-secret-at-least-32-characters';
process.env.PRISMA_CONNECT_ON_START = 'false';
