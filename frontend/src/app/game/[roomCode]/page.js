'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { getSocket, connectSocket, disconnectSocket } from '@/lib/socket';
import Timer from '@/components/Timer';
import GameChoice from '@/components/GameChoice';
import ScoreBoard from '@/components/ScoreBoard';
import RoundResult from '@/components/RoundResult';

const TIMER_DURATION = 4; // 4 seconds

export default function GamePage({ params }) {
  const paramsResolved = use(params);
  const roomCode = paramsResolved.roomCode;
  const router = useRouter();

  // Game state
  const [gameState, setGameState] = useState('lobby'); // lobby, playing, roundEnd, gameOver
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [opponent, setOpponent] = useState(null);
  const [totalRounds, setTotalRounds] = useState(3);
  const [currentRound, setCurrentRound] = useState(0);
  const [scores, setScores] = useState({ host: 0, guest: 0 });
  const [choice, setChoice] = useState(null);
  const [choiceLocked, setChoiceLocked] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);
  const [roundResult, setRoundResult] = useState(null);
  const [finalResult, setFinalResult] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // Initialize user and socket
  useEffect(() => {
    const storedUser = localStorage.getItem('rps_user');
    const storedRole = localStorage.getItem('rps_role');
    const storedHost = localStorage.getItem('rps_host');

    if (!storedUser || !storedRole) {
      router.push('/');
      return;
    }

    setUser(JSON.parse(storedUser));
    setRole(storedRole);

    if (storedRole === 'guest' && storedHost) {
      setOpponent(JSON.parse(storedHost));
    }

    const socket = connectSocket();
    
    return () => {
      // Don't disconnect on cleanup, just remove listeners
    };
  }, [router]);

  // Socket event listeners
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handlePlayerJoined = ({ guest }) => {
      setOpponent(guest);
    };

    const handleRoundsSet = ({ totalRounds }) => {
      setTotalRounds(totalRounds);
    };

    const handleRoundStart = ({ round, totalRounds: total, timerMs }) => {
      setGameState('playing');
      setCurrentRound(round);
      setTotalRounds(total);
      setChoice(null);
      setChoiceLocked(false);
      setRoundResult(null);
      setTimeLeft(timerMs / 1000);
    };

    const handleChoiceReceived = () => {
      setChoiceLocked(true);
    };

    const handleRoundResult = (result) => {
      setGameState('roundEnd');
      setRoundResult(result);
      setScores(result.scores);
    };

    const handleGameOver = ({ winner, finalScores }) => {
      setGameState('gameOver');
      setScores(finalScores);
      setFinalResult(winner);
    };

    const handlePlayerLeft = ({ reason }) => {
      setError(reason);
      setGameState('lobby');
      setOpponent(null);
    };

    const handleRoomClosed = ({ reason }) => {
      setError(reason);
      setTimeout(() => router.push('/'), 3000);
    };

    const handleError = ({ message }) => {
      setError(message);
    };

    socket.on('player-joined', handlePlayerJoined);
    socket.on('rounds-set', handleRoundsSet);
    socket.on('round-start', handleRoundStart);
    socket.on('choice-received', handleChoiceReceived);
    socket.on('round-result', handleRoundResult);
    socket.on('game-over', handleGameOver);
    socket.on('player-left', handlePlayerLeft);
    socket.on('room-closed', handleRoomClosed);
    socket.on('error', handleError);

    return () => {
      socket.off('player-joined', handlePlayerJoined);
      socket.off('rounds-set', handleRoundsSet);
      socket.off('round-start', handleRoundStart);
      socket.off('choice-received', handleChoiceReceived);
      socket.off('round-result', handleRoundResult);
      socket.off('game-over', handleGameOver);
      socket.off('player-left', handlePlayerLeft);
      socket.off('room-closed', handleRoomClosed);
      socket.off('error', handleError);
    };
  }, [router]);

  // Timer countdown
  useEffect(() => {
    if (gameState !== 'playing') return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0.1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [gameState]);

  const handleSetRounds = (rounds) => {
    const socket = getSocket();
    socket.emit('set-rounds', { roomCode, rounds });
    setTotalRounds(rounds);
  };

  const handleStartGame = () => {
    const socket = getSocket();
    socket.emit('start-game', { roomCode });
  };

  const handleMakeChoice = (selectedChoice) => {
    if (choiceLocked) return;
    setChoice(selectedChoice);
    const socket = getSocket();
    socket.emit('make-choice', { roomCode, choice: selectedChoice });
  };

  const copyRoomCode = async () => {
    await navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePlayAgain = () => {
    setGameState('lobby');
    setCurrentRound(0);
    setScores({ host: 0, guest: 0 });
    setChoice(null);
    setChoiceLocked(false);
    setRoundResult(null);
    setFinalResult(null);
  };

  const handleLeave = () => {
    disconnectSocket();
    localStorage.removeItem('rps_role');
    localStorage.removeItem('rps_host');
    router.push('/');
  };

  const hostName = role === 'host' ? user?.username : opponent?.username;
  const guestName = role === 'guest' ? user?.username : opponent?.username;

  if (!user) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
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
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>
          <span className="gradient-text">Rock Paper Scissors</span>
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Room:</span>
          <span className="room-code">{roomCode}</span>
          <button 
            onClick={copyRoomCode}
            className="btn btn-secondary"
            style={{ padding: '8px 16px', fontSize: '14px' }}
          >
            {copied ? '✓ Copied!' : '📋 Copy'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ 
          marginBottom: '24px',
          padding: '16px 24px', 
          background: 'rgba(239, 68, 68, 0.1)', 
          borderRadius: '12px',
          color: 'var(--danger)',
          textAlign: 'center'
        }}>
          {error}
        </div>
      )}

      {/* Lobby State */}
      {gameState === 'lobby' && (
        <div className="card" style={{ width: '100%', maxWidth: '500px', textAlign: 'center' }}>
          <h2 style={{ marginBottom: '24px' }}>Game Lobby</h2>

          <div style={{ marginBottom: '32px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              gap: '32px',
              padding: '24px',
              background: 'var(--bg-secondary)',
              borderRadius: '12px'
            }}>
              <div>
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Host {role === 'host' && '(You)'}
                </div>
                <div style={{ fontSize: '20px', fontWeight: 600 }}>
                  {hostName || 'You'}
                </div>
              </div>
              <div style={{ fontSize: '24px', color: 'var(--text-secondary)' }}>VS</div>
              <div>
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Guest {role === 'guest' && '(You)'}
                </div>
                <div style={{ fontSize: '20px', fontWeight: 600 }}>
                  {guestName || <span className="pulse">Waiting...</span>}
                </div>
              </div>
            </div>
          </div>

          {role === 'host' && (
            <>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '12px', color: 'var(--text-secondary)' }}>
                  Number of Rounds
                </label>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  {[1, 3, 5, 7, 10].map((num) => (
                    <button
                      key={num}
                      className={`btn ${totalRounds === num ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => handleSetRounds(num)}
                      style={{ padding: '12px 20px' }}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              <button
                className="btn btn-primary"
                onClick={handleStartGame}
                disabled={!opponent}
                style={{ width: '100%', padding: '16px' }}
              >
                {opponent ? '🎮 Start Game' : '⏳ Waiting for opponent...'}
              </button>
            </>
          )}

          {role === 'guest' && (
            <div style={{ color: 'var(--text-secondary)' }}>
              <p>Best of {totalRounds} rounds</p>
              <p className="pulse" style={{ marginTop: '12px' }}>Waiting for host to start...</p>
            </div>
          )}

          <button
            onClick={handleLeave}
            style={{
              marginTop: '24px',
              background: 'none',
              border: 'none',
              color: 'var(--danger)',
              cursor: 'pointer'
            }}
          >
            Leave Room
          </button>
        </div>
      )}

      {/* Playing State */}
      {gameState === 'playing' && (
        <div style={{ width: '100%', maxWidth: '600px', textAlign: 'center' }}>
          <div style={{ marginBottom: '24px' }}>
            <div style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Round {currentRound} of {totalRounds}
            </div>
            <ScoreBoard 
              hostName={hostName || 'Host'} 
              guestName={guestName || 'Guest'} 
              hostScore={scores.host} 
              guestScore={scores.guest}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
            <Timer timeLeft={timeLeft} maxTime={TIMER_DURATION} />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
              {choiceLocked ? 'Waiting for opponent...' : 'Make your choice!'}
            </p>
            <GameChoice 
              selected={choice} 
              onSelect={handleMakeChoice} 
              disabled={choiceLocked}
            />
          </div>
        </div>
      )}

      {/* Round End State */}
      {gameState === 'roundEnd' && roundResult && (
        <div style={{ width: '100%', maxWidth: '600px', textAlign: 'center' }}>
          <div style={{ marginBottom: '24px' }}>
            <div style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Round {roundResult.round} of {totalRounds}
            </div>
            <ScoreBoard 
              hostName={hostName || 'Host'} 
              guestName={guestName || 'Guest'} 
              hostScore={scores.host} 
              guestScore={scores.guest}
              highlightWinner={roundResult.winner !== 'tie' ? roundResult.winner : null}
            />
          </div>

          <div className="card">
            <h3 style={{ marginBottom: '16px' }}>
              {roundResult.winner === 'tie' 
                ? "It's a tie!" 
                : roundResult.winner === role 
                  ? '🎉 You won this round!' 
                  : '😢 You lost this round'}
            </h3>
            <RoundResult 
              hostChoice={roundResult.hostChoice}
              guestChoice={roundResult.guestChoice}
              winner={roundResult.winner}
              hostName={hostName || 'Host'}
              guestName={guestName || 'Guest'}
            />
            {!roundResult.gameOver && (
              <p className="pulse" style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>
                Next round starting soon...
              </p>
            )}
          </div>
        </div>
      )}

      {/* Game Over State */}
      {gameState === 'gameOver' && finalResult && (
        <div style={{ width: '100%', maxWidth: '500px', textAlign: 'center' }}>
          <div className="card">
            <h2 style={{ fontSize: '32px', marginBottom: '24px' }}>
              {finalResult.winner === 'tie' 
                ? "🤝 It's a Draw!" 
                : finalResult.winner === role 
                  ? '🏆 You Won!' 
                  : '😢 You Lost'}
            </h2>

            <ScoreBoard 
              hostName={hostName || 'Host'} 
              guestName={guestName || 'Guest'} 
              hostScore={scores.host} 
              guestScore={scores.guest}
              highlightWinner={finalResult.winner !== 'tie' ? finalResult.winner : null}
            />

            {finalResult.winner !== 'tie' && (
              <p style={{ marginTop: '24px', fontSize: '18px' }}>
                <span style={{ color: 'var(--success)' }}>{finalResult.username}</span> wins the match!
              </p>
            )}

            <div style={{ display: 'flex', gap: '12px', marginTop: '32px', justifyContent: 'center' }}>
              {role === 'host' && (
                <button className="btn btn-primary" onClick={handlePlayAgain}>
                  🔄 Play Again
                </button>
              )}
              <button className="btn btn-secondary" onClick={handleLeave}>
                🚪 Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
