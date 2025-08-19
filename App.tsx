


import React, { useState, useCallback, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { words as staticWords } from './data/words.ts';
import Flashcard from './components/Flashcard.tsx';
import IconButton from './components/IconButton.tsx';
import { ArrowLeftIcon, ArrowRightIcon, TrophyIcon } from './components/icons.tsx';
import WeeklyProgress from './components/WeeklyProgress.tsx';
import ChallengeMode from './components/ChallengeMode.tsx';
import WelcomeScreen from './components/WelcomeScreen.tsx';
import SentenceScramble from './components/SentenceScramble.tsx';
import type { Word, UserStats, LevelInfo } from './types.ts';

// Extend the window interface to declare our custom API key property
declare global {
  interface Window {
    GEMINI_API_KEY?: string;
  }
}

// Helper function to handle JSON parsing, even if wrapped in markdown
const cleanAndParseJson = (text: string): any => {
  let cleanedText = text.trim();
  if (cleanedText.startsWith('```json')) {
    cleanedText = cleanedText.substring(7).trim();
  }
  if (cleanedText.endsWith('```')) {
    cleanedText = cleanedText.substring(0, cleanedText.length - 3).trim();
  }
  return JSON.parse(cleanedText);
};

// Helper to get a date string in YYYY-MM-DD format from the local timezone
const toLocaleDateStringISO = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const LEVELS = [
  { level: 1, name: "Nybörjare", xp: 0 },
  { level: 2, name: "Lärling", xp: 100 },
  { level: 3, name: "Utforskare", xp: 250 },
  { level: 4, name: "Talare", xp: 500 },
  { level: 5, name: "Expert", xp: 1000 },
  { level: 6, name: "Mästare", xp: 2000 },
];

const calculateLevelInfo = (xp: number): LevelInfo => {
    const currentLevel = [...LEVELS].reverse().find(l => xp >= l.xp) || LEVELS[0];
    const nextLevel = LEVELS.find(l => l.xp > xp);

    if (!nextLevel) { // Max level
        return { ...currentLevel, nextLevelXp: xp, progressPercent: 100 };
    }

    const levelXp = currentLevel.xp;
    const nextLevelXp = nextLevel.xp;
    const xpInLevel = xp - levelXp;
    const xpForNextLevel = nextLevelXp - levelXp;
    const progressPercent = Math.min(100, (xpInLevel / xpForNextLevel) * 100);

    return { ...currentLevel, nextLevelXp, progressPercent };
};


const App: React.FC = () => {
  const [words, setWords] = useState<Word[]>(staticWords);
  const [funFact, setFunFact] = useState<string>('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [apiKeyStatus, setApiKeyStatus] = useState<'checking' | 'valid' | 'invalid'>('checking');
  const [weeklyProgress, setWeeklyProgress] = useState<boolean[]>(new Array(7).fill(false));
  const [completionCount, setCompletionCount] = useState<number>(0);
  const [view, setView] = useState<'welcome' | 'flashcard' | 'challenge' | 'scramble'>('welcome');
  const [userStats, setUserStats] = useState<UserStats>({ streak: 0, xp: 0, lastCompletionDate: null });
  const [levelInfo, setLevelInfo] = useState<LevelInfo>(calculateLevelInfo(0));

   const logCompletionAndRefreshProgress = useCallback((dateStr: string) => {
      const storedDatesRaw = localStorage.getItem('svenskaCompletionDates');
      let completedDates: string[] = storedDatesRaw ? JSON.parse(storedDatesRaw) : [];
      if (!completedDates.includes(dateStr)) {
        completedDates.push(dateStr);
        localStorage.setItem('svenskaCompletionDates', JSON.stringify(completedDates));
      }
      updateWeeklyProgressDisplay(completedDates);
    }, []);

    const updateWeeklyProgressDisplay = useCallback((completedDates: string[]) => {
      const getStartOfWeek = (date: Date): Date => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        d.setHours(0, 0, 0, 0);
        return new Date(d.setDate(diff));
      };

      const today = new Date();
      const startOfWeek = getStartOfWeek(today);
      const progress: boolean[] = [];
      let count = 0;
      for (let i = 0; i < 7; i++) {
        const day = new Date(startOfWeek);
        day.setDate(startOfWeek.getDate() + i);
        const dayStr = toLocaleDateStringISO(day);
        if (completedDates.includes(dayStr)) {
          progress.push(true);
          count++;
        } else {
          progress.push(false);
        }
      }
      setWeeklyProgress(progress);
      setCompletionCount(count);
    }, []);

  useEffect(() => {
    // Check for API Key first.
    if (!window.GEMINI_API_KEY || window.GEMINI_API_KEY === 'YOUR_API_KEY_HERE') {
        setApiKeyStatus('invalid');
        setLoading(false);
        return;
    }
    setApiKeyStatus('valid');

    // Load user stats from localStorage
    const storedStatsRaw = localStorage.getItem('svenskaUserStats');
    if (storedStatsRaw) {
      try {
        const storedStats: UserStats = JSON.parse(storedStatsRaw);
        // Streak validation
        const todayStr = toLocaleDateStringISO(new Date());
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = toLocaleDateStringISO(yesterday);
        
        if (storedStats.lastCompletionDate !== todayStr && storedStats.lastCompletionDate !== yesterdayStr) {
          storedStats.streak = 0; // Reset streak if they missed more than a day
        }
        setUserStats(storedStats);
        setLevelInfo(calculateLevelInfo(storedStats.xp));
      } catch (e) {
        console.error("Failed to parse user stats from localStorage", e);
      }
    }
    
    const fetchDailyContent = async () => {
      const todayStr = toLocaleDateStringISO(new Date());
      const storedDate = localStorage.getItem('svenskaWordsDate');
      const storedWords = localStorage.getItem('svenskaWords');
      const storedFact = localStorage.getItem('svenskaFunFact');

      const initialDatesRaw = localStorage.getItem('svenskaCompletionDates');
      updateWeeklyProgressDisplay(initialDatesRaw ? JSON.parse(initialDatesRaw) : []);

      if (storedDate === todayStr && storedWords && storedFact) {
        try {
          const parsedWords: Word[] = JSON.parse(storedWords);
          if (Array.isArray(parsedWords) && parsedWords.length > 0) {
            setWords(parsedWords);
            setFunFact(storedFact);
            setLoading(false);
            return;
          }
        } catch (e) { console.error("Failed to parse content from localStorage", e); }
      }

      setLoading(true);
      setError(null);
      try {
        const ai = new GoogleGenAI({ apiKey: window.GEMINI_API_KEY! });
        const wordsSchema = {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT, properties: { swedish: { type: Type.STRING }, english: { type: Type.STRING } },
            required: ['swedish', 'english'],
          },
        };

        const wordsPromise = ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: "Generate a list of 20 simple Swedish words for a beginner flashcard app, along with their English translations. Focus on common nouns, verbs, and greetings.",
          config: { responseMimeType: "application/json", responseSchema: wordsSchema }
        });

        const factPromise = ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: "Generate one short, interesting, and fun fact about Sweden. The fact should be a single sentence and not enclosed in quotes.",
        });

        const [wordsResponse, factResponse] = await Promise.all([wordsPromise, factPromise]);
        const newWords: Word[] = cleanAndParseJson(wordsResponse.text);
        const newFact = factResponse.text.trim();

        if (Array.isArray(newWords) && newWords.length > 0 && newFact) {
          setWords(newWords); setFunFact(newFact); setCurrentIndex(0);
          localStorage.setItem('svenskaWords', JSON.stringify(newWords));
          localStorage.setItem('svenskaFunFact', newFact);
          localStorage.setItem('svenskaWordsDate', todayStr);
        } else { throw new Error("API returned invalid data format."); }
      } catch (err) {
        console.error("Failed to fetch new content:", err);
        setError("Could not generate new content. Using the default set.");
        setWords(staticWords);
        setFunFact("Sweden is the third-largest country in the European Union by area.");
      } finally {
        setLoading(false);
      }
    };

    fetchDailyContent();
  }, [updateWeeklyProgressDisplay]);

  const handleNext = useCallback(() => setCurrentIndex((prev) => (prev + 1) % words.length), [words.length]);
  const handlePrev = useCallback(() => setCurrentIndex((prev) => (prev - 1 + words.length) % words.length), [words.length]);

  const handleActivityComplete = (xpEarned: number) => {
    const todayStr = toLocaleDateStringISO(new Date());
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = toLocaleDateStringISO(yesterday);
    
    const newStats = { ...userStats };
    newStats.xp += xpEarned;

    // If this is the first activity of the day, update streak and progress
    if (newStats.lastCompletionDate !== todayStr) {
      if (newStats.lastCompletionDate === yesterdayStr) {
        newStats.streak++; // Continue streak
      } else {
        newStats.streak = 1; // Start new streak
      }
      newStats.lastCompletionDate = todayStr;
      logCompletionAndRefreshProgress(todayStr);
    }
    
    setUserStats(newStats);
    setLevelInfo(calculateLevelInfo(newStats.xp));
    localStorage.setItem('svenskaUserStats', JSON.stringify(newStats));
    setView('welcome');
  };
  

  const today = new Date();
  const currentDayIndex = (today.getDay() + 6) % 7;
  const formattedDate = today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  if (apiKeyStatus === 'invalid') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-800 text-white">
        <div className="w-full max-w-lg text-left bg-slate-900/50 p-8 rounded-2xl shadow-2xl border border-red-500/50">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Configuration Error</h1>
          <p className="text-slate-300 mb-4">The Gemini API key is missing or invalid.</p>
          <p className="text-slate-300 mb-2">To fix this for deployment on a platform like Netlify:</p>
          <ol className="list-decimal list-inside text-slate-400 space-y-2">
            <li>Go to your site settings on Netlify.</li>
            <li>Navigate to "Build & deploy" &gt; "Post processing" &gt; "Snippet injection".</li>
            <li>Click "Add snippet", set it to "Insert before &lt;/head&gt;", and add the following script:</li>
          </ol>
          <pre className="bg-slate-800 text-yellow-200 p-3 rounded-md mt-4 text-sm whitespace-pre-wrap">
            <code>
              {'<script>window.GEMINI_API_KEY = "YOUR_API_KEY_HERE";</script>'}
            </code>
          </pre>
          <p className="text-slate-400 mt-4">Replace <code className="bg-slate-700 p-1 rounded-md text-xs">YOUR_API_KEY_HERE</code> with your actual Gemini API key.</p>
        </div>
      </div>
    );
  }

  const currentWord = words[currentIndex];

  const renderContent = () => {
    switch (view) {
      case 'welcome':
        return <WelcomeScreen onModeSelect={(mode) => setView(mode)} loading={loading} stats={userStats} levelInfo={levelInfo} />;
      case 'challenge':
        return <ChallengeMode words={words} onComplete={handleActivityComplete} onExit={() => setView('welcome')} />;
      case 'scramble':
        return <SentenceScramble words={words} onFinish={handleActivityComplete} onExit={() => setView('welcome')}/>;
      case 'flashcard':
      default:
        return (
          <div className="flex-grow flex flex-col">
            <main className="flex-grow flex flex-col items-center justify-center p-4 space-y-4">
              <div className="text-center bg-black/20 text-white p-2 rounded-lg">
                <p className="font-medium text-shadow">{formattedDate}</p>
                {error && <p className="text-red-300 text-sm mt-1 text-shadow">{error}</p>}
              </div>
              <div className="w-full h-64 md:h-72">
                {loading ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <p className="text-white text-lg font-semibold bg-black/30 p-4 rounded-lg animate-pulse">Generating today's words...</p>
                  </div>
                ) : (
                  currentWord && <Flashcard key={currentIndex} word={currentWord} />
                )}
              </div>
              <div className="w-full flex items-center justify-between">
                <IconButton onClick={handlePrev} aria-label="Previous word" disabled={loading || currentIndex === 0}>
                  <ArrowLeftIcon />
                </IconButton>
                <p className="text-white font-semibold text-lg bg-black/30 px-4 py-2 rounded-full text-shadow">
                  {!loading && words.length > 0 ? `${currentIndex + 1} / ${words.length}` : '...'}
                </p>
                {currentIndex === words.length - 1 && !loading ? (
                   <button 
                     onClick={() => handleActivityComplete(10)}
                     className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-green-600 active:shadow-inner active:bg-green-700 backdrop-blur-sm border border-white/30 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-white" 
                     title="Finish Flashcards"
                     aria-label="Finish flashcards and return to menu"
                   >
                     <TrophyIcon className="h-7 w-7"/>
                   </button>
                 ) : (
                   <IconButton onClick={handleNext} aria-label="Next word" disabled={loading}>
                     <ArrowRightIcon />
                   </IconButton>
                )}
              </div>
              <div className="w-full text-center pt-2 px-2 min-h-[40px] flex items-center justify-center">
                  {loading ? ( <div className="h-5 bg-black/20 rounded-md animate-pulse w-4/5 mx-auto"></div> ) : (
                      funFact && ( <p className="font-cursive text-xl text-white/90 text-shadow">"{funFact}"</p> )
                  )}
              </div>
            </main>
          </div>
        );
    }
  };

  return (
    <div
      className="min-h-screen w-full bg-cover bg-center flex items-center justify-center p-4 relative"
      style={{ backgroundImage: "url('https://images.unsplash.com/photo-1510798831971-661eb04b3739?q=80&w=2580&auto=format&fit=crop')" }}
    >
      <div className="absolute inset-0 w-full h-full bg-gradient-to-b from-black/50 via-transparent to-black/70 z-0"></div>
      <div className="relative z-10 w-full max-w-sm md:max-w-md flex flex-col bg-slate-900/30 backdrop-blur-lg rounded-2xl shadow-xl overflow-hidden min-h-[600px] md:min-h-[650px]">
          <WeeklyProgress progress={weeklyProgress} count={completionCount} currentDayIndex={currentDayIndex} />
          {renderContent()}
      </div>
    </div>
  );
};

export default App;