import { Router } from 'express';
import { query } from '../db.js';
import type { Request, Response } from 'express';
import type { LeaderboardEntry } from '@mindloop/shared';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const offset = (page - 1) * limit;

  const countResult = await query('SELECT COUNT(*) as total FROM players');
  const total = Number(countResult.rows[0].total);

  const result = await query(
    `SELECT id, username, display_name, avatar_color, elo_rating,
            games_played, games_won
     FROM players
     ORDER BY elo_rating DESC, games_won DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  const entries: LeaderboardEntry[] = result.rows.map((row: Record<string, unknown>, i: number) => ({
    rank: offset + i + 1,
    id: row.id as string,
    username: row.username as string,
    displayName: row.display_name as string,
    avatarColor: row.avatar_color as string,
    eloRating: row.elo_rating as number,
    gamesPlayed: row.games_played as number,
    gamesWon: row.games_won as number,
  }));

  res.json({
    entries,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
});

export default router;
