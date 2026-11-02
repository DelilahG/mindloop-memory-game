import { Router } from 'express';
import { query } from '../db.js';
import { authenticate } from '../middleware/auth.js';
import type { Request, Response } from 'express';
import type { MatchSummary, Difficulty } from '@mindloop/shared';

const router = Router();

router.get('/', authenticate, async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const offset = (page - 1) * limit;
  const playerId = req.playerId!;

  const countResult = await query(
    `SELECT COUNT(*) as total FROM matches
     WHERE (player1_id = $1 OR player2_id = $1) AND finished_at IS NOT NULL`,
    [playerId]
  );
  const total = Number(countResult.rows[0].total);

  const result = await query(
    `SELECT m.id, m.difficulty, m.player1_id, m.player2_id,
            m.player1_pairs, m.player2_pairs, m.winner_id, m.is_draw,
            m.is_forfeit, m.total_moves, m.duration_secs, m.finished_at,
            p1.username AS p1_username, p1.display_name AS p1_display_name,
            p2.username AS p2_username, p2.display_name AS p2_display_name
     FROM matches m
     JOIN players p1 ON m.player1_id = p1.id
     JOIN players p2 ON m.player2_id = p2.id
     WHERE (m.player1_id = $1 OR m.player2_id = $1) AND m.finished_at IS NOT NULL
     ORDER BY m.finished_at DESC
     LIMIT $2 OFFSET $3`,
    [playerId, limit, offset]
  );

  const matches: MatchSummary[] = result.rows.map((row: Record<string, unknown>) => {
    const isPlayer1 = row.player1_id === playerId;
    const opponentId = isPlayer1 ? row.player2_id as string : row.player1_id as string;
    const opponentUsername = isPlayer1 ? row.p2_username as string : row.p1_username as string;
    const opponentDisplayName = isPlayer1 ? row.p2_display_name as string : row.p1_display_name as string;
    const myPairs = isPlayer1 ? row.player1_pairs as number : row.player2_pairs as number;
    const opponentPairs = isPlayer1 ? row.player2_pairs as number : row.player1_pairs as number;
    const isDraw = row.is_draw as boolean;
    const winnerId = row.winner_id as string | null;

    let won: boolean | null = null;
    if (isDraw) {
      won = null;
    } else if (winnerId) {
      won = winnerId === playerId;
    }

    return {
      id: row.id as string,
      difficulty: row.difficulty as Difficulty,
      opponent: { id: opponentId, username: opponentUsername, displayName: opponentDisplayName },
      myPairs,
      opponentPairs,
      won,
      isDraw,
      durationSecs: row.duration_secs as number,
      finishedAt: (row.finished_at as Date).toISOString(),
    };
  });

  res.json({
    matches,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
});

router.get('/:id', authenticate, async (req: Request, res: Response) => {
  const playerId = req.playerId!;

  const result = await query(
    `SELECT m.*,
            p1.username AS p1_username, p1.display_name AS p1_display_name,
            p1.avatar_color AS p1_avatar_color,
            p2.username AS p2_username, p2.display_name AS p2_display_name,
            p2.avatar_color AS p2_avatar_color
     FROM matches m
     JOIN players p1 ON m.player1_id = p1.id
     JOIN players p2 ON m.player2_id = p2.id
     WHERE m.id = $1 AND (m.player1_id = $2 OR m.player2_id = $2)`,
    [req.params.id, playerId]
  );

  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Match not found' });
    return;
  }

  const row = result.rows[0];
  const isPlayer1 = row.player1_id === playerId;

  res.json({
    match: {
      id: row.id,
      difficulty: row.difficulty,
      roomCode: row.room_code,
      player1: {
        id: row.player1_id,
        username: row.p1_username,
        displayName: row.p1_display_name,
        avatarColor: row.p1_avatar_color,
        pairs: row.player1_pairs,
        eloChange: row.player1_elo_change,
      },
      player2: {
        id: row.player2_id,
        username: row.p2_username,
        displayName: row.p2_display_name,
        avatarColor: row.p2_avatar_color,
        pairs: row.player2_pairs,
        eloChange: row.player2_elo_change,
      },
      winnerId: row.winner_id,
      isDraw: row.is_draw,
      isForfeit: row.is_forfeit,
      totalMoves: row.total_moves,
      durationSecs: row.duration_secs,
      startedAt: row.started_at.toISOString(),
      finishedAt: row.finished_at?.toISOString() ?? null,
      isPlayer1,
    },
  });
});

export default router;
