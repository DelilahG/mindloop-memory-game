import 'dotenv/config';
import { createServer } from 'node:http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { Server } from 'socket.io';
import { config } from './config.js';
import authRouter from './routes/auth.js';
import profileRouter from './routes/profile.js';
import leaderboardRouter from './routes/leaderboard.js';
import matchesRouter from './routes/matches.js';
import { setupSocketHandlers } from './socket/handlers.js';
import type { ClientToServerEvents, ServerToClientEvents } from '@mindloop/shared';

const app = express();
const httpServer = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: config.clientOrigin,
    credentials: true,
  },
});

app.use(helmet());
app.use(cors({ origin: config.clientOrigin, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRouter);
app.use('/api/profile', profileRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/matches', matchesRouter);

setupSocketHandlers(io);

if (process.env['NODE_ENV'] !== 'test') {
  httpServer.listen(config.port, () => {
    console.log(`MindLoop server running on port ${config.port}`);
  });
}

export { app, httpServer, io };
