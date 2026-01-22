'use client';

export default function ScoreBoard({ hostName, guestName, hostScore, guestScore, highlightWinner = null }) {
    return (
        <div className="scoreboard">
            <div className={`score-player ${highlightWinner === 'host' ? 'winner' : highlightWinner === 'guest' ? 'loser' : ''}`}>
                <div className="name">{hostName}</div>
                <div className="score">{hostScore}</div>
            </div>
            <div className="score-vs">VS</div>
            <div className={`score-player ${highlightWinner === 'guest' ? 'winner' : highlightWinner === 'host' ? 'loser' : ''}`}>
                <div className="name">{guestName}</div>
                <div className="score">{guestScore}</div>
            </div>
        </div>
    );
}
