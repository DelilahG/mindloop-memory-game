import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { z } from 'zod';
import { rateLimit } from 'express-rate-limit';
import { query } from '../db.js';
import { config } from '../config.js';
import { authenticate } from '../middleware/auth.js';
import type { Request, Response } from 'express';
import type { PlayerProfile } from '@mindloop/shared';

const router = Router();

// --- Schemas ---

const registerSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(24, 'Username must be at most 24 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username may only contain letters, numbers and underscores'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const loginSchema = z.object({
  login: z.string().min(1, 'Username or email is required'),
  password: z.string().min(1, 'Password is required'),
});

// --- Rate limiters ---

const skipInTest = () => config.nodeEnv === 'test';

const registerLimiter = rateLimit({
  windowMs: 60_000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many registration attempts. Try again in a minute.' },
  skip: skipInTest,
});

const loginLimiter = rateLimit({
  windowMs: 60_000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Try again in a minute.' },
  skip: skipInTest,
});

// --- Token helpers ---

function generateAccessToken(playerId: string): string {
  return jwt.sign({ sub: playerId }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as `${number}${'s' | 'm' | 'h' | 'd'}`,
  });
}

async function generateRefreshToken(playerId: string): Promise<string> {
  const raw = crypto.randomBytes(64).toString('hex');
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  const expiresAt = new Date(Date.now() + config.refreshTokenDays * 86_400_000);

  await query(
    'INSERT INTO refresh_tokens (player_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [playerId, hash, expiresAt.toISOString()]
  );

  return raw;
}

function setRefreshCookie(res: Response, token: string): void {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.nodeEnv === 'production',
    path: '/api/auth/refresh',
    maxAge: config.refreshTokenDays * 86_400_000,
  });
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.nodeEnv === 'production',
    path: '/api/auth/refresh',
  });
}

function buildProfile(row: Record<string, unknown>): PlayerProfile {
  const gamesPlayed = row.games_played as number;
  const gamesWon = row.games_won as number;
  return {
    id: row.id as string,
    username: row.username as string,
    displayName: row.display_name as string,
    email: row.email as string,
    avatarColor: row.avatar_color as string,
    eloRating: row.elo_rating as number,
    createdAt: (row.created_at as Date).toISOString(),
    stats: {
      gamesPlayed,
      gamesWon,
      winRate: gamesPlayed > 0 ? Math.round((gamesWon / gamesPlayed) * 100) : 0,
      totalPairs: row.total_pairs as number,
      eloRating: row.elo_rating as number,
    },
  };
}

// --- Routes ---

router.post('/register', registerLimiter, async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0].message });
    return;
  }

  const { username, email, password } = parsed.data;

  const existingUsername = await query(
    'SELECT id FROM players WHERE LOWER(username) = LOWER($1)',
    [username]
  );
  if (existingUsername.rows.length > 0) {
    res.status(409).json({ error: 'Username already taken' });
    return;
  }

  const existingEmail = await query(
    'SELECT id FROM players WHERE LOWER(email) = LOWER($1)',
    [email]
  );
  if (existingEmail.rows.length > 0) {
    res.status(409).json({ error: 'Email already registered' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const result = await query(
    `INSERT INTO players (username, display_name, email, password_hash)
     VALUES ($1, $1, $2, $3)
     RETURNING id, username, display_name, email, avatar_color, elo_rating,
               games_played, games_won, total_pairs, created_at`,
    [username, email, passwordHash]
  );

  const player = result.rows[0];
  const accessToken = generateAccessToken(player.id);
  const refreshToken = await generateRefreshToken(player.id);

  setRefreshCookie(res, refreshToken);
  res.status(201).json({
    accessToken,
    player: buildProfile(player),
  });
});

router.post('/login', loginLimiter, async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0].message });
    return;
  }

  const { login, password } = parsed.data;

  const result = await query(
    `SELECT id, username, display_name, email, password_hash, avatar_color,
            elo_rating, games_played, games_won, total_pairs, created_at
     FROM players
     WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($1)`,
    [login]
  );

  if (result.rows.length === 0) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const player = result.rows[0];
  const valid = await bcrypt.compare(password, player.password_hash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const accessToken = generateAccessToken(player.id);
  const refreshToken = await generateRefreshToken(player.id);

  setRefreshCookie(res, refreshToken);
  res.json({
    accessToken,
    player: buildProfile(player),
  });
});

router.post('/refresh', async (req: Request, res: Response) => {
  const token = req.cookies?.refreshToken;
  if (!token) {
    res.status(401).json({ error: 'No refresh token' });
    return;
  }

  const hash = crypto.createHash('sha256').update(token).digest('hex');

  const result = await query(
    'SELECT id, player_id, expires_at FROM refresh_tokens WHERE token_hash = $1',
    [hash]
  );

  if (result.rows.length === 0) {
    clearRefreshCookie(res);
    res.status(401).json({ error: 'Invalid refresh token' });
    return;
  }

  const stored = result.rows[0];

  // Delete the used token (rotation)
  await query('DELETE FROM refresh_tokens WHERE id = $1', [stored.id]);

  if (new Date(stored.expires_at) < new Date()) {
    clearRefreshCookie(res);
    res.status(401).json({ error: 'Refresh token expired' });
    return;
  }

  const playerId = stored.player_id as string;
  const accessToken = generateAccessToken(playerId);
  const newRefreshToken = await generateRefreshToken(playerId);

  // Fetch player profile for the response
  const playerResult = await query(
    `SELECT id, username, display_name, email, avatar_color, elo_rating,
            games_played, games_won, total_pairs, created_at
     FROM players WHERE id = $1`,
    [playerId]
  );

  setRefreshCookie(res, newRefreshToken);

  if (playerResult.rows.length === 0) {
    res.status(401).json({ error: 'Player not found' });
    return;
  }

  res.json({
    accessToken,
    player: buildProfile(playerResult.rows[0]),
  });
});

router.post('/logout', authenticate, async (req: Request, res: Response) => {
  const token = req.cookies?.refreshToken;
  if (token) {
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    await query('DELETE FROM refresh_tokens WHERE token_hash = $1', [hash]);
  }

  clearRefreshCookie(res);
  res.json({ ok: true });
});

router.get('/me', authenticate, async (req: Request, res: Response) => {
  const result = await query(
    `SELECT id, username, display_name, email, avatar_color, elo_rating,
            games_played, games_won, total_pairs, created_at
     FROM players WHERE id = $1`,
    [req.playerId]
  );

  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Player not found' });
    return;
  }

  res.json({ player: buildProfile(result.rows[0]) });
});

export default router;
