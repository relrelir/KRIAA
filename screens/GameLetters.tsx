
import React, { useState, useEffect, useRef } from 'react';
import { LetterQuestion } from '../types';
import { generateLetterQuestion } from '../services/geminiService';
import { speakHebrew, playSound } from '../services/audioService';
import { Loader2 } from 'lucide-react';

interface Props {
  level: number;
  onComplete: (success: boolean) => void;
}

const getImageUrl = (prompt: string, seed: string) => {
  // Aggressively reduced resolution to 100x100 for maximum speed
  return `https://image.pollinations.ai/prompt/cute%20colorful%203d%20render%20cartoon%20of%20${encodeURIComponent(prompt)}?width=100&height=100&nologo=true&seed=${seed}`;
};

export const GameLetters: React.FC<Props> = ({ level, onComplete }) => {
  const [data, setData] = useState<LetterQuestion | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [imagesLoadedCount, setImagesLoadedCount] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [imageSeeds, setImageSeeds] = useState<string[]>([]);
  const [usedWords, setUsedWords] = useState<string[]>([]);
  
  // Ref to track if we've already handled the completion for a specific image index
  const loadedIndices = useRef<Set<number>>(new Set());

  // Strict condition: Data must be loaded AND all images must have triggered onLoad
  const isReady = !loadingData && data && imagesLoadedCount === data.options.length;

  useEffect(() => {
    // Reset used words when level changes to start fresh
    setUsedWords([]);
    loadLevel([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  // Safety timeout: if images take too long (e.g. 5s), show the game anyway to prevent hanging
  useEffect(() => {
    if (!loadingData && data && !isReady) {
      const timer = setTimeout(() => {
        setImagesLoadedCount(data.options.length); // Force ready
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [loadingData, data, isReady]);

  // Speak question once ready
  useEffect(() => {
    if (isReady && data) {
      setTimeout(() => speakHebrew(data.questionText), 500);
    }
  }, [isReady, data]);

  const loadLevel = async (currentUsedWords: string[] = usedWords) => {
    setLoadingData(true);
    setImagesLoadedCount(0);
    loadedIndices.current.clear();
    setSelected(null);
    setImageSeeds([]); // Reset seeds
    
    try {
      // Pass the blacklist to the service
      const q = await generateLetterQuestion(level, currentUsedWords);
      
      // Update the used words list with the Correct Answer from the new question
      const correctOption = q.options.find(o => o.isCorrect);
      if (correctOption) {
        setUsedWords(prev => [...prev, correctOption.word]);
      }
      
      // Generate unique random seeds for this specific game session
      const newSeeds = q.options.map(() => Math.random().toString(36).substring(7));
      setImageSeeds(newSeeds);
      
      setData(q);
    } catch (e) {
      console.error(e);
      // Retry logic could go here
    } finally {
      setLoadingData(false);
    }
  };

  const handleImageLoad = (idx: number) => {
    if (!loadedIndices.current.has(idx)) {
      loadedIndices.current.add(idx);
      setImagesLoadedCount(prev => prev + 1);
    }
  };

  const handleSelect = (index: number) => {
    if (!data || selected !== null) return;
    setSelected(index);

    const isCorrect = data.options[index].isCorrect;
    speakHebrew(data.options[index].word);

    if (isCorrect) {
      playSound('correct');
      setTimeout(() => {
        speakHebrew("כל הכבוד!");
        setTimeout(() => onComplete(true), 1500);
      }, 500);
    } else {
      playSound('wrong');
      setTimeout(() => {
        speakHebrew("נסה שוב");
        setSelected(null);
      }, 1000);
    }
  };

  if (!data && !loadingData) return <div>שגיאה בטעינת הנתונים</div>;

  return (
    <div className="relative h-full w-full">
      
      {/* Loading Overlay - Covers everything until images are ready */}
      {(!isReady) && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-sky-50">
          <Loader2 className="w-12 h-12 animate-spin text-brand-blue" />
          <p className="mt-4 text-xl font-bold text-gray-500">מכין את המשחק...</p>
        </div>
      )}

      {/* Main Game Content - Always rendered to allow images to load, but hidden via opacity until ready */}
      {data && (
        <div 
          className={`flex flex-col h-full p-4 items-center overflow-y-auto transition-opacity duration-300 ${isReady ? 'opacity-100' : 'opacity-0'}`}
        >
          {/* Question Header */}
          <div className="bg-white p-6 rounded-3xl shadow-lg border-b-4 border-gray-200 w-full max-w-md text-center mb-6 relative">
            <button 
              onClick={() => speakHebrew(data.questionText)}
              className="absolute top-2 right-2 p-2 bg-gray-100 rounded-full hover:bg-gray-200"
            >
              🔊
            </button>
            <h2 className="text-2xl font-bold text-gray-700 mb-2">{data.questionText}</h2>
            <div className="inline-block bg-brand-yellow/30 px-6 py-2 rounded-xl border-2 border-brand-yellow">
              <span className="text-6xl font-bold text-gray-800">{data.targetLetter}</span>
            </div>
          </div>

          {/* Grid of Choices */}
          <div className="grid grid-cols-2 gap-4 w-full max-w-md pb-4">
            {data.options.map((opt, idx) => (
              <button
                key={idx}
                onClick={() => handleSelect(idx)}
                className={`
                  relative flex flex-col items-center justify-center p-3 rounded-2xl border-4 transition-all
                  ${selected === idx 
                    ? (opt.isCorrect ? 'bg-green-100 border-green-500 scale-105' : 'bg-red-100 border-red-500') 
                    : 'bg-white border-brand-blue/30 hover:bg-brand-blue/10 active:scale-95'
                  }
                `}
              >
                <div className="w-full aspect-square bg-gray-100 rounded-xl mb-3 overflow-hidden shadow-inner relative">
                  <img 
                    src={getImageUrl(opt.imagePrompt, imageSeeds[idx] || 'default')}
                    alt={opt.word}
                    onLoad={() => handleImageLoad(idx)}
                    onError={() => handleImageLoad(idx)} // Treat error as loaded
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="text-2xl font-bold text-gray-700">{opt.word}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
