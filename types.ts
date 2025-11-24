
export enum GameType {
  LETTERS = 'LETTERS',
  NIKKUD = 'NIKKUD',
  SENTENCES = 'SENTENCES',
}

export interface UserProgress {
  coins: number;
  badges: string[];
  unlockedLevels: {
    [GameType.LETTERS]: number;
    [GameType.NIKKUD]: number;
    [GameType.SENTENCES]: number;
  };
}

// Data structures for Gemini Responses

export interface LetterQuestion {
  targetLetter: string;
  questionText: string; // e.g. "Find the word starting with..."
  options: {
    word: string;
    isCorrect: boolean;
    imagePrompt: string; // Mandatory now
  }[];
}

export interface NikkudQuestion {
  wordWithoutNikkud: string;
  fullWord: string;
  missingNikkudName: string; // e.g. "Kamatz"
  missingNikkudSymbol: string; // e.g. "ָ"
  options: string[]; // Array of nikkud symbols
  imageDescription: string;
}

export interface SentenceQuestion {
  sentenceParts: string[]; // ["The dog ", " the food"] - Text surrounding the gap
  missingWord: string;
  options: string[];
  imageDescription: string;
}
