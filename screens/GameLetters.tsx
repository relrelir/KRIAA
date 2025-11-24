
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
const BUFFER_TARGET = 3;

// --- HELPER FUNCTIONS ---

const getImageUrl = (prompt: string, seed: string) => {
  return `https://image.pollinations.ai/prompt/cute%20colorful%203d%20render%20cartoon%20of%20${encodeURIComponent(prompt)}?width=100&height=100&nologo=true&seed=${seed}`;
};

const preloadImagesForQuestion = async (q: LetterQuestion, seeds: string[]) => {
  const promises = q.options.map((opt, i) => new Promise<void>((resolve) => {
    const img = new Image();
    img.src = getImageUrl(opt.imagePrompt, seeds[i]);
    img.onload = () => resolve();
    img.onerror = () => resolve(); // Proceed even if image fails
  }));
  await Promise.all(promises);
};

// --- TYPES ---

interface PreparedQuestion {
  data: LetterQuestion;
  seeds: string[];
}

export const GameLetters: React.FC<Props> = ({ level, onComplete }) => {
  // UI State
  const [currentQ, setCurrentQ] = useState<PreparedQuestion | null>(null);
  const [score, setScore] = useState(0); 
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [isError, setIsError] = useState(false);

  // Refs for logic (Queue, Locks, Blacklist)
  const queue = useRef<PreparedQuestion[]>([]);
  const usedWords = useRef<Set<string>>(new Set());
  const isFetching = useRef(false);
  const isMounted = useRef(false);
  
  // Track if we are done with the session to stop fetching
  const isSessionFinished = useRef(false);

  // --- LIFECYCLE ---

  useEffect(() => {
    isMounted.current = true;
    startNewSession();
    return () => { isMounted.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  // Audio trigger for new question
  useEffect(() => {
    if (currentQ && !isSessionFinished.current) {
      const timer = setTimeout(() => {
        if (isMounted.current) speakHebrew(currentQ.data.questionText);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [currentQ]);

  // --- LOGIC ---

  const startNewSession = () => {
    // Reset State
    setScore(0);
    setSelectedIdx(null);
    setCurrentQ(null);
    setIsError(false);
    
    // Reset Refs
    queue.current = [];
    usedWords.current.clear();
    isFetching.current = false;
    isSessionFinished.current = false;

    // Start filling buffer
    fillBuffer();
  };

  // Background Loop to keep queue full
  const fillBuffer = async () => {
    if (!isMounted.current || isSessionFinished.current) return;
    if (isFetching.current) return;
    if (queue.current.length >= BUFFER_TARGET) return;

    isFetching.current = true;

    try {
      const excludeList = Array.from(usedWords.current) as string[];
      
      // 1. Fetch from Gemini
      const q = await generateLetterQuestion(level, excludeList);
      
      if (!isMounted.current || isSessionFinished.current) return;

      // 2. Speculative Exclusion: Add correct word to blacklist immediately
      const correctOption = q.options.find(o => o.isCorrect);
      if (correctOption) {
        usedWords.current.add(correctOption.word);
      }

      // 3. Preload Images (Critical for zero latency)
      const seeds = q.options.map(() => Math.random().toString(36).substring(7));
      await preloadImagesForQuestion(q, seeds);

      if (!isMounted.current || isSessionFinished.current) return;

      // 4. Add to Queue
      const prepared: PreparedQuestion = { data: q, seeds };
      queue.current.push(prepared);

      // 5. If UI is empty, serve immediately
      setCurrentQ(prev => prev ? prev : (queue.current.shift() || null));

    } catch (err) {
      console.error("Fetch error:", err);
      // Only show error if we have NOTHING to show
      if (!currentQ && queue.current.length === 0) {
        setIsError(true);
      }
    } finally {
      isFetching.current = false;
      // Recursively fill buffer if needed
      if (isMounted.current && !isSessionFinished.current && queue.current.length < BUFFER_TARGET) {
        fillBuffer();
      }
    }
  };

  const handleOptionClick = (index: number) => {
    if (!currentQ || selectedIdx !== null) return;

    setSelectedIdx(index);
    const option = currentQ.data.options[index];
    speakHebrew(option.word);

    if (option.isCorrect) {
      // --- CORRECT ---
      playSound('correct');

      // The critical logic for 5-question session
      setTimeout(() => {
        if (!isMounted.current) return;

        const newScore = score + 1;
        setScore(newScore);

        if (newScore >= QUESTIONS_PER_SESSION) {
          // SESSION COMPLETE
          isSessionFinished.current = true;
          onComplete(true);
        } else {
          // CONTINUE SESSION
          setSelectedIdx(null);
          
          // Instant switch to next question
          const nextQ = queue.current.shift();
          if (nextQ) {
            setCurrentQ(nextQ);
          } else {
            // Buffer empty (should be rare), show loader by setting null
            setCurrentQ(null);
          }
          // Trigger buffer refill
          fillBuffer();
        }
      }, 700);

    } else {
      // --- WRONG ---
      playSound('wrong');
      setTimeout(() => {
        if (isMounted.current) {
          speakHebrew("נסה שוב");
          setSelectedIdx(null);
        }
      }, 1000);
    }
  };

  // --- RENDER ---

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-xl text-gray-600 mb-4">אופס, היתה בעיה בטעינה</p>
        <button 
          onClick={startNewSession} 
          className="bg-brand-blue text-white px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg active:scale-95 transition-transform"
        >
          <RefreshCw className="w-5 h-5" />
          נסה שוב
        </button>
      </div>
    );
  }

  // Loader (Only shows at start or if buffer runs dry)
  if (!currentQ) {
    return (
      <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-sky-50">
        <Loader2 className="w-12 h-12 animate-spin text-brand-blue" />
        <p className="mt-4 text-xl font-bold text-gray-500">
          {queue.current.length > 0 ? 'כמעט מוכן...' : 'מכין שאלות...'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-4 items-center w-full max-w-md mx-auto">
      
      {/* Progress Bar (0 to 5) */}
      <div className="w-full flex gap-2 mb-6">
        {Array.from({ length: QUESTIONS_PER_SESSION }).map((_, i) => (
          <div 
            key={i} 
            className={`h-3 flex-1 rounded-full transition-all duration-500 shadow-sm
              ${i < score ? 'bg-green-500 scale-100' : 'bg-gray-200 scale-95'}
            `}
          />
        ))}
      </div>

      {/* Question Card */}
      <div className="w-full bg-white p-6 rounded-3xl shadow-lg border-b-4 border-gray-200 text-center mb-6 relative animate-in zoom-in-95 duration-300">
        <button 
          onClick={() => speakHebrew(currentQ.data.questionText)}
          className="absolute top-3 right-3 p-2 bg-gray-50 rounded-full hover:bg-gray-100 text-gray-400 hover:text-brand-blue transition-colors"
        >
          🔊
        </button>
        <h2 className="text-2xl font-bold text-gray-700 mb-4">{currentQ.data.questionText}</h2>
        <div className="inline-block bg-yellow-50 px-8 py-4 rounded-2xl border-2 border-brand-yellow/50 shadow-sm">
          <span className="text-7xl font-bold text-brand-blue drop-shadow-sm">{currentQ.data.targetLetter}</span>
        </div>
      </div>

      {/* Answers Grid */}
      <div className="grid grid-cols-2 gap-4 w-full flex-1 min-h-0">
        {currentQ.data.options.map((opt, idx) => {
          const isSelected = selectedIdx === idx;
          const statusColor = isSelected 
            ? (opt.isCorrect ? 'bg-green-100 border-green-500 ring-4 ring-green-200' : 'bg-red-100 border-red-500 ring-4 ring-red-200')
            : 'bg-white border-brand-blue/20 hover:border-brand-blue hover:shadow-md';

          return (
            <button
              key={`${currentQ.data.targetLetter}-${idx}`}
              onClick={() => handleOptionClick(idx)}
              className={`
                relative flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all duration-200
                ${statusColor}
                active:scale-[0.98]
              `}
            >
              <div className="w-full aspect-square bg-gray-50 rounded-xl mb-3 overflow-hidden shadow-inner">
                <img 
                  src={getImageUrl(opt.imagePrompt, currentQ.seeds[idx])}
                  alt={opt.word}
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-xl sm:text-2xl font-bold text-gray-700">{opt.word}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};