'use client';

export default function Timer({ timeLeft, maxTime = 4 }) {
    const radius = 42;
    const circumference = 2 * Math.PI * radius;
    const progress = (timeLeft / maxTime) * circumference;
    const isUrgent = timeLeft <= 1;

    return (
        <div className={`timer-ring ${isUrgent ? 'urgent' : ''}`}>
            <svg width="100" height="100" viewBox="0 0 100 100">
                <circle className="bg" cx="50" cy="50" r={radius} />
                <circle
                    className="progress"
                    cx="50"
                    cy="50"
                    r={radius}
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference - progress}
                />
            </svg>
            <div className="timer-text">{Math.ceil(timeLeft)}</div>
        </div>
    );
}
