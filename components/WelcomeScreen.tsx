

import React from 'react';
import type { UserStats, LevelInfo } from '../types.ts';
import { CardsIcon, TimerIcon, ShuffleIcon } from './icons.tsx';

type Mode = 'flashcard' | 'challenge' | 'scramble';

interface WelcomeScreenProps {
  onModeSelect: (mode: Mode) => void;
  loading: boolean;
  stats: UserStats;
  levelInfo: LevelInfo;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onModeSelect, loading, stats, levelInfo }) => {
  return (
    <div className="flex-grow flex flex-col items-center justify-between p-6 text-center text-white">
      <div className="w-full">
        <h1 className="font-cursive text-6xl text-shadow mb-2">Välkommen!</h1>
        <p className="text-lg text-slate-200 mb-6 text-shadow">
          Ready for your daily Swedish lesson?
        </p>
      </div>

      <div className="w-full bg-black/20 backdrop-blur-sm rounded-xl p-4 space-y-4 border border-white/10 shadow-lg">
          <div className="flex items-center justify-center space-x-4">
              <div className="text-center">
                <span className="text-4xl">🔥</span>
                <p className="text-lg font-bold">{stats.streak}</p>
                <p className="text-xs text-slate-300 uppercase tracking-wider">Day Streak</p>
              </div>
          </div>

          <div className="w-full text-left">
            <div className="flex justify-between items-baseline mb-1">
                <p className="font-bold text-sm">Level {levelInfo.level}: {levelInfo.name}</p>
                <p className="text-xs text-slate-300">{stats.xp} / {levelInfo.nextLevelXp} XP</p>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2.5">
                <div 
                    className="bg-yellow-400 h-2.5 rounded-full transition-all duration-500" 
                    style={{width: `${levelInfo.progressPercent}%`}}
                ></div>
            </div>
          </div>
      </div>

      <div className="w-full mt-6">
        <p className="font-semibold text-shadow mb-3">Choose an activity:</p>
        <div className="grid grid-cols-3 gap-3">
           <ModeButton icon={<CardsIcon />} label="Flashcards" onClick={() => onModeSelect('flashcard')} disabled={loading} />
           <ModeButton icon={<TimerIcon />} label="Challenge" onClick={() => onModeSelect('challenge')} disabled={loading} />
           <ModeButton icon={<ShuffleIcon />} label="Scramble" onClick={() => onModeSelect('scramble')} disabled={loading} />
        </div>
        <p className="text-sm text-slate-300 mt-4 text-shadow min-h-[20px] animate-pulse">
          {loading && 'Generating fresh content for you...'}
        </p>
      </div>
    </div>
  );
};

interface ModeButtonProps {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    disabled: boolean;
}
const ModeButton: React.FC<ModeButtonProps> = ({ icon, label, onClick, disabled}) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className="flex flex-col items-center justify-center p-3 bg-white/10 backdrop-blur-sm rounded-lg shadow-md hover:bg-white/20 transition-colors transform active:scale-95 disabled:opacity-50 disabled:cursor-wait"
    >
        {icon}
        <span className="mt-1.5 text-xs font-semibold">{label}</span>
    </button>
);

export default WelcomeScreen;