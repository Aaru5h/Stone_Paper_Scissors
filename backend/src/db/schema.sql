-- Users table for player profiles
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    wins INT DEFAULT 0,
    losses INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Games history table
CREATE TABLE IF NOT EXISTS games (
    id SERIAL PRIMARY KEY,
    winner_id INT REFERENCES users(id),
    loser_id INT REFERENCES users(id),
    winner_rounds INT,
    loser_rounds INT,
    total_rounds INT,
    played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster username lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
