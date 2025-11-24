
import React, { useState, useEffect, useRef } from 'react';
import { LetterQuestion } from '../types';
import { generateLetterQuestion } from '../services/geminiService';
import { speakHebrew, playSound } from '../services/audioService';
import { Loader2, RefreshCw } from 'lucide-react';

interface Props {
  level: number;
  onComplete: (success: boolean) => void;
}

const QUESTIONS_PER_SESSION = 5;
const BUFFER_TARGET = 3; // Keep 3 questions ready in advance

// Generate URL with a specific seed to ensure cache consistency
const getImageUrl = (prompt: string, seed: string) => {
  return `https://image.pollinations.ai/prompt/cute%20colorful%203d%20render%20cartoon%20of%20${encodeURIComponent(prompt)}?width=100&height=100&nologo=true&seed=${seed}`;
};

// Helper to preload an image and wait for it
const preloadImage = (src: string): Promise<void> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = src;
    img.onload = () => resolve();
    img.onerror = () => resolve(); // Don't block queue on error
  });
};

interface PreparedQuestion {
  data: LetterQuestion;
  seeds: string[]; // Specific seeds used for this question instance
}

export const GameLetters: React.FC<Props> = ({ level, onComplete }) => {
  // Game State
  const [currentQ, setCurrentQ] = useState<PreparedQuestion | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [error, setError] = useState(false);
  const [sessionFinished, setSessionFinished] = useState(false);
  
  // Refs for State Management (avoiding closures issues in async loops)
  const bufferRef = useRef<PreparedQuestion[]>([]);
  const usedWordsRef = useRef<Set<string>>(new Set());
  const isFetchingRef = useRef(false);
  const mountedRef = useRef(true);

  // --- LIFECYCLE ---
  useEffect(() => {
    mountedRef.current = true;
    startSession();
    return () => { 
      mountedRef.current = false; 
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  // Audio effect for new questions
  useEffect(() => {
    if (currentQ && !sessionFinished) {
      setTimeout(() => speakHebrew(currentQ.data.questionText), 300);
    }
  }, [currentQ, sessionFinished]);

  const startSession = () => {
    // Reset state
    setCorrectCount(0);
    setSessionFinished(false);
    setSelected(null);
    setCurrentQ(null);
    setError(false);
    bufferRef.current = [];
    usedWordsRef.current.clear();
    isFetchingRef.current = false;
    
    // Start filling buffer
    fillBuffer();
  };

  // --- SMART BUFFER LOGIC ---
  const fillBuffer = async () => {
    if (!mountedRef.current) return;

    // Stop if buffer is healthy OR we are already fetching OR session is effectively over
    if (bufferRef.current.length >= BUFFER_TARGET || isFetchingRef.current) {
      return;
    }

    isFetchingRef.current = true;

    try {
      // 1. Generate Data with Exclusions
      const excludedArray = Array.from(usedWordsRef.current) as string[];
      const q = await generateLetterQuestion(level, excludedArray);
      
      if (!mountedRef.current) return;

      // 2. Speculative Exclusion: Add correct word to blacklist immediately
      const correctWord = q.options.find(o => o.isCorrect)?.word;
      if (correctWord) {
        usedWordsRef.current.add(correctWord);
      }

      // 3. Image Preloading (The "Gate")
      // Generate seeds now so they are locked for this question instance
      const seeds = q.options.map(() => Math.random().toString(36).substring(7));
      
      const imagePromises = q.options.map((opt, i) => 
        preloadImage(getImageUrl(opt.imagePrompt, seeds[i]))
      );

      // Block until images are ready
      await Promise.all(imagePromises);

      // 4. Push to Queue
      const prepared: PreparedQuestion = { data: q, seeds };
      bufferRef.current.push(prepared);

      // 5. Update UI if we were waiting for the first question
      setCurrentQ(prev => {
        if (!prev) {
          return bufferRef.current.shift() || null;
        }
        return prev;
      });

    } catch (e) {
      console.error("Buffer error:", e);
      if (bufferRef.current.length === 0 && !currentQ) {
        setError(true);
      }
    } finally {
      isFetchingRef.current = false;
      // Recursively keep filling if we haven't reached target
      if (mountedRef.current && bufferRef.current.length < BUFFER_TARGET) {
         fillBuffer();
      }
    }
  };

  const handleNextQuestion = () => {
    // Check if session complete
    if (correctCount + 1 >= QUESTIONS_PER_SESSION) {
      setSessionFinished(true);
      onComplete(true);
      return;
    }

    setCorrectCount(prev => prev + 1);
    setSelected(null);

    // Instant Transition: Pop from buffer
    const next = bufferRef.current.shift();
    if (next) {
      setCurrentQ(next);
      // Trigger background refill
      fillBuffer();
    } else {
      // Buffer dry (rare) -> show loader
      setCurrentQ(null);
      fillBuffer();
    }
  };

  const handleSelect = (index: number) => {
    if (!currentQ || selected !== null) return;
    
    setSelected(index);
    const option = currentQ.data.options[index];
    speakHebrew(option.word);

    if (option.isCorrect) {
      playSound('correct');
      
      // Fast transition: 700ms delay for feedback, then swap
      setTimeout(() => {
        handleNextQuestion();
      }, 700);
    } else {
      playSound('wrong');
      setTimeout(() => {
        speakHebrew("נסה שוב");
        setSelected(null);
      }, 1000);
    }
  };

  // --- RENDER ---

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-xl text-gray-600 mb-4">אופס, בעיה בתקשורת</p>
        <button onClick={startSession} className="bg-brand-blue text-white px-6 py-3 rounded-xl flex items-center gap-2">
          <RefreshCw className="w-5 h-5" />
          נסה שוב
        </button>
      </div>
    );
  }

  // Initial Loader
  if (!currentQ) {
    return (
      <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-sky-50">
        <Loader2 className="w-12 h-12 animate-spin text-brand-blue" />
        <p className="mt-4 text-xl font-bold text-gray-500">
           {bufferRef.current.length > 0 ? 'כמעט מוכן...' : 'מכין משחקים...'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-4 items-center w-full">
      
      {/* Session Progress Bar */}
      <div className="w-full max-w-md flex gap-2 mb-4">
        {Array.from({ length: QUESTIONS_PER_SESSION }).map((_, i) => (
          <div 
            key={i} 
            className={`h-2 flex-1 rounded-full transition-colors duration-300 ${i < correctCount ? 'bg-green-500' : 'bg-gray-200'}`}
          />
        ))}
      </div>

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
      <div className="grid grid-cols-2 gap-4 w-full max-w-md pb-4 flex-1">
        {currentQ.data.options.map((opt, idx) => (
          <button
            key={`${currentQ.data.targetLetter}-${idx}`}
            onClick={() => handleSelect(idx)}
            className={`
              relative flex flex-col items-center justify-center p-2 rounded-2xl border-4 transition-all duration-200
              ${selected === idx 
                ? (opt.isCorrect ? 'bg-green-100 border-green-500 scale-105' : 'bg-red-100 border-red-500') 
                : 'bg-white border-brand-blue/30 hover:bg-brand-blue/10 active:scale-[0.98]'
              }
            `}
          >
            <div className="w-full aspect-square bg-gray-100 rounded-xl mb-2 overflow-hidden shadow-inner">
              <img 
                src={getImageUrl(opt.imagePrompt, currentQ.seeds[idx])}
                alt={opt.word}
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-xl sm:text-2xl font-bold text-gray-700">{opt.word}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
