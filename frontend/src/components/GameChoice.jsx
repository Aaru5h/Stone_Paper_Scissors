'use client';

const CHOICES = [
    { id: 'rock', emoji: '🪨', label: 'Rock' },
    { id: 'paper', emoji: '📄', label: 'Paper' },
    { id: 'scissors', emoji: '✂️', label: 'Scissors' }
];

export default function GameChoice({ selected, onSelect, disabled }) {
    return (
        <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
            {CHOICES.map((choice) => (
                <button
                    key={choice.id}
                    className={`choice-btn ${selected === choice.id ? 'selected' : ''}`}
                    onClick={() => onSelect(choice.id)}
                    disabled={disabled}
                >
                    {choice.emoji}
                    <span>{choice.label}</span>
                </button>
            ))}
        </div>
    );
}

export function getChoiceEmoji(choice) {
    const found = CHOICES.find(c => c.id === choice);
    return found ? found.emoji : '❓';
}
