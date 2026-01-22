'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export default function ProfilePage({ params }) {
  const paramsResolved = use(params);
  const username = paramsResolved.username;
  
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch(`${BACKEND_URL}/api/users/${username}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError('User not found');
          } else {
            setError('Failed to load profile');
          }
          return;
        }
        const data = await res.json();
        setProfile(data);
      } catch (err) {
        setError('Failed to connect to server');
      } finally {
        setLoading(false);
      }
    }

    if (username) {
      fetchProfile();
    }
  }, [username]);

  const winRate = profile && (profile.wins + profile.losses) > 0
    ? Math.round((profile.wins / (profile.wins + profile.losses)) * 100)
    : 0;

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </main>
    );
  }

  if (error) {
    return (
      <main style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div className="card" style={{ textAlign: 'center', maxWidth: '400px' }}>
          <h2 style={{ marginBottom: '16px', color: 'var(--danger)' }}>{error}</h2>
          <Link href="/" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            ← Back to Home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '40px 20px'
    }}>
      <div style={{ width: '100%', maxWidth: '600px' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <Link 
            href="/" 
            style={{ 
              color: 'var(--text-secondary)', 
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px'
            }}
          >
            ← Back to Home
          </Link>
          <h1 style={{ fontSize: '36px' }}>
            <span className="gradient-text">{profile.username}</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Member since {new Date(profile.created_at).toLocaleDateString()}
          </p>
        </div>

        {/* Stats */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <h2 style={{ marginBottom: '20px' }}>Statistics</h2>
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-value" style={{ color: 'var(--success)' }}>{profile.wins}</div>
              <div className="stat-label">Wins</div>
            </div>
            <div className="stat-item">
              <div className="stat-value" style={{ color: 'var(--danger)' }}>{profile.losses}</div>
              <div className="stat-label">Losses</div>
            </div>
            <div className="stat-item">
              <div className="stat-value" style={{ color: 'var(--accent-primary)' }}>{winRate}%</div>
              <div className="stat-label">Win Rate</div>
            </div>
          </div>
        </div>

        {/* Recent Games */}
        {profile.recentGames && profile.recentGames.length > 0 && (
          <div className="card">
            <h2 style={{ marginBottom: '20px' }}>Recent Games</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {profile.recentGames.map((game) => {
                const won = game.winner_username === profile.username;
                const opponent = won ? game.loser_username : game.winner_username;
                const myScore = won ? game.winner_rounds : game.loser_rounds;
                const oppScore = won ? game.loser_rounds : game.winner_rounds;

                return (
                  <div 
                    key={game.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '16px',
                      background: 'var(--bg-secondary)',
                      borderRadius: '12px',
                      borderLeft: `4px solid ${won ? 'var(--success)' : 'var(--danger)'}`
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>
                        vs {opponent}
                      </div>
                      <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                        {new Date(game.played_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ 
                        fontWeight: 700, 
                        fontSize: '18px',
                        color: won ? 'var(--success)' : 'var(--danger)'
                      }}>
                        {won ? 'WIN' : 'LOSS'}
                      </div>
                      <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                        {myScore} - {oppScore}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {profile.recentGames && profile.recentGames.length === 0 && (
          <div className="card" style={{ textAlign: 'center' }}>
            <p style={{ color: 'var(--text-secondary)' }}>No games played yet. Start playing to see your history!</p>
          </div>
        )}
      </div>
    </main>
  );
}
