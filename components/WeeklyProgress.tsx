
import React from 'react';
import { StarIcon } from './icons.tsx';

interface WeeklyProgressProps {
  progress: boolean[];
  count: number;
  currentDayIndex: number;
}

const WeeklyProgress: React.FC<WeeklyProgressProps> = ({ progress, count, currentDayIndex }) => {
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <div className="bg-slate-900/50 backdrop-blur-sm text-white p-2 shadow-md w-full flex items-center justify-center">
      <div className="text-center">
        <div className="flex items-center justify-center space-x-2.5">
          {progress.map((completed, index) => (
            <div key={index} className="flex flex-col items-center space-y-0.5">
              <span className={`text-xs font-mono text-shadow transition-colors ${index === currentDayIndex ? 'text-white font-bold' : 'text-slate-300'}`}>{days[index]}</span>
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
    </div>
  );
};

export default WeeklyProgress;
