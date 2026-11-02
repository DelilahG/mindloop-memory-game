CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Players
CREATE TABLE players (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username      VARCHAR(24) UNIQUE NOT NULL
                    CHECK (char_length(username) >= 3),
    display_name  VARCHAR(48) NOT NULL,
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    avatar_color  VARCHAR(7) NOT NULL DEFAULT '#a594d0',
    elo_rating    INTEGER NOT NULL DEFAULT 1000,
    games_played  INTEGER NOT NULL DEFAULT 0 CHECK (games_played >= 0),
    games_won     INTEGER NOT NULL DEFAULT 0 CHECK (games_won >= 0),
    total_pairs   INTEGER NOT NULL DEFAULT 0 CHECK (total_pairs >= 0),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_players_elo ON players (elo_rating DESC);
CREATE INDEX idx_players_username ON players (username);

-- Matches
CREATE TABLE matches (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_code       VARCHAR(8),
    difficulty      VARCHAR(10) NOT NULL CHECK (difficulty IN ('easy','medium','hard','expert')),
    player1_id      UUID NOT NULL REFERENCES players(id),
    player2_id      UUID NOT NULL REFERENCES players(id),
    player1_pairs   INTEGER NOT NULL DEFAULT 0 CHECK (player1_pairs >= 0),
    player2_pairs   INTEGER NOT NULL DEFAULT 0 CHECK (player2_pairs >= 0),
    winner_id       UUID REFERENCES players(id),
    is_draw         BOOLEAN NOT NULL DEFAULT FALSE,
    is_forfeit      BOOLEAN NOT NULL DEFAULT FALSE,
    total_moves     INTEGER NOT NULL DEFAULT 0 CHECK (total_moves >= 0),
    duration_secs   INTEGER NOT NULL DEFAULT 0 CHECK (duration_secs >= 0),
    player1_elo_change INTEGER NOT NULL DEFAULT 0,
    player2_elo_change INTEGER NOT NULL DEFAULT 0,
    started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at     TIMESTAMPTZ
);

CREATE INDEX idx_matches_player1 ON matches (player1_id, finished_at DESC);
CREATE INDEX idx_matches_player2 ON matches (player2_id, finished_at DESC);

-- Refresh tokens
CREATE TABLE refresh_tokens (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id  UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_player ON refresh_tokens (player_id);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens (expires_at);

