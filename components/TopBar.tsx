import React from 'react';
import { UserProgress } from '../types';
import { Coins, Star, Trophy } from 'lucide-react';

interface TopBarProps {
  progress: UserProgress;
  onHome: () => void;
  title?: string;
}

export const TopBar: React.FC<TopBarProps> = ({ progress, onHome, title }) => {
  return (
    <div className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-sm border-b-4 border-brand-blue shadow-sm px-4 py-3 flex justify-between items-center rounded-b-3xl">
      <button 
        onClick={onHome}
        className="bg-brand-blue hover:bg-brand-purple text-white p-2 rounded-full transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
      </button>

      {title && <h1 className="text-xl font-bold text-gray-700 hidden sm:block">{title}</h1>}

      <div className="flex items-center gap-3">
        <div className="flex items-center bg-brand-yellow/30 px-3 py-1 rounded-full border-2 border-brand-yellow">
          <Coins className="text-orange-500 w-5 h-5 mr-1" />
          <span className="font-bold text-gray-700 text-lg">{progress.coins}</span>
        </div>
        <div className="flex items-center bg-brand-purple/20 px-3 py-1 rounded-full border-2 border-brand-purple">
          <Trophy className="text-brand-purple w-5 h-5 mr-1" />
          <span className="font-bold text-gray-700 text-lg">{progress.badges.length}</span>
        </div>
      </div>
    </div>
  );
};
