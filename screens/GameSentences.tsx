
import React, { useState, useEffect } from 'react';
import { SentenceQuestion } from '../types';
import { generateSentenceQuestion } from '../services/geminiService';
import { speakHebrew, playSound } from '../services/audioService';
import { Loader2 } from 'lucide-react';

interface Props {
  level: number;
  onComplete: (success: boolean) => void;
}

const getImageUrl = (prompt: string, seed: string) => {
  // Aggressively reduced resolution to 180x110 for maximum speed
  return `https://image.pollinations.ai/prompt/cute%20colorful%203d%20render%20cartoon%20of%20${encodeURIComponent(prompt)}?width=180&height=110&nologo=true&seed=${seed}`;
};

export const GameSentences: React.FC<Props> = ({ level, onComplete }) => {
  const [data, setData] = useState<SentenceQuestion | null>(null);
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

  // TTS
  useEffect(() => {
    if (isReady) {
      setTimeout(() => speakHebrew("השלם את המשפט"), 500);
    }
  }, [isReady]);

  const loadLevel = async () => {
    setLoadingData(true);
    setImageReady(false);
    setCompleted(false);
    try {
      const q = await generateSentenceQuestion(level);
      setData(q);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingData(false);
    }
  };

  const handleSelect = (word: string) => {
    if (!data || completed) return;
    const isCorrect = word === data.missingWord;

    if (isCorrect) {
      setCompleted(true);
      playSound('correct');
      const fullSentence = data.sentenceParts.join(data.missingWord).replace('___', '');
      setTimeout(() => {
        speakHebrew(fullSentence);
        setTimeout(() => onComplete(true), 2500);
      }, 500);
    } else {
      playSound('wrong');
    }
  };

  if (!data && !loadingData) return <div>Error</div>;

  return (
    <div className="relative h-full w-full">
      
       {/* Loading Overlay */}
       {(!isReady) && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-sky-50">
          <Loader2 className="w-12 h-12 animate-spin text-brand-green" />
          <p className="mt-4 text-xl font-bold text-gray-500">בונה משפטים...</p>
        </div>
      )}

      {/* Main Content */}
      {data && (
        <div className={`flex flex-col h-full p-4 items-center transition-opacity duration-300 ${isReady ? 'opacity-100' : 'opacity-0'}`}>
          <div className="w-full max-w-md h-48 mb-6 rounded-3xl shadow-lg overflow-hidden bg-gray-50">
            <img 
              src={getImageUrl(data.imageDescription, data.missingWord)}
              className="w-full h-full object-cover"
              alt="Sentence context"
              onLoad={() => setImageReady(true)}
              onError={() => setImageReady(true)}
            />
          </div>

          {/* Sentence Display */}
          <div className="w-full max-w-md flex flex-wrap justify-center gap-2 mb-8 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            {data.sentenceParts.map((part, i) => (
              <React.Fragment key={i}>
                <span className="text-2xl sm:text-3xl font-bold text-gray-800 self-center">{part}</span>
                {i < data.sentenceParts.length - 1 && (
                  <div 
                    className={`
                      min-w-[80px] h-10 sm:h-12 rounded-lg border-b-4 flex items-center justify-center px-3 transition-colors
                      ${completed ? 'bg-green-100 border-green-500 text-green-700' : 'bg-gray-100 border-gray-300'}
                    `}
                  >
                    {completed ? <span className="font-bold text-xl">{data.missingWord}</span> : <span className="text-gray-400">?</span>}
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Word Options */}
          <div className="flex flex-wrap justify-center gap-3 w-full max-w-md">
            {data.options.map((word, idx) => (
              <button
                key={idx}
                onClick={() => handleSelect(word)}
                disabled={completed}
                className={`
                  px-6 py-3 rounded-xl shadow-md border-b-4 font-bold text-xl transition-all
                  ${completed && word === data.missingWord 
                    ? 'bg-green-500 text-white border-green-700' 
                    : 'bg-white text-brand-purple border-brand-purple/30 hover:bg-brand-purple hover:text-white'
                  }
                `}
              >
                {word}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
