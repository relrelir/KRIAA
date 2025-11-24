import React from 'react';
import { UserProgress } from '../types';
import { Trophy, Star, Award, Home } from 'lucide-react';

interface Props {
  progress: UserProgress;
  onClose: () => void;
}

export const Achievements: React.FC<Props> = ({ progress, onClose }) => {
  return (
    <div className="fixed inset-0 bg-white z-[60] overflow-y-auto">
      <div className="p-6 max-w-2xl mx-auto">
        
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-brand-purple">ההישגים שלי</h1>
          <button onClick={onClose} className="bg-gray-100 p-2 rounded-full">
            <Home className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Stats Summary */}
        <div className="bg-gradient-to-r from-brand-blue to-brand-green p-6 rounded-3xl text-white shadow-lg mb-8 flex justify-around">
           <div className="text-center">
             <div className="text-4xl font-bold mb-1">{progress.coins}</div>
             <div className="opacity-80">מטבעות</div>
           </div>
           <div className="w-px bg-white/30"></div>
           <div className="text-center">
             <div className="text-4xl font-bold mb-1">{progress.badges.length}</div>
             <div className="opacity-80">מדליות</div>
           </div>
        </div>

        <h2 className="text-xl font-bold text-gray-700 mb-4">אוסף המדליות</h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
          {progress.badges.map((badge, i) => (
            <div key={i} className="flex flex-col items-center p-3 bg-yellow-50 rounded-xl border border-yellow-200">
               <Award className="w-10 h-10 text-orange-500 mb-2" />
               <span className="text-xs font-bold text-center text-gray-600">{badge}</span>
            </div>
          ))}
          {/* Placeholders */}
          {[...Array(5)].map((_, i) => (
             <div key={`p-${i}`} className="flex flex-col items-center p-3 bg-gray-50 rounded-xl border border-gray-100 opacity-50">
               <div className="w-10 h-10 rounded-full bg-gray-200 mb-2"></div>
               <span className="text-xs text-center text-gray-400">???</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
