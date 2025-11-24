
import React, { useState } from 'react';
import { GameType, UserProgress } from '../types';
import { Play, Lock, Star, Trophy, X } from 'lucide-react';

interface MapScreenProps {
  progress: UserProgress;
  onSelectGame: (type: GameType, level: number) => void;
  onShowAchievements: () => void;
}

const GAME_CONFIG = {
  [GameType.LETTERS]: { maxLevels: 3, label: 'אותיות', desc: 'זיהוי אותיות במילים' },
  [GameType.NIKKUD]: { maxLevels: 4, label: 'ניקוד', desc: 'הכרת סימני הניקוד' },
  [GameType.SENTENCES]: { maxLevels: 3, label: 'משפטים', desc: 'השלמת משפטים' },
};

export const MapScreen: React.FC<MapScreenProps> = ({ progress, onSelectGame, onShowAchievements }) => {
  const [selectedGameForPopup, setSelectedGameForPopup] = useState<GameType | null>(null);

  const GameNode = ({ type, label, color, x, y, icon }: any) => {
    // For visual purposes on the map, everything is accessible
    const isUnlocked = true; 
    const currentLevel = progress.unlockedLevels[type as GameType];
    
    return (
      <div 
        className={`absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center cursor-pointer transition-transform hover:scale-110 active:scale-95`}
        style={{ left: x, top: y }}
        onClick={() => setSelectedGameForPopup(type)}
      >
        <div className={`w-24 h-24 rounded-full border-8 shadow-[0_8px_0_rgba(0,0,0,0.1)] flex items-center justify-center ${color} border-white relative`}>
          <span className="text-4xl">{icon}</span>
          {!isUnlocked && (
             <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
               <Lock className="text-white w-8 h-8" />
             </div>
          )}
        </div>
        <div className="mt-2 bg-white px-4 py-1 rounded-full shadow-md border-2 border-gray-200">
          <span className="font-bold text-gray-700">{label}</span>
        </div>
        <div className="flex mt-1">
          {/* Show stars based on unlocked levels roughly */}
          {[1, 2, 3].map(i => (
            <Star key={i} className={`w-4 h-4 ${i < currentLevel ? 'text-brand-yellow fill-brand-yellow' : 'text-gray-300'}`} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="relative w-full h-[calc(100vh-80px)] overflow-hidden bg-[#e6f7ff] pb-20">
      
      {/* Decorative City Background Elements */}
      <div className="absolute bottom-0 w-full h-32 bg-green-200 rounded-t-[100px] transform scale-150 translate-y-10"></div>
      <div className="absolute top-20 right-10 w-20 h-20 bg-yellow-100 rounded-full opacity-50"></div>
      
      {/* The Path */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path d="M50 90 Q 20 70 50 50 T 50 10" fill="none" stroke="#cbd5e1" strokeWidth="4" strokeDasharray="8 8" />
      </svg>

      {/* Game Nodes */}
      <GameNode 
        type={GameType.LETTERS} 
        label="אותיות" 
        color="bg-brand-red" 
        x="50%" y="85%" 
        icon="א"
      />

      <GameNode 
        type={GameType.NIKKUD} 
        label="ניקוד" 
        color="bg-brand-blue" 
        x="20%" y="50%" 
        icon="ָ"
      />

      <GameNode 
        type={GameType.SENTENCES} 
        label="משפטים" 
        color="bg-brand-purple" 
        x="80%" y="25%" 
        icon="📖"
      />

      {/* Achievements Button */}
      <button 
        onClick={onShowAchievements}
        className="absolute bottom-6 left-6 bg-white p-3 rounded-2xl shadow-lg border-2 border-brand-yellow flex items-center gap-2 hover:bg-gray-50 active:scale-95 transition-all"
      >
        <Trophy className="text-brand-yellow w-6 h-6 fill-current" />
        <span className="font-bold text-gray-700">המדליות שלי</span>
      </button>

      {/* Level Selection Modal */}
      {selectedGameForPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border-4 border-brand-blue relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setSelectedGameForPopup(null)}
              className="absolute top-3 right-3 p-2 bg-gray-100 rounded-full hover:bg-red-100 hover:text-red-500 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold text-brand-purple mb-2">
                {GAME_CONFIG[selectedGameForPopup].label}
              </h2>
              <p className="text-gray-500">{GAME_CONFIG[selectedGameForPopup].desc}</p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {Array.from({ length: GAME_CONFIG[selectedGameForPopup].maxLevels }).map((_, i) => {
                const level = i + 1;
                // All levels are now unlocked by default
                const isUnlocked = true;
                
                return (
                  <button
                    key={level}
                    onClick={() => onSelectGame(selectedGameForPopup, level)}
                    className={`
                      w-full p-4 rounded-xl border-b-4 flex items-center justify-between group transition-all
                      bg-white border-brand-blue text-gray-800 hover:bg-sky-50 active:scale-[0.98]
                    `}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`
                        w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg
                        bg-brand-blue text-white
                      `}>
                        {level}
                      </div>
                      <span className="font-bold text-lg">שלב {level}</span>
                    </div>
                    <Play className="w-6 h-6 text-brand-blue fill-current group-hover:scale-110 transition-transform" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
