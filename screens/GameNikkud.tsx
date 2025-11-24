
import React, { useState, useEffect } from 'react';
import { NikkudQuestion } from '../types';
import { generateNikkudQuestion } from '../services/geminiService';
import { speakHebrew, playSound } from '../services/audioService';
import { Loader2 } from 'lucide-react';

interface Props {
  level: number;
  onComplete: (success: boolean) => void;
}

const getImageUrl = (prompt: string, seed: string) => {
  // Aggressively reduced resolution to 180x180 for maximum speed
  return `https://image.pollinations.ai/prompt/cute%20colorful%203d%20render%20cartoon%20of%20${encodeURIComponent(prompt)}?width=180&height=180&nologo=true&seed=${seed}`;
};

export const GameNikkud: React.FC<Props> = ({ level, onComplete }) => {
  const [data, setData] = useState<NikkudQuestion | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [imageReady, setImageReady] = useState(false);
  const [completed, setCompleted] = useState(false);

  const isReady = !loadingData && data && imageReady;

  useEffect(() => {
    loadLevel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  // Safety timeout
  useEffect(() => {
    if (!loadingData && data && !isReady) {
      const timer = setTimeout(() => setImageReady(true), 5000);
      return () => clearTimeout(timer);
    }
  }, [loadingData, data, isReady]);

  // TTS when ready
  useEffect(() => {
    if (isReady && data) {
      setTimeout(() => speakHebrew(`השלם את הניקוד החסר: ${data.missingNikkudName}`), 500);
    }
  }, [isReady, data]);

  const loadLevel = async () => {
    setLoadingData(true);
    setImageReady(false);
    setCompleted(false);
    try {
      const q = await generateNikkudQuestion(level);
      setData(q);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingData(false);
    }
  };

  const handleSelect = (nikkud: string) => {
    if (!data || completed) return;
    
    const isCorrect = nikkud.trim() === data.missingNikkudSymbol.trim();

    if (isCorrect) {
      setCompleted(true);
      playSound('correct');
      setTimeout(() => {
        speakHebrew(data.fullWord);
        setTimeout(() => onComplete(true), 2000);
      }, 500);
    } else {
      playSound('wrong');
      speakHebrew("לא, נסה שוב");
    }
  };

  if (!data && !loadingData) return <div>Error</div>;

  return (
    <div className="relative h-full w-full">
      
       {/* Loading Overlay */}
       {(!isReady) && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-sky-50">
          <Loader2 className="w-12 h-12 animate-spin text-brand-purple" />
          <p className="mt-4 text-xl font-bold text-gray-500">מחפש מילים...</p>
        </div>
      )}

      {/* Main Content */}
      {data && (
        <div className={`flex flex-col h-full p-4 items-center transition-opacity duration-300 ${isReady ? 'opacity-100' : 'opacity-0'}`}>
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-xl border-4 border-brand-purple mb-8 flex flex-col items-center">
            {/* Dynamic Image */}
            <div className="w-full h-48 mb-6 rounded-xl overflow-hidden shadow-inner bg-gray-50">
              <img 
                src={getImageUrl(data.imageDescription, data.wordWithoutNikkud)} 
                className="w-full h-full object-cover" 
                alt={data.imageDescription}
                onLoad={() => setImageReady(true)}
                onError={() => setImageReady(true)}
              />
            </div>
            
            {/* Word Display */}
            <div className="text-6xl font-bold text-gray-800 tracking-wider mb-2 flex items-baseline justify-center" dir="rtl">
              {completed ? (
                <span className="text-brand-purple">{data.fullWord}</span>
              ) : (
                data.wordWithoutNikkud.split('').map((char, index, arr) => {
                  if (char === '_') return null; // Skip underscores

                  // Check if next char is placeholder
                  const isTarget = arr[index + 1] === '_';

                  if (isTarget) {
                    return (
                      <span key={index} className="relative inline-flex flex-col items-center mx-0.5 group">
                        <span className="z-10 relative">{char}</span>
                        {/* The visual placeholder box for Nikkud */}
                        <span className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-6 h-6 border-2 border-dashed border-brand-purple rounded-md bg-purple-50"></span>
                      </span>
                    );
                  }

                  return <span key={index}>{char}</span>;
                })
              )}
            </div>
            
            <p className="text-gray-500 mt-4 text-lg">מצא את ה: <span className="font-bold text-brand-purple">{data.missingNikkudName}</span></p>
          </div>

          {/* Nikkud Options Area */}
          <div className="grid grid-cols-4 gap-4 w-full max-w-md">
            {data.options.map((opt, idx) => (
              <button
                key={idx}
                onClick={() => handleSelect(opt)}
                className="aspect-square bg-white rounded-2xl shadow-md border-b-4 border-gray-200 active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center hover:bg-purple-50 group"
              >
                <span className="text-6xl sm:text-7xl font-serif text-black leading-none">
                  &nbsp;{opt}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
