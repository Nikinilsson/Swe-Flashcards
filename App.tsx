import React, { useState, useCallback, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { words as staticWords } from './data/words.ts';
import Flashcard from './components/Flashcard.tsx';
import IconButton from './components/IconButton.tsx';
import { ArrowLeftIcon, ArrowRightIcon } from './components/icons.tsx';
import WeeklyProgress from './components/WeeklyProgress.tsx';
import ChallengeMode from './components/ChallengeMode.tsx';
import type { Word } from './types.ts';

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


const App: React.FC = () => {
  const [words, setWords] = useState<Word[]>(staticWords);
  const [funFact, setFunFact] = useState<string>('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [apiKeyStatus, setApiKeyStatus] = useState<'checking' | 'valid' | 'invalid'>('checking');
  const [weeklyProgress, setWeeklyProgress] = useState<boolean[]>(new Array(7).fill(false));
  const [completionCount, setCompletionCount] = useState<number>(0);
  const [mode, setMode] = useState<'flashcard' | 'challenge'>('flashcard');

  useEffect(() => {
    // Check for API Key first. This prevents the app from crashing.
    if (!window.GEMINI_API_KEY || window.GEMINI_API_KEY === 'YOUR_API_KEY_HERE') {
        setApiKeyStatus('invalid');
        setLoading(false);
        return;
    }
    setApiKeyStatus('valid');
    
    // Helper to get Monday of the week for a given date
    const getStartOfWeek = (date: Date): Date => {
      const d = new Date(date);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
      d.setHours(0, 0, 0, 0);
      return new Date(d.setDate(diff));
    };

    const updateWeeklyProgressDisplay = (completedDates: string[]) => {
      const today = new Date();
      const startOfWeek = getStartOfWeek(today);

      const progress: boolean[] = [];
      let count = 0;

      for (let i = 0; i < 7; i++) {
        const day = new Date(startOfWeek);
        day.setDate(startOfWeek.getDate() + i);
        const dayStr = day.toISOString().split('T')[0];
        
        if (completedDates.includes(dayStr)) {
          progress.push(true);
          count++;
        } else {
          progress.push(false);
        }
      }
      setWeeklyProgress(progress);
      setCompletionCount(count);
    };

    const logCompletionAndRefreshProgress = (dateStr: string) => {
      const storedDatesRaw = localStorage.getItem('svenskaCompletionDates');
      let completedDates: string[] = storedDatesRaw ? JSON.parse(storedDatesRaw) : [];
      if (!completedDates.includes(dateStr)) {
        completedDates.push(dateStr);
        localStorage.setItem('svenskaCompletionDates', JSON.stringify(completedDates));
      }
      updateWeeklyProgressDisplay(completedDates);
    };
    
    const fetchDailyContent = async () => {
      const todayStr = new Date().toISOString().split('T')[0];
      const storedDate = localStorage.getItem('svenskaWordsDate');
      const storedWords = localStorage.getItem('svenskaWords');
      const storedFact = localStorage.getItem('svenskaFunFact');

      // Immediately update progress display with stored data on load
      const initialDatesRaw = localStorage.getItem('svenskaCompletionDates');
      updateWeeklyProgressDisplay(initialDatesRaw ? JSON.parse(initialDatesRaw) : []);

      if (storedDate === todayStr && storedWords && storedFact) {
        try {
          const parsedWords: Word[] = JSON.parse(storedWords);
          if (Array.isArray(parsedWords) && parsedWords.length > 0) {
            setWords(parsedWords);
            setFunFact(storedFact);
            logCompletionAndRefreshProgress(todayStr);
            setLoading(false);
            return;
          }
        } catch (e) {
          console.error("Failed to parse content from localStorage", e);
        }
      }

      setLoading(true);
      setError(null);
      try {
        const ai = new GoogleGenAI({ apiKey: window.GEMINI_API_KEY! });
        const wordsSchema = {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              swedish: { type: Type.STRING },
              english: { type: Type.STRING },
            },
            required: ['swedish', 'english'],
          },
        };

        const wordsPromise = ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: "Generate a list of 20 simple Swedish words for a beginner flashcard app, along with their English translations. Focus on common nouns, verbs, and greetings.",
          config: {
            responseMimeType: "application/json",
            responseSchema: wordsSchema,
          }
        });

        const factPromise = ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: "Generate one short, interesting, and fun fact about Sweden. The fact should be a single sentence and not enclosed in quotes.",
        });

        const [wordsResponse, factResponse] = await Promise.all([wordsPromise, factPromise]);
        
        const newWords: Word[] = cleanAndParseJson(wordsResponse.text);
        const newFact = factResponse.text.trim();

        if (Array.isArray(newWords) && newWords.length > 0 && newFact) {
          setWords(newWords);
          setFunFact(newFact);
          setCurrentIndex(0);
          localStorage.setItem('svenskaWords', JSON.stringify(newWords));
          localStorage.setItem('svenskaFunFact', newFact);
          localStorage.setItem('svenskaWordsDate', todayStr);
          logCompletionAndRefreshProgress(todayStr);
        } else {
          throw new Error("API returned invalid data format.");
        }
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
  }, []);

  const handleNext = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % words.length);
  }, [words.length]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + words.length) % words.length);
  }, [words.length]);
  
  const today = new Date();
  const dateOptions: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
  const formattedDate = today.toLocaleDateString('en-US', dateOptions);

  if (apiKeyStatus === 'invalid') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-red-100">
        <div className="w-full max-w-sm text-center bg-white p-8 rounded-2xl shadow-2xl border-2 border-red-500">
          <h1 className="text-2xl font-bold text-red-700 mb-4">Configuration Error</h1>
          <p className="text-slate-600">
            The Gemini API key has not been configured correctly. Please follow the deployment instructions to add your API key.
          </p>
        </div>
      </div>
    );
  }

  const currentWord = words[currentIndex];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-200">
      <div
        className="w-full max-w-sm h-[700px] rounded-3xl shadow-2xl flex flex-col overflow-hidden border-4 border-gray-800 bg-cover bg-center relative"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1510798831971-661eb04b3739?q=80&w=2580&auto=format&fit=crop')",
        }}
      >
        <div className="absolute inset-0 w-full h-full bg-gradient-to-b from-black/40 via-transparent to-black/60 z-0"></div>
        <div className="relative z-10 flex flex-col w-full h-full">

          <WeeklyProgress
            progress={weeklyProgress}
            count={completionCount}
            onChallengeClick={() => setMode('challenge')}
            mode={mode}
            disabled={loading}
          />

          {mode === 'flashcard' ? (
            <>
              <main className="flex-grow flex flex-col items-center justify-center p-4 space-y-4">
                <div className="text-center bg-black/20 text-white p-2 rounded-lg">
                  <p className="font-medium text-shadow">{formattedDate}</p>
                  {error && <p className="text-red-300 text-sm mt-1 text-shadow">{error}</p>}
                </div>

                <div className="w-full h-64">
                  {loading ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <p className="text-white text-lg font-semibold bg-black/30 p-4 rounded-lg animate-pulse">Generating today's words...</p>
                    </div>
                  ) : (
                    currentWord && <Flashcard key={currentIndex} word={currentWord} />
                  )}
                </div>

                <div className="w-full flex items-center justify-between">
                  <IconButton onClick={handlePrev} aria-label="Previous word" disabled={loading}>
                    <ArrowLeftIcon />
                  </IconButton>
                  <p className="text-white font-semibold text-lg bg-black/30 px-4 py-2 rounded-full text-shadow">
                    {!loading && words.length > 0 ? `${currentIndex + 1} / ${words.length}` : '...'}
                  </p>
                  <IconButton onClick={handleNext} aria-label="Next word" disabled={loading}>
                    <ArrowRightIcon />
                  </IconButton>
                </div>
                
                <div className="w-full text-center pt-2 px-2 min-h-[40px] flex items-center justify-center">
                    {loading ? (
                        <div className="h-5 bg-black/20 rounded-md animate-pulse w-4/5 mx-auto"></div>
                    ) : (
                        funFact && (
                            <p className="font-cursive text-xl text-white/90 text-shadow">
                                "{funFact}"
                            </p>
                        )
                    )}
                </div>
              </main>

              <footer className="p-3">
                  <div className="w-24 h-1.5 bg-slate-400/50 rounded-full mx-auto"></div>
              </footer>
            </>
          ) : (
            <ChallengeMode words={words} onExit={() => setMode('flashcard')} />
          )}
        </div>
      </div>
    </div>
  );
};

export default App;