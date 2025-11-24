
import React, { useState, useEffect } from 'react';
import { MapScreen } from './screens/MapScreen';
import { GameLetters } from './screens/GameLetters';
import { GameNikkud } from './screens/GameNikkud';
import { GameSentences } from './screens/GameSentences';
import { Achievements } from './screens/Achievements';
import { TopBar } from './components/TopBar';
import { GameType, UserProgress } from './types';
import { playSound } from './services/audioService';

const INITIAL_PROGRESS: UserProgress = {
  coins: 0,
  badges: [],
  unlockedLevels: {
    [GameType.LETTERS]: 1,
    [GameType.NIKKUD]: 1,
    [GameType.SENTENCES]: 1,
  }
};

const App: React.FC = () => {
  const [screen, setScreen] = useState<'MAP' | 'GAME' | 'ACHIEVEMENTS'>('MAP');
  const [activeGame, setActiveGame] = useState<GameType | null>(null);
  const [activeLevel, setActiveLevel] = useState<number>(1);
  const [progress, setProgress] = useState<UserProgress>(() => {
    const saved = localStorage.getItem('alephCityProgress');
    return saved ? JSON.parse(saved) : INITIAL_PROGRESS;
  });

  // Persist progress
  useEffect(() => {
    localStorage.setItem('alephCityProgress', JSON.stringify(progress));
  }, [progress]);

  const handleGameSelect = (type: GameType, level: number) => {
    playSound('click');
    setActiveGame(type);
    setActiveLevel(level);
    setScreen('GAME');
  };

  const handleGameComplete = (success: boolean) => {
    if (success && activeGame) {
      playSound('win');
      setProgress(prev => {
        const currentMaxLevel = prev.unlockedLevels[activeGame];
        
        // Only increment unlocked level if we just beat the highest unlocked level
        // and we aren't already at some arbitrary max (though max is handled by UI usually)
        const nextLevel = (activeLevel === currentMaxLevel) ? currentMaxLevel + 1 : currentMaxLevel;
        
        // Add badges logic
        const newBadges = [...prev.badges];
        if (activeLevel === 1 && !newBadges.includes(`${activeGame} מתחיל`)) newBadges.push(`${activeGame} מתחיל`);
        if (activeLevel === 3 && !newBadges.includes(`${activeGame} אלוף`)) newBadges.push(`${activeGame} אלוף`);
        
        return {
          ...prev,
          coins: prev.coins + 10,
          badges: newBadges,
          unlockedLevels: {
            ...prev.unlockedLevels,
            [activeGame]: nextLevel
          }
        };
      });
    }
    setScreen('MAP');
    setActiveGame(null);
  };

  const renderScreen = () => {
    if (screen === 'ACHIEVEMENTS') {
      return <Achievements progress={progress} onClose={() => setScreen('MAP')} />;
    }

    if (screen === 'GAME' && activeGame) {
      switch (activeGame) {
        case GameType.LETTERS:
          return <GameLetters level={activeLevel} onComplete={handleGameComplete} />;
        case GameType.NIKKUD:
          return <GameNikkud level={activeLevel} onComplete={handleGameComplete} />;
        case GameType.SENTENCES:
          return <GameSentences level={activeLevel} onComplete={handleGameComplete} />;
        default:
          return <div>Unknown Game</div>;
      }
    }

    return (
      <MapScreen 
        progress={progress} 
        onSelectGame={handleGameSelect} 
        onShowAchievements={() => setScreen('ACHIEVEMENTS')}
      />
    );
  };

  return (
    <div className="min-h-screen bg-sky-50 font-sans text-gray-800 pb-safe">
      <TopBar 
        progress={progress} 
        onHome={() => {
            setScreen('MAP');
            setActiveGame(null);
        }}
        title={activeGame ? `משחק: שלב ${activeLevel}` : 'העיר שלי'}
      />
      <main className="w-full max-w-3xl mx-auto h-[calc(100vh-80px)]">
        {renderScreen()}
      </main>
    </div>
  );
};

export default App;
