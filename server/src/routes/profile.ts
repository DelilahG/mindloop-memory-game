import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db.js';
import { authenticate } from '../middleware/auth.js';
import type { Request, Response } from 'express';

const router = Router();

const updateSchema = z.object({
  displayName: z.string().min(2).max(48).optional(),
  avatarColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid hex color').optional(),
}).refine(data => data.displayName !== undefined || data.avatarColor !== undefined, {
  message: 'At least one field must be provided',
});

function buildPublicProfile(row: Record<string, unknown>) {
  const gamesPlayed = row.games_played as number;
  const gamesWon = row.games_won as number;
  return {
    id: row.id as string,
    username: row.username as string,
    displayName: row.display_name as string,
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

router.get('/:id', authenticate, async (req: Request, res: Response) => {
  const result = await query(
    `SELECT id, username, display_name, avatar_color, elo_rating,
            games_played, games_won, total_pairs, created_at
     FROM players WHERE id = $1`,
    [req.params.id]
  );

  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Player not found' });
    return;
  }

  res.json({ player: buildPublicProfile(result.rows[0]) });
});

router.patch('/me', authenticate, async (req: Request, res: Response) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0].message });
    return;
  }

  const sets: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (parsed.data.displayName !== undefined) {
    sets.push(`display_name = $${idx++}`);
    values.push(parsed.data.displayName);
  }
  if (parsed.data.avatarColor !== undefined) {
    sets.push(`avatar_color = $${idx++}`);
    values.push(parsed.data.avatarColor);
  }
  sets.push(`updated_at = NOW()`);
  values.push(req.playerId);

  const result = await query(
    `UPDATE players SET ${sets.join(', ')} WHERE id = $${idx}
     RETURNING id, username, display_name, avatar_color, elo_rating,
               games_played, games_won, total_pairs, created_at`,
    values
  );

  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Player not found' });
    return;
  }

  res.json({ player: buildPublicProfile(result.rows[0]) });
});

export default router;
