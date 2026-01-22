'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { connectSocket } from '@/lib/socket';

export default function Home() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [mode, setMode] = useState(null); // 'create' | 'join'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreateRoom = async () => {
    if (!username.trim() || username.length < 2) {
      setError('Username must be at least 2 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const socket = connectSocket();

      socket.emit('create-room', { username: username.trim() });

      socket.once('room-created', ({ roomCode, user }) => {
        localStorage.setItem('rps_user', JSON.stringify(user));
        localStorage.setItem('rps_role', 'host');
        router.push(`/game/${roomCode}`);
      });

      socket.once('error', ({ message }) => {
        setError(message);
        setLoading(false);
      });
    } catch (err) {
      setError('Failed to connect to server');
      setLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!username.trim() || username.length < 2) {
      setError('Username must be at least 2 characters');
      return;
    }

    if (!roomCode.trim() || roomCode.length !== 6) {
      setError('Room code must be 6 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const socket = connectSocket();

      socket.emit('join-room', { 
        roomCode: roomCode.trim().toUpperCase(), 
        username: username.trim() 
      });

      socket.once('joined-room', ({ roomCode, user, host }) => {
        localStorage.setItem('rps_user', JSON.stringify(user));
        localStorage.setItem('rps_role', 'guest');
        localStorage.setItem('rps_host', JSON.stringify(host));
        router.push(`/game/${roomCode}`);
      });

      socket.once('error', ({ message }) => {
        setError(message);
        setLoading(false);
      });
    } catch (err) {
      setError('Failed to connect to server');
      setLoading(false);
    }
  };

  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '48px', marginBottom: '8px' }}>
          <span className="gradient-text">Rock Paper Scissors</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '18px' }}>
          Challenge your friends in real-time! 🎮
        </p>
      </div>

      <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
        {!mode ? (
          <>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                Your Name
              </label>
              <input
                type="text"
                className="input"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={20}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button 
                className="btn btn-primary" 
                onClick={() => setMode('create')}
                disabled={!username.trim()}
              >
                🏠 Create Room
              </button>
              <button 
                className="btn btn-secondary" 
                onClick={() => setMode('join')}
                disabled={!username.trim()}
              >
                🚪 Join Room
              </button>
            </div>

            <div style={{ marginTop: '24px', textAlign: 'center' }}>
              <a 
                href={`/profile/${username}`}
                style={{ 
                  color: 'var(--accent-secondary)', 
                  textDecoration: 'none',
                  fontSize: '14px'
                }}
              >
                View your stats →
              </a>
            </div>
          </>
        ) : mode === 'create' ? (
          <>
            <button 
              onClick={() => { setMode(null); setError(''); }}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              ← Back
            </button>

            <h2 style={{ marginBottom: '24px', fontSize: '24px' }}>Create a Room</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
              You&apos;ll get a room code to share with your friend
            </p>

            <button 
              className="btn btn-primary" 
              onClick={handleCreateRoom}
              disabled={loading}
              style={{ width: '100%' }}
            >
              {loading ? <span className="spinner" /> : '🎲 Generate Room Code'}
            </button>
          </>
        ) : (
          <>
            <button 
              onClick={() => { setMode(null); setError(''); }}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              ← Back
            </button>

            <h2 style={{ marginBottom: '24px', fontSize: '24px' }}>Join a Room</h2>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                Room Code
              </label>
              <input
                type="text"
                className="input"
                placeholder="Enter 6-character code"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                maxLength={6}
                style={{ textTransform: 'uppercase', letterSpacing: '4px', textAlign: 'center' }}
              />
            </div>

            <button 
              className="btn btn-primary" 
              onClick={handleJoinRoom}
              disabled={loading || roomCode.length !== 6}
              style={{ width: '100%' }}
            >
              {loading ? <span className="spinner" /> : '🚀 Join Game'}
            </button>
          </>
        )}

        {error && (
          <div style={{ 
            marginTop: '16px', 
            padding: '12px', 
            background: 'rgba(239, 68, 68, 0.1)', 
            borderRadius: '8px',
            color: 'var(--danger)',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}
      </div>
    </main>
  );
}
