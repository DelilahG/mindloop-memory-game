import 'dotenv/config';

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

export const config = {
  port: parseInt(process.env['PORT'] ?? '3001', 10),
  databaseUrl: required('DATABASE_URL'),
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env['JWT_EXPIRES_IN'] ?? '15m',
  refreshTokenDays: parseInt(process.env['REFRESH_TOKEN_DAYS'] ?? '7', 10),
  clientOrigin: process.env['CLIENT_ORIGIN'] ?? 'http://localhost:5173',
  nodeEnv: process.env['NODE_ENV'] ?? 'development',
} as const;
