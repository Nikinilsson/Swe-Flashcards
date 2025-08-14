import React from 'react';
import { StarIcon, TrophyIcon } from './icons.tsx';

interface WeeklyProgressProps {
  progress: boolean[];
  count: number;
  onChallengeClick: () => void;
  mode: 'flashcard' | 'challenge';
  disabled: boolean;
}

const WeeklyProgress: React.FC<WeeklyProgressProps> = ({ progress, count, onChallengeClick, mode, disabled }) => {
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <div className="bg-slate-900/50 backdrop-blur-sm text-white p-2 shadow-md w-full flex items-center justify-between">
      <div className="flex-1 text-center">
        <div className="flex items-center justify-center space-x-2.5">
          {progress.map((completed, index) => (
            <div key={index} className="flex flex-col items-center space-y-0.5">
              <span className="text-xs font-mono text-slate-300 text-shadow">{days[index]}</span>
              <StarIcon
                filled={completed}
                className={completed ? 'text-yellow-400' : 'text-slate-600'}
              />
            </div>
          ))}
        </div>
        <p className="text-xs font-semibold tracking-wider mt-1.5 text-shadow">
          Week's Progress: {count} / 7
        </p>
      </div>
       <button
        onClick={onChallengeClick}
        disabled={mode === 'challenge' || disabled}
        className="flex flex-col items-center justify-center px-4 text-yellow-400 disabled:text-slate-600 disabled:cursor-not-allowed hover:text-yellow-300 transition-colors"
        aria-label="Start challenge mode"
        title="Challenge Mode"
      >
        <TrophyIcon />
        <span className="text-xs font-bold uppercase tracking-wider">Challenge</span>
      </button>
    </div>
  );
};

export default WeeklyProgress;