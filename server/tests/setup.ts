import 'dotenv/config';

process.env['JWT_SECRET'] ??= 'test-jwt-secret-for-vitest-only-not-production';
process.env['DATABASE_URL'] ??= 'postgresql://postgres:YOUR_PASSWORD@localhost:5432/mindloop';
process.env['NODE_ENV'] = 'test';
