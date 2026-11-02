import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/index.js';
import { pool, query } from '../src/db.js';

async function cleanDb() {
  await query('DELETE FROM refresh_tokens');
  await query('DELETE FROM matches');
  await query('DELETE FROM players');
}

let server: ReturnType<typeof app.listen>;

beforeAll(async () => {
  server = app.listen(0);
  await cleanDb();
});

afterAll(async () => {
  await cleanDb();
  server.close();
  await pool.end();
});

beforeEach(async () => {
  await cleanDb();
});

describe('POST /api/auth/register', () => {
  it('creates a new player', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'alice', email: 'alice@test.com', password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.player.username).toBe('alice');
    expect(res.body.player.displayName).toBe('alice');
    expect(res.body.player.eloRating).toBe(1000);
    expect(res.body.player.stats.gamesPlayed).toBe(0);
    expect(res.body.player.email).toBe('alice@test.com');
    // Password should NOT be in response
    expect(res.body.player.password).toBeUndefined();
    expect(res.body.player.password_hash).toBeUndefined();
  });

  it('sets refresh cookie', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'bob', email: 'bob@test.com', password: 'password123' });

    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    const refreshCookie = (Array.isArray(cookies) ? cookies : [cookies])
      .find((c: string) => c.startsWith('refreshToken='));
    expect(refreshCookie).toBeDefined();
    expect(refreshCookie).toContain('HttpOnly');
    expect(refreshCookie).toContain('Path=/api/auth/refresh');
  });

  it('rejects duplicate username', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ username: 'alice', email: 'a@test.com', password: 'password123' });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'alice', email: 'b@test.com', password: 'password123' });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('Username');
  });

  it('rejects duplicate email', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ username: 'alice', email: 'same@test.com', password: 'password123' });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'bob', email: 'same@test.com', password: 'password123' });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('Email');
  });

  it('validates username length', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'ab', email: 'a@test.com', password: 'password123' });
    expect(res.status).toBe(400);
  });

  it('validates username characters', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'a b c', email: 'a@test.com', password: 'password123' });
    expect(res.status).toBe(400);
  });

  it('validates password length', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'alice', email: 'a@test.com', password: 'short' });
    expect(res.status).toBe(400);
  });

  it('validates email format', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'alice', email: 'notanemail', password: 'password123' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ username: 'alice', email: 'alice@test.com', password: 'password123' });
  });

  it('logs in with username', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ login: 'alice', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.player.username).toBe('alice');
  });

  it('logs in with email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ login: 'alice@test.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
  });

  it('rejects wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ login: 'alice', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Invalid');
  });

  it('rejects nonexistent user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ login: 'nobody', password: 'password123' });

    expect(res.status).toBe(401);
  });

  it('is case-insensitive for username', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ login: 'ALICE', password: 'password123' });

    expect(res.status).toBe(200);
  });
});

describe('POST /api/auth/refresh', () => {
  it('rotates refresh token', async () => {
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ username: 'alice', email: 'a@test.com', password: 'password123' });

    const cookies = reg.headers['set-cookie'];
    const refreshCookie = (Array.isArray(cookies) ? cookies : [cookies])
      .find((c: string) => c.startsWith('refreshToken='));

    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', refreshCookie!);

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.player.username).toBe('alice');

    // Old token should be invalidated
    const res2 = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', refreshCookie!);
    expect(res2.status).toBe(401);
  });

  it('rejects missing cookie', async () => {
    const res = await request(app).post('/api/auth/refresh');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  it('returns current player with valid token', async () => {
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ username: 'alice', email: 'a@test.com', password: 'password123' });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${reg.body.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.player.username).toBe('alice');
  });

  it('rejects missing token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('rejects invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid.token.here');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/logout', () => {
  it('clears refresh cookie', async () => {
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ username: 'alice', email: 'a@test.com', password: 'password123' });

    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${reg.body.accessToken}`);

    expect(res.status).toBe(200);
  });
});

describe('GET /api/leaderboard', () => {
  it('returns empty leaderboard', async () => {
    const res = await request(app).get('/api/leaderboard');
    expect(res.status).toBe(200);
    expect(res.body.entries).toEqual([]);
    expect(res.body.total).toBe(0);
  });

  it('returns players sorted by elo', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ username: 'alice', email: 'a@test.com', password: 'password123' });
    await request(app)
      .post('/api/auth/register')
      .send({ username: 'bob', email: 'b@test.com', password: 'password123' });

    // Bump alice's elo
    await query("UPDATE players SET elo_rating = 1200 WHERE username = 'alice'");

    const res = await request(app).get('/api/leaderboard');
    expect(res.status).toBe(200);
    expect(res.body.entries.length).toBe(2);
    expect(res.body.entries[0].username).toBe('alice');
    expect(res.body.entries[0].rank).toBe(1);
    expect(res.body.entries[1].rank).toBe(2);
  });

  it('does not require auth', async () => {
    const res = await request(app).get('/api/leaderboard');
    expect(res.status).toBe(200);
  });

  it('respects pagination', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ username: 'alice', email: 'a@test.com', password: 'password123' });
    await request(app)
      .post('/api/auth/register')
      .send({ username: 'bob', email: 'b@test.com', password: 'password123' });

    const res = await request(app).get('/api/leaderboard?page=1&limit=1');
    expect(res.body.entries.length).toBe(1);
    expect(res.body.total).toBe(2);
    expect(res.body.totalPages).toBe(2);
  });
});

describe('PATCH /api/profile/me', () => {
  it('updates display name', async () => {
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ username: 'alice', email: 'a@test.com', password: 'password123' });

    const res = await request(app)
      .patch('/api/profile/me')
      .set('Authorization', `Bearer ${reg.body.accessToken}`)
      .send({ displayName: 'Alice Wonder' });

    expect(res.status).toBe(200);
    expect(res.body.player.displayName).toBe('Alice Wonder');
  });

  it('updates avatar color', async () => {
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ username: 'alice', email: 'a@test.com', password: 'password123' });

    const res = await request(app)
      .patch('/api/profile/me')
      .set('Authorization', `Bearer ${reg.body.accessToken}`)
      .send({ avatarColor: '#ff5500' });

    expect(res.status).toBe(200);
    expect(res.body.player.avatarColor).toBe('#ff5500');
  });

  it('rejects invalid hex color', async () => {
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ username: 'alice', email: 'a@test.com', password: 'password123' });

    const res = await request(app)
      .patch('/api/profile/me')
      .set('Authorization', `Bearer ${reg.body.accessToken}`)
      .send({ avatarColor: 'not-a-color' });

    expect(res.status).toBe(400);
  });

  it('requires auth', async () => {
    const res = await request(app)
      .patch('/api/profile/me')
      .send({ displayName: 'Hacker' });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/matches', () => {
  it('requires auth', async () => {
    const res = await request(app).get('/api/matches');
    expect(res.status).toBe(401);
  });

  it('returns empty list for new player', async () => {
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ username: 'alice', email: 'a@test.com', password: 'password123' });

    const res = await request(app)
      .get('/api/matches')
      .set('Authorization', `Bearer ${reg.body.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.matches).toEqual([]);
    expect(res.body.total).toBe(0);
  });
});
