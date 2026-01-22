const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Initialize database tables
async function initializeDatabase() {
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schema);
    console.log('✅ Database tables initialized');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  }
}

// User operations
async function createUser(username) {
  const result = await pool.query(
    'INSERT INTO users (username) VALUES ($1) ON CONFLICT (username) DO UPDATE SET username = $1 RETURNING *',
    [username]
  );
  return result.rows[0];
}

async function getUser(username) {
  const result = await pool.query(
    'SELECT * FROM users WHERE username = $1',
    [username]
  );
  return result.rows[0];
}

async function getUserById(id) {
  const result = await pool.query(
    'SELECT * FROM users WHERE id = $1',
    [id]
  );
  return result.rows[0];
}

async function updateUserStats(winnerId, loserId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE users SET wins = wins + 1 WHERE id = $1', [winnerId]);
    await client.query('UPDATE users SET losses = losses + 1 WHERE id = $1', [loserId]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function recordGame(winnerId, loserId, winnerRounds, loserRounds, totalRounds) {
  const result = await pool.query(
    `INSERT INTO games (winner_id, loser_id, winner_rounds, loser_rounds, total_rounds) 
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [winnerId, loserId, winnerRounds, loserRounds, totalRounds]
  );
  return result.rows[0];
}

async function getUserGames(userId) {
  const result = await pool.query(
    `SELECT g.*, 
            w.username as winner_username, 
            l.username as loser_username 
     FROM games g
     JOIN users w ON g.winner_id = w.id
     JOIN users l ON g.loser_id = l.id
     WHERE g.winner_id = $1 OR g.loser_id = $1
     ORDER BY g.played_at DESC
     LIMIT 10`,
    [userId]
  );
  return result.rows;
}

module.exports = {
  pool,
  initializeDatabase,
  createUser,
  getUser,
  getUserById,
  updateUserStats,
  recordGame,
  getUserGames
};
