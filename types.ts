

export interface Word {
  swedish: string;
  english: string;
  swedishSentence?: string;
  englishSentence?: string;
}

export interface UserStats {
  streak: number;
  xp: number;
  lastCompletionDate: string | null;
}

export interface LevelInfo {
  level: number;
  name: string;
  xp: number;
  nextLevelXp: number;
  progressPercent: number;
}

export interface MissedItem {
  mode: 'scramble' | 'grammar' | 'quiz';
  question: string; // The correct sentence, grammar question, or English word
  userAnswer: string;
  correctAnswer: string;
}

export interface PointsSummary {
  flashcard?: number;
  scramble?: number;
  grammar?: number;
  challenge?: number;
  quiz?: number;
}

export interface DailyResult {
  date: string;
  totalPoints: number;
  points: PointsSummary;
  missedItems: MissedItem[];
}

export interface ActivityProgress {
  date: string;
  completedModes: ('flashcard' | 'scramble' | 'grammar' | 'challenge' | 'quiz')[];
  points: PointsSummary;
  missedItems: MissedItem[];
}
