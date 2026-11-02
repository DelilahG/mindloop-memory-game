import type { Server, Socket } from 'socket.io';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  PublicPlayer,
} from '@mindloop/shared';
import { DIFFICULTY_CONFIG } from '@mindloop/shared';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { query, pool } from '../db.js';
import { Room } from '../game/Room.js';
import { MatchmakingQueue } from '../game/matchmaking.js';
import { nanoid } from 'nanoid';

type TypedIO = Server<ClientToServerEvents, ServerToClientEvents>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents> & { playerId: string };

const rooms = new Map<string, Room>();
const playerRooms = new Map<string, string>();
const matchmaking = new MatchmakingQueue();
let matchInterval: ReturnType<typeof setInterval> | null = null;

function generateRoomCode(): string {
  return nanoid(6).toUpperCase();
}

async function getPublicPlayer(playerId: string): Promise<PublicPlayer | null> {
  const result = await query(
    'SELECT id, username, display_name, avatar_color, elo_rating FROM players WHERE id = $1',
    [playerId]
  );
  if (result.rows.length === 0) return null;
  const r = result.rows[0];
  return { id: r.id, username: r.username, displayName: r.display_name, avatarColor: r.avatar_color, eloRating: r.elo_rating };
}

function findSocketByPlayerId(io: TypedIO, playerId: string): TypedSocket | undefined {
  for (const s of io.sockets.sockets.values()) {
    if ((s as TypedSocket).playerId === playerId) return s as TypedSocket;
  }
  return undefined;
}

function emitGameStart(socket: TypedSocket, room: Room, myId: string) {
  const engine = room.engine!;
  const oppId = engine.players.find(id => id !== myId)!;
  const opp = room.players.get(oppId)!;
  const dc = DIFFICULTY_CONFIG[room.difficulty];
  socket.emit('game:start', {
    difficulty: room.difficulty,
    cols: dc.cols,
    totalPairs: dc.pairs,
    totalCards: dc.pairs * 2,
    yourTurn: engine.getCurrentPlayerId() === myId,
    opponent: opp,
    scores: { you: 0, opponent: 0 },
  });
}

async function computeElo(elo1: number, elo2: number, result1: number) {
  const k = 32;
  const expected1 = 1 / (1 + Math.pow(10, (elo2 - elo1) / 400));
  const change1 = Math.round(k * (result1 - expected1));
  return { change1, change2: -change1 };
}

async function saveMatchResult(room: Room): Promise<{ matchId: string; eloChanges: Record<string, number> }> {
  const engine = room.engine!;
  const [p1, p2] = engine.players;
  const scores = Object.fromEntries(engine.scores);
  const winnerId = engine.getWinnerId();
  const isDraw = engine.isDraw();

  const [[r1], [r2]] = await Promise.all([
    query('SELECT elo_rating FROM players WHERE id = $1', [p1]).then(r => r.rows),
    query('SELECT elo_rating FROM players WHERE id = $1', [p2]).then(r => r.rows),
  ]);

  const actual1 = isDraw ? 0.5 : winnerId === p1 ? 1 : 0;
  const { change1, change2 } = await computeElo(r1.elo_rating, r2.elo_rating, actual1);

  const conn = await pool.connect();
  try {
    await conn.query('BEGIN');
    const res = await conn.query(
      `INSERT INTO matches (room_code,difficulty,player1_id,player2_id,player1_pairs,player2_pairs,winner_id,is_draw,is_forfeit,total_moves,duration_secs,player1_elo_change,player2_elo_change,finished_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,false,$9,$10,$11,$12,NOW()) RETURNING id`,
      [room.code, room.difficulty, p1, p2, scores[p1] ?? 0, scores[p2] ?? 0, winnerId, isDraw, engine.totalMoves, engine.getDuration(), change1, change2]
    );
    await conn.query(
      'UPDATE players SET elo_rating=GREATEST(0,elo_rating+$2), games_played=games_played+1, games_won=games_won+$3, total_pairs=total_pairs+$4, updated_at=NOW() WHERE id=$1',
      [p1, change1, winnerId === p1 ? 1 : 0, scores[p1] ?? 0]
    );
    await conn.query(
      'UPDATE players SET elo_rating=GREATEST(0,elo_rating+$2), games_played=games_played+1, games_won=games_won+$3, total_pairs=total_pairs+$4, updated_at=NOW() WHERE id=$1',
      [p2, change2, winnerId === p2 ? 1 : 0, scores[p2] ?? 0]
    );
    await conn.query('COMMIT');
    return { matchId: res.rows[0].id, eloChanges: { [p1]: change1, [p2]: change2 } };
  } catch (err) {
    await conn.query('ROLLBACK');
    throw err;
  } finally {
    conn.release();
  }
}

async function saveForfeitResult(room: Room, winnerId: string): Promise<{ matchId: string; eloChanges: Record<string, number> }> {
  const engine = room.engine!;
  const [p1, p2] = engine.players;
  const loserId = p1 === winnerId ? p2 : p1;
  const scores = Object.fromEntries(engine.scores);

  const [[rW], [rL]] = await Promise.all([
    query('SELECT elo_rating FROM players WHERE id = $1', [winnerId]).then(r => r.rows),
    query('SELECT elo_rating FROM players WHERE id = $1', [loserId]).then(r => r.rows),
  ]);

  const { change1: changeW, change2: changeL } = await computeElo(rW.elo_rating, rL.elo_rating, 1);
  const p1Change = p1 === winnerId ? changeW : changeL;
  const p2Change = p2 === winnerId ? changeW : changeL;

  const conn = await pool.connect();
  try {
    await conn.query('BEGIN');
    const res = await conn.query(
      `INSERT INTO matches (room_code,difficulty,player1_id,player2_id,player1_pairs,player2_pairs,winner_id,is_draw,is_forfeit,total_moves,duration_secs,player1_elo_change,player2_elo_change,finished_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,false,true,$8,$9,$10,$11,NOW()) RETURNING id`,
      [room.code, room.difficulty, p1, p2, scores[p1] ?? 0, scores[p2] ?? 0, winnerId, engine.totalMoves, engine.getDuration(), p1Change, p2Change]
    );
    await conn.query('UPDATE players SET elo_rating=GREATEST(0,elo_rating+$2), games_played=games_played+1, games_won=games_won+1, total_pairs=total_pairs+$3, updated_at=NOW() WHERE id=$1', [winnerId, changeW, scores[winnerId] ?? 0]);
    await conn.query('UPDATE players SET elo_rating=GREATEST(0,elo_rating+$2), games_played=games_played+1, total_pairs=total_pairs+$3, updated_at=NOW() WHERE id=$1', [loserId, changeL, scores[loserId] ?? 0]);
    await conn.query('COMMIT');
    return { matchId: res.rows[0].id, eloChanges: { [winnerId]: changeW, [loserId]: changeL } };
  } catch (err) {
    await conn.query('ROLLBACK');
    throw err;
  } finally {
    conn.release();
  }
}

function cleanupRoom(code: string) {
  const room = rooms.get(code);
  if (!room) return;
  room.finish();
  rooms.delete(code);
  for (const pid of room.getPlayerIds()) playerRooms.delete(pid);
}

function startMatchmakingLoop(io: TypedIO) {
  if (matchInterval) return;
  matchInterval = setInterval(() => {
    for (const diff of ['easy', 'medium', 'hard', 'expert'] as const) {
      const pair = matchmaking.findMatch(diff);
      if (!pair) continue;
      const [e1, e2] = pair;

      (async () => {
        const p1 = await getPublicPlayer(e1.playerId);
        const p2 = await getPublicPlayer(e2.playerId);
        const s1 = io.sockets.sockets.get(e1.socketId);
        const s2 = io.sockets.sockets.get(e2.socketId);
        if (!p1 || !p2 || !s1 || !s2) return;

        const code = generateRoomCode();
        const room = new Room(code, diff, p1);
        room.addPlayer(p2);
        rooms.set(code, room);
        playerRooms.set(p1.id, code);
        playerRooms.set(p2.id, code);
        s1.join(code);
        s2.join(code);

        s1.emit('matchmaking:matched', { roomCode: code, opponent: p2 });
        s2.emit('matchmaking:matched', { roomCode: code, opponent: p1 });

        const engine = room.start();
        emitGameStart(s1 as TypedSocket, room, p1.id);
        emitGameStart(s2 as TypedSocket, room, p2.id);
        void engine;
      })().catch(console.error);
    }
  }, 3000);
}

export function setupSocketHandlers(io: TypedIO) {
  startMatchmakingLoop(io);

  io.use((socket, next) => {
    const token = socket.handshake.auth.token as string | undefined;
    if (!token) return next(new Error('Authentication required'));
    try {
      const payload = jwt.verify(token, config.jwtSecret) as { sub: string };
      (socket as TypedSocket).playerId = payload.sub;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (rawSocket) => {
    const socket = rawSocket as TypedSocket;
    const playerId = socket.playerId;

    // Reconnection: check if player was in a game
    const existingCode = playerRooms.get(playerId);
    if (existingCode) {
      const room = rooms.get(existingCode);
      if (room && room.state === 'playing' && room.engine) {
        socket.join(existingCode);
        room.handleReconnect(playerId);
        socket.to(existingCode).emit('game:opponent-reconnected');

        const engine = room.engine;
        const oppId = engine.players.find(id => id !== playerId)!;
        const opp = room.players.get(oppId)!;
        const dc = DIFFICULTY_CONFIG[room.difficulty];

        socket.emit('game:state-restored', {
          difficulty: room.difficulty,
          cols: dc.cols,
          totalPairs: dc.pairs,
          totalCards: dc.pairs * 2,
          yourTurn: engine.getCurrentPlayerId() === playerId,
          opponent: opp,
          scores: Object.fromEntries(engine.scores),
          revealedCards: engine.getRevealedCards(),
          matchedCards: engine.getMatchedIndices(),
          currentFlips: engine.firstFlip !== null
            ? [{ index: engine.firstFlip, symbol: engine.deck[engine.firstFlip] }]
            : [],
        });
      }
    }

    socket.on('room:create', async ({ difficulty }) => {
      if (playerRooms.has(playerId)) { socket.emit('room:error', { message: 'Already in a room' }); return; }
      const player = await getPublicPlayer(playerId);
      if (!player) { socket.emit('room:error', { message: 'Player not found' }); return; }
      const code = generateRoomCode();
      const room = new Room(code, difficulty, player);
      rooms.set(code, room);
      playerRooms.set(playerId, code);
      socket.join(code);
      socket.emit('room:created', { roomCode: code, difficulty });
    });

    socket.on('room:join', async ({ code }) => {
      if (playerRooms.has(playerId)) { socket.emit('room:error', { message: 'Already in a room' }); return; }
      const normalized = code.toUpperCase().trim();
      const room = rooms.get(normalized);
      if (!room) { socket.emit('room:error', { message: 'Room not found' }); return; }
      if (room.state !== 'waiting') { socket.emit('room:error', { message: 'Game already started' }); return; }
      if (room.isFull()) { socket.emit('room:error', { message: 'Room is full' }); return; }

      const player = await getPublicPlayer(playerId);
      if (!player) { socket.emit('room:error', { message: 'Player not found' }); return; }
      room.addPlayer(player);
      playerRooms.set(playerId, normalized);
      socket.join(normalized);

      io.to(normalized).emit('room:joined', {
        roomCode: normalized,
        difficulty: room.difficulty,
        players: Array.from(room.players.values()),
        isReady: room.isFull(),
      });

      if (room.isFull()) {
        room.start();
        for (const pid of room.getPlayerIds()) {
          const ps = findSocketByPlayerId(io, pid);
          if (ps) emitGameStart(ps, room, pid);
        }
      }
    });

    socket.on('matchmaking:join', async ({ difficulty }) => {
      if (playerRooms.has(playerId)) { socket.emit('room:error', { message: 'Already in a room' }); return; }
      if (matchmaking.has(playerId)) return;
      const player = await getPublicPlayer(playerId);
      if (!player) return;
      matchmaking.add({ playerId, socketId: socket.id, difficulty, eloRating: player.eloRating, joinedAt: Date.now() });
      socket.emit('matchmaking:queued');
    });

    socket.on('matchmaking:leave', () => { matchmaking.remove(playerId); });

    socket.on('game:flip', ({ cardIndex }) => {
      const roomCode = playerRooms.get(playerId);
      if (!roomCode) return;
      const room = rooms.get(roomCode);
      if (!room || room.state !== 'playing' || !room.engine) return;

      const result = room.engine.flipCard(playerId, cardIndex);
      if (result.type === 'error') return;

      if (result.type === 'revealed') {
        io.to(roomCode).emit('game:card-revealed', { cardIndex: result.cardIndex, symbol: result.symbol, playerId });
      } else if (result.type === 'match') {
        io.to(roomCode).emit('game:card-revealed', { cardIndex: result.card2, symbol: result.symbol, playerId });
        setTimeout(() => {
          io.to(roomCode).emit('game:match-found', { card1: result.card1, card2: result.card2, symbol: result.symbol, playerId, scores: result.scores });
          if (room.engine!.isComplete()) {
            saveMatchResult(room).then(({ matchId, eloChanges }) => {
              const engine = room.engine!;
              io.to(roomCode).emit('game:over', { winnerId: engine.getWinnerId(), isDraw: engine.isDraw(), scores: Object.fromEntries(engine.scores), matchId, eloChanges });
              cleanupRoom(roomCode);
            }).catch(console.error);
          }
        }, 600);
      } else if (result.type === 'mismatch') {
        io.to(roomCode).emit('game:card-revealed', { cardIndex: result.card2, symbol: result.symbol2, playerId });
        setTimeout(() => {
          io.to(roomCode).emit('game:mismatch', { card1: result.card1, card2: result.card2, symbol1: result.symbol1, symbol2: result.symbol2, nextTurnPlayerId: result.nextTurnPlayerId });
          io.to(roomCode).emit('game:turn-change', { activePlayerId: result.nextTurnPlayerId });
        }, 1000);
      }
    });

    socket.on('disconnect', () => {
      matchmaking.remove(playerId);
      const roomCode = playerRooms.get(playerId);
      if (!roomCode) return;
      const room = rooms.get(roomCode);
      if (!room) return;

      if (room.state === 'waiting') {
        room.removePlayer(playerId);
        playerRooms.delete(playerId);
        if (room.players.size === 0) rooms.delete(roomCode);
        return;
      }

      if (room.state === 'playing') {
        socket.to(roomCode).emit('game:opponent-disconnected', { timeoutSecs: Room.RECONNECT_TIMEOUT });
        room.handleDisconnect(playerId, Room.RECONNECT_TIMEOUT, () => {
          const winnerId = room.engine!.players.find(id => id !== playerId)!;
          saveForfeitResult(room, winnerId).then(({ matchId, eloChanges }) => {
            io.to(roomCode).emit('game:forfeited', { winnerId });
            io.to(roomCode).emit('game:over', { winnerId, isDraw: false, scores: Object.fromEntries(room.engine!.scores), matchId, eloChanges });
            cleanupRoom(roomCode);
          }).catch(console.error);
        });
      }
    });
  });
}
