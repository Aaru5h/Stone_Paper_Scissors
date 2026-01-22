'use client';

import { getChoiceEmoji } from './GameChoice';

export default function RoundResult({ hostChoice, guestChoice, winner, hostName, guestName }) {
    return (
        <div className="result-display reveal-anim">
            <div className="result-player">
                <div className={`result-choice ${winner === 'host' ? 'winner' : winner === 'guest' ? 'loser' : 'tie'}`}>
                    {hostChoice ? getChoiceEmoji(hostChoice) : '⏱️'}
                </div>
                <div style={{ color: 'var(--text-secondary)' }}>{hostName}</div>
                {winner === 'host' && <div style={{ color: 'var(--success)', fontWeight: 600 }}>Winner!</div>}
                {!hostChoice && <div style={{ color: 'var(--danger)', fontSize: '14px' }}>Timed out</div>}
            </div>

            <div style={{ fontSize: '32px', color: 'var(--text-secondary)' }}>vs</div>

            <div className="result-player">
                <div className={`result-choice ${winner === 'guest' ? 'winner' : winner === 'host' ? 'loser' : 'tie'}`}>
                    {guestChoice ? getChoiceEmoji(guestChoice) : '⏱️'}
                </div>
                <div style={{ color: 'var(--text-secondary)' }}>{guestName}</div>
                {winner === 'guest' && <div style={{ color: 'var(--success)', fontWeight: 600 }}>Winner!</div>}
                {!guestChoice && <div style={{ color: 'var(--danger)', fontSize: '14px' }}>Timed out</div>}
            </div>
        </div>
    );
}
