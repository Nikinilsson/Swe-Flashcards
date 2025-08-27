import React from 'react';
import type { DailyResult, MissedItem } from '../types.ts';
import { ArrowLeftIcon, CardsIcon, ShuffleIcon, MagnifyingGlassIcon, TimerIcon, PencilIcon } from './icons.tsx';

interface DailySummaryProps {
  result: DailyResult;
  history: DailyResult[];
  onClose: () => void;
}

const DailySummary: React.FC<DailySummaryProps> = ({ result, history, onClose }) => {
  const { totalPoints, points, missedItems } = result;

  // Prepare data for the chart (last 7 days including today)
  const last7DaysHistory = history.slice(0, 7).reverse();
  const maxPoints = Math.max(...last7DaysHistory.map(d => d.totalPoints), 50);

  const getIconForMode = (mode: MissedItem['mode']) => {
    if (mode === 'scramble') return <ShuffleIcon className="h-5 w-5 mr-2" />;
    if (mode === 'grammar') return <MagnifyingGlassIcon className="h-5 w-5 mr-2" />;
    if (mode === 'quiz') return <PencilIcon className="h-5 w-5 mr-2" />;
    return null;
  };
  
  return (
    <div className="w-full h-full flex flex-col text-white">
      <div className="flex items-center justify-between w-full p-4">
        <button onClick={onClose} className="text-white bg-black/30 rounded-full p-2 hover:bg-black/50" aria-label="Return to menu">
            <ArrowLeftIcon />
        </button>
        <h2 className="text-xl font-bold text-shadow">Daily Summary</h2>
        <div className="w-10"></div>
      </div>

      <div className="flex-grow overflow-y-auto p-4 pt-0">
        <div className="text-center bg-black/20 p-4 rounded-lg mb-4">
          <p className="text-slate-300">Today's Total Score</p>
          <p className="text-6xl font-bold text-yellow-300 text-shadow">{totalPoints} pts</p>
        </div>

        <div className="bg-black/20 p-4 rounded-lg mb-4">
            <h3 className="font-bold mb-3 text-center">7-Day Performance</h3>
            <div className="flex justify-around items-end h-32 w-full">
                {last7DaysHistory.map((day, index) => {
                    const barHeight = Math.max(5, (day.totalPoints / maxPoints) * 100);
                    const isToday = day.date === result.date;
                    return (
                        <div key={index} className="flex flex-col items-center w-8">
                            <span className="text-xs mb-1">{day.totalPoints}</span>
                            <div 
                                className={`w-4 rounded-t-sm ${isToday ? 'bg-yellow-400' : 'bg-slate-500'}`}
                                style={{ height: `${barHeight}%` }}
                                title={`${day.date}: ${day.totalPoints} points`}
                            ></div>
                            <span className={`text-xs mt-1 font-mono ${isToday ? 'font-bold' : ''}`}>
                                {new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' }).charAt(0)}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>

        {missedItems.length > 0 && (
          <div className="bg-black/20 p-4 rounded-lg">
            <h3 className="font-bold mb-3 text-center">Items to Review</h3>
            <ul className="space-y-3">
              {missedItems.map((item, index) => (
                <li key={index} className="bg-slate-800/50 p-3 rounded-md text-sm">
                  <p className="flex items-center font-semibold text-slate-300 capitalize">{getIconForMode(item.mode)} {item.mode}</p>
                  <p className="mt-1"><span className="font-semibold text-slate-400">Q:</span> "{item.question}"</p>
                  <p className="text-red-400"><span className="font-semibold">Your answer:</span> {item.userAnswer}</p>
                  <p className="text-green-400"><span className="font-semibold">Correct:</span> {item.correctAnswer}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default DailySummary;