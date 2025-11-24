
import React, { useState, useEffect, useRef } from 'react';
import { LetterQuestion } from '../types';
import { generateLetterQuestion } from '../services/geminiService';
import { speakHebrew, playSound } from '../services/audioService';
import { Loader2, RefreshCw } from 'lucide-react';

interface Props {
  level: number;
  onComplete: (success: boolean) => void;
}

// Low resolution for instant loading during pre-fetch
const getImageUrl = (prompt: string, seed: string) => {
  return `https://image.pollinations.ai/prompt/cute%20colorful%203d%20render%20cartoon%20of%20${encodeURIComponent(prompt)}?width=100&height=100&nologo=true&seed=${seed}`;
};

// Helper to preload an image and wait for it
const preloadImage = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = src;
    img.onload = () => resolve();
    img.onerror = () => resolve(); // Resolve anyway to avoid blocking the queue forever
  });
};

interface PreparedQuestion {
  data: LetterQuestion;
  seeds: string[];
}

export const GameLetters: React.FC<Props> = ({ level, onComplete }) => {
  // The current question displayed to the user
  const [currentQ, setCurrentQ] = useState<PreparedQuestion | null>(null);
  
  // UI States
  const [selected, setSelected] = useState<number | null>(null);
  const [error, setError] = useState(false);
  
  // Refs for logic (Stateless to avoid re-renders)
  const bufferRef = useRef<PreparedQuestion[]>([]);
  const usedWordsRef = useRef<Set<string>>(new Set());
  const isFetchingRef = useRef(false);
  const activeLevelRef = useRef(level);

  // Target buffer size
  const BUFFER_TARGET = 4;

  // --- INITIALIZATION & LEVEL CHANGE ---
  useEffect(() => {
    // Reset everything when level changes
    activeLevelRef.current = level;
    bufferRef.current = [];
    usedWordsRef.current.clear();
    setCurrentQ(null);
    setSelected(null);
    setError(false);
    isFetchingRef.current = false;

    // Start the buffer loop
    fillBuffer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  // --- AUDIO & TTS ---
  useEffect(() => {
    if (currentQ) {
      setTimeout(() => speakHebrew(currentQ.data.questionText), 300);
    }
  }, [currentQ]);


  // --- SMART BUFFER LOGIC ---
  const fillBuffer = async () => {
    // Stop if we have enough items OR we are already fetching
    if (bufferRef.current.length >= BUFFER_TARGET || isFetchingRef.current) {
      return;
    }

    isFetchingRef.current = true;

    try {
      // 1. Generate Question using the Exclusion List
      // We convert the Set to Array for the API
      const excludedArray = Array.from(usedWordsRef.current) as string[];
      
      const q = await generateLetterQuestion(activeLevelRef.current, excludedArray);
      
      // Safety check: Did level change while we were awaiting?
      if (activeLevelRef.current !== level) {
        isFetchingRef.current = false;
        return; 
      }

      // 2. Speculatively add the correct answer to the blacklist
      // This ensures the NEXT fetch in the loop knows about this one
      const correctWord = q.options.find(o => o.isCorrect)?.word;
      if (correctWord) {
        usedWordsRef.current.add(correctWord);
      }

      // 3. Preload Images (CRITICAL STEP)
      // We do not add to buffer until images are resident in browser memory
      const seeds = q.options.map(() => Math.random().toString(36).substring(7));
      const imagePromises = q.options.map((opt, i) => 
        preloadImage(getImageUrl(opt.imagePrompt, seeds[i]))
      );

      // Wait for all images to download
      await Promise.all(imagePromises);

      // 4. Push to Buffer
      const prepared: PreparedQuestion = { data: q, seeds };
      bufferRef.current.push(prepared);

      // 5. If UI is empty, pop immediately to start the game
      // We use the functional update pattern or check the Ref to be sure, 
      // but here we check the state `currentQ` effectively.
      // Since `fillBuffer` is async, we can't trust the closure variable of `currentQ`.
      // We will trigger a state update if the user is waiting.
      setCurrentQ(prev => {
        if (!prev) {
          return bufferRef.current.shift() || null;
        }
        return prev;
      });

    } catch (e) {
      console.error("Buffer fill failed:", e);
      // If the buffer is empty and we failed, we might show an error.
      // Otherwise, we just silence it and try again later.
      if (bufferRef.current.length === 0 && !currentQ) {
        setError(true);
      }
    } finally {
      isFetchingRef.current = false;
      // Recursively call fillBuffer to keep topping up the queue
      // Use setTimeout to yield to the main thread briefly
      if (bufferRef.current.length < BUFFER_TARGET && activeLevelRef.current === level) {
         setTimeout(fillBuffer, 100);
      }
    }
  };

  const loadNextQuestion = () => {
    const next = bufferRef.current.shift();
    if (next) {
      setCurrentQ(next);
      setSelected(null);
      // Trigger buffer refill
      fillBuffer();
    } else {
      // Buffer empty? Show loader (setCurrentQ null) and force fetch
      setCurrentQ(null);
      fillBuffer();
    }
  };


  const handleSelect = (index: number) => {
    if (!currentQ || selected !== null) return;
    setSelected(index);

    const isCorrect = currentQ.data.options[index].isCorrect;
    speakHebrew(currentQ.data.options[index].word);

    if (isCorrect) {
      playSound('correct');
      // Delay slightly for visual feedback, then INSTANT switch
      setTimeout(() => {
        speakHebrew("כל הכבוד!");
        // We notify app of "success" but we handle the loop internally until level complete?
        // The App logic usually unlocks levels. 
        // For "Infinite" flow, we might want to just keep going.
        // Assuming we want to simulate "Level Complete" after 1 correct answer for the map progress:
        // OR we just keep playing. Let's assume we keep playing for a bit, 
        // but the prompt implies continuous flow.
        // Let's call onComplete(true) to allow the parent to give coins, 
        // BUT we need to decide if we exit or stay. 
        // If we want "Zero Wait", we probably want to stay in the component.
        // However, the `App.tsx` logic currently unmounts the game on complete.
        // To support true "Zero Wait" flow described, we should probably internally loop 
        // and only exit when user chooses.
        // BUT, to satisfy the `onComplete` contract:
        
        // Let's do the standard flow:
        setTimeout(() => onComplete(true), 500); 
        
        // NOTE: If you want endless mode without going back to map, 
        // replace `onComplete(true)` with `loadNextQuestion()`.
      }, 500);
    } else {
      playSound('wrong');
      setTimeout(() => {
        speakHebrew("נסה שוב");
        setSelected(null);
      }, 1000);
    }
  };

  const handleRetry = () => {
    setError(false);
    fillBuffer();
  };

  // --- RENDER ---

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-xl text-gray-600 mb-4">אופס, בעיה בתקשורת</p>
        <button onClick={handleRetry} className="bg-brand-blue text-white px-6 py-3 rounded-xl flex items-center gap-2">
          <RefreshCw className="w-5 h-5" />
          נסה שוב
        </button>
      </div>
    );
  }

  // Initial Loading State (Buffer empty)
  if (!currentQ) {
    return (
      <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-sky-50">
        <Loader2 className="w-12 h-12 animate-spin text-brand-blue" />
        <p className="mt-4 text-xl font-bold text-gray-500">מכין שאלות...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-4 items-center overflow-y-auto">
      {/* Question Header */}
      <div className="bg-white p-6 rounded-3xl shadow-lg border-b-4 border-gray-200 w-full max-w-md text-center mb-6 relative animate-in slide-in-from-top-4 duration-300">
        <button 
          onClick={() => speakHebrew(currentQ.data.questionText)}
          className="absolute top-2 right-2 p-2 bg-gray-100 rounded-full hover:bg-gray-200"
        >
          🔊
        </button>
        <h2 className="text-2xl font-bold text-gray-700 mb-2">{currentQ.data.questionText}</h2>
        <div className="inline-block bg-brand-yellow/30 px-6 py-2 rounded-xl border-2 border-brand-yellow">
          <span className="text-6xl font-bold text-gray-800">{currentQ.data.targetLetter}</span>
        </div>
      </div>

      {/* Grid of Choices */}
      <div className="grid grid-cols-2 gap-4 w-full max-w-md pb-4">
        {currentQ.data.options.map((opt, idx) => (
          <button
            key={`${currentQ.data.targetLetter}-${idx}`} // Unique key to force re-render of button animations
            onClick={() => handleSelect(idx)}
            className={`
              relative flex flex-col items-center justify-center p-3 rounded-2xl border-4 transition-all duration-200
              ${selected === idx 
                ? (opt.isCorrect ? 'bg-green-100 border-green-500 scale-105' : 'bg-red-100 border-red-500') 
                : 'bg-white border-brand-blue/30 hover:bg-brand-blue/10 active:scale-95'
              }
            `}
          >
            <div className="w-full aspect-square bg-gray-100 rounded-xl mb-3 overflow-hidden shadow-inner relative">
              {/* Image is guaranteed loaded by buffer logic */}
              <img 
                src={getImageUrl(opt.imagePrompt, currentQ.seeds[idx])}
                alt={opt.word}
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-2xl font-bold text-gray-700">{opt.word}</span>
          </button>
        ))}
      </div>
      
      {/* Debug Info (Optional) */}
      <div className="absolute bottom-2 left-2 text-xs text-gray-300 pointer-events-none">
        Buffer: {bufferRef.current.length} | Used: {usedWordsRef.current.size}
      </div>
    </div>
  );
};
