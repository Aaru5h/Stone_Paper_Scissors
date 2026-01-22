const express = require('express');
const db = require('../db');

const router = express.Router();

// Create or login user
router.post('/', async (req, res) => {
  try {
    const { username } = req.body;
    
    if (!username || username.trim().length < 2) {
      return res.status(400).json({ error: 'Username must be at least 2 characters' });
    }
    
    if (username.length > 20) {
      return res.status(400).json({ error: 'Username must be 20 characters or less' });
    }

    const user = await db.createUser(username.trim());
    res.json(user);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Get user stats
router.get('/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const user = await db.getUser(username);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get recent games
    const games = await db.getUserGames(user.id);
    
    res.json({
      ...user,
      recentGames: games
    });
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

module.exports = router;
