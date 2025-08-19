

export interface Word {
  swedish: string;
  english: string;
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
