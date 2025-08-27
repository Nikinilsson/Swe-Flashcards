import React, { useState, useEffect, useCallback } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import type { MissedItem } from '../types.ts';
import { ArrowLeftIcon, SpeakerIcon } from './icons.tsx';

// Helper to shuffle an array
const shuffleArray = <T,>(array: T[]): T[] => {
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
};

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

interface SentenceScrambleProps {
  onFinish: (xpEarned: number, pointsEarned: number, missedItems: MissedItem[]) => void;
  onExit: () => void;
}

interface SentenceData {
  swedishSentence: string;
  englishSentence: string;
}

interface WordWithId {
  id: number;
  word: string;
}

const TOTAL_QUESTIONS = 20;

const SentenceScramble: React.FC<SentenceScrambleProps> = ({ onFinish, onExit }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<SentenceData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const [scrambledBank, setScrambledBank] = useState<WordWithId[]>([]);
  const [userAnswer, setUserAnswer] = useState<WordWithId[]>([]);
  
  const [status, setStatus] = useState<'playing' | 'correct' | 'incorrect'>('playing');
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const [points, setPoints] = useState(0);
  const [xp, setXp] = useState(0);
  const [attempts, setAttempts] = useState(1);
  const [missedItems, setMissedItems] = useState<MissedItem[]>([]);

  const setupQuestion = useCallback((questionData: SentenceData) => {
    setStatus('playing');
    setUserAnswer([]);
    setAttempts(1);
    const normalizedSentence = questionData.swedishSentence.toLowerCase().replace(/[.,?!]/g, '').trim();
    const wordsWithIds = normalizedSentence.split(' ').filter(w => w.length > 0).map((word, index) => ({ id: index, word }));
    setScrambledBank(shuffleArray(wordsWithIds));
  }, []);

  const generateNewSentences = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (!window.GEMINI_API_KEY || window.GEMINI_API_KEY === 'YOUR_API_KEY_HERE') {
        setError("API Key not configured.");
        setLoading(false);
        return;
    }
    
    try {
      const ai = new GoogleGenAI({ apiKey: window.GEMINI_API_KEY! });
      const sentenceSchema = {
        type: Type.OBJECT,
        properties: {
          swedishSentence: { type: Type.STRING },
          englishSentence: { type: Type.STRING },
        },
        required: ['swedishSentence', 'englishSentence'],
      };
      const responseSchema = {
        type: Type.ARRAY,
        items: sentenceSchema,
      };

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Create a JSON array of ${TOTAL_QUESTIONS} simple, unique, beginner-level Swedish sentences. Each sentence should be between 3 and 7 words long. For each, provide the English translation.`,
        config: { responseMimeType: "application/json", responseSchema }
      });

      const data: SentenceData[] = cleanAndParseJson(response.text);
      setQuestions(data);
      setupQuestion(data[0]);
    } catch (err) {
      console.error("Sentence generation failed:", err);
      setError("Could not generate sentences. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [setupQuestion]);

  useEffect(() => {
    generateNewSentences();
  }, [generateNewSentences]);
  
  const handleWordClick = (item: WordWithId, source: 'bank' | 'answer') => {
    if (status !== 'playing') return;
    if (source === 'bank') {
        setUserAnswer([...userAnswer, item]);
        setScrambledBank(scrambledBank.filter(w => w.id !== item.id));
    } else {
        setScrambledBank([...scrambledBank, item].sort((a,b) => a.id - b.id));
        setUserAnswer(userAnswer.filter(w => w.id !== item.id));
    }
  };

  const handleNextQuestion = () => {
    if (currentIndex + 1 >= questions.length) {
      onFinish(xp, points, missedItems);
    } else {
      setCurrentIndex(prev => prev + 1);
      setupQuestion(questions[currentIndex + 1]);
    }
  };

  const handleCheckAnswer = () => {
    const currentQuestion = questions[currentIndex];
    const userAnswerString = userAnswer.map(item => item.word).join(' ');
    const correctNormalized = currentQuestion.swedishSentence.toLowerCase().replace(/[.,?!]/g, '').trim();

    if (userAnswerString === correctNormalized) {
      setStatus('correct');
      if (attempts === 1) setPoints(p => p + 2);
      if (attempts === 2) setPoints(p => p + 1);
      setXp(x => x + 5);
      handlePlaySound();
    } else {
      setStatus('incorrect');
      if (attempts >= 2 && !missedItems.some(item => item.correctAnswer === currentQuestion.swedishSentence)) {
          setMissedItems(prev => [...prev, {
            mode: 'scramble',
            question: currentQuestion.englishSentence,
            userAnswer: userAnswerString,
            correctAnswer: currentQuestion.swedishSentence
          }]);
      }
      setAttempts(a => a + 1);
    }
  };

  const handleTryAgain = () => {
    setStatus('playing');
    setUserAnswer([]);
    const currentQuestion = questions[currentIndex];
    const normalizedSentence = currentQuestion.swedishSentence.toLowerCase().replace(/[.,?!]/g, '').trim();
    const wordsWithIds = normalizedSentence.split(' ').filter(w => w.length > 0).map((word, index) => ({ id: index, word }));
    setScrambledBank(shuffleArray(wordsWithIds));
  };
  
  const handlePlaySound = useCallback(() => {
    if (!('speechSynthesis' in window) || !questions[currentIndex]) return;
    const utterance = new SpeechSynthesisUtterance(questions[currentIndex].swedishSentence);
    utterance.lang = 'sv-SE';
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, [currentIndex, questions]);

  const getStatusColor = () => {
    if (status === 'correct') return 'border-green-500 bg-green-500/20';
    if (status === 'incorrect') return 'border-red-500 bg-red-500/20 animate-shake';
    return 'border-white/20 bg-black/20';
  };

  const currentQuestion = questions[currentIndex];
  
  return (
    <div className="w-full h-full flex flex-col p-4 relative text-white">
      <div className="flex items-center justify-between w-full mb-4">
        <button onClick={onExit} className="text-white bg-black/30 rounded-full p-2 hover:bg-black/50" aria-label="Return to menu"><ArrowLeftIcon /></button>
        <h2 className="text-lg font-bold text-shadow">Scramble ({currentIndex + 1}/{TOTAL_QUESTIONS})</h2>
        <div className="w-20 text-right font-bold text-yellow-400">{points} pts</div>
      </div>
      
      {loading && <div className="flex-grow flex items-center justify-center"><p className="text-lg animate-pulse">Building sentences...</p></div>}
      {error && <div className="flex-grow flex flex-col items-center justify-center"><p className="text-red-300 mb-4">{error}</p><button onClick={generateNewSentences} className="bg-blue-500 py-2 px-6 rounded-full">Try Again</button></div>}

      {!loading && !error && currentQuestion && (
        <div className="flex-grow flex flex-col justify-between">
            <div>
                <div className="text-center mb-4 bg-black/20 p-3 rounded-lg">
                    <p className="text-sm text-slate-300">Translate this sentence:</p>
                    <p className="text-lg font-semibold text-shadow">"{currentQuestion.englishSentence}"</p>
                </div>
                
                <div className={`min-h-[6rem] p-3 rounded-lg border-2 border-dashed transition-colors ${getStatusColor()}`}>
                    {userAnswer.map((item) => (<button key={item.id} onClick={() => handleWordClick(item, 'answer')} className="inline-block bg-white/90 text-slate-900 font-bold py-2 px-4 rounded-lg m-1 shadow-md">{item.word}</button>))}
                    {userAnswer.length === 0 && <span className="text-slate-400">Click words below...</span>}
                </div>
            </div>

            <div className="text-center p-2 min-h-[6rem] flex flex-wrap gap-2 items-center justify-center">
                {scrambledBank.map((item) => (<button key={item.id} onClick={() => handleWordClick(item, 'bank')} className="inline-block bg-white/20 backdrop-blur-sm font-bold py-2 px-4 rounded-lg shadow-md hover:bg-white/40 transform hover:scale-105">{item.word}</button>))}
            </div>
            
            <div className="mt-auto pt-4">
                {status === 'playing' && <button onClick={handleCheckAnswer} disabled={userAnswer.length === 0} className="w-full bg-green-500 font-bold py-3 rounded-full shadow-lg text-lg hover:bg-green-600 disabled:bg-slate-500">Check Answer</button>}
                {status === 'correct' && (
                  <div className="text-center">
                    <p className="text-green-300 font-bold text-shadow mb-2">Correct!</p>
                    <p className="text-white text-lg mb-3 font-semibold">{currentQuestion.swedishSentence}</p>
                    <div className="flex items-center justify-center space-x-4">
                      <button onClick={handlePlaySound} className="bg-black/30 rounded-full p-3 hover:bg-black/50"><SpeakerIcon className={isSpeaking ? 'text-blue-400 animate-pulse' : ''} /></button>
                      <button onClick={handleNextQuestion} className="flex-grow bg-blue-500 font-bold py-3 rounded-full shadow-lg text-lg hover:bg-blue-600">Next</button>
                    </div>
                  </div>
                )}
                {status === 'incorrect' && (
                  <div>
                    <p className="text-center text-red-300 font-bold mb-2">Not quite, try again!</p>
                    {attempts < 3 ? (
                       <button onClick={handleTryAgain} className="w-full bg-yellow-500 text-white font-bold py-3 rounded-full shadow-lg text-lg hover:bg-yellow-600">Try Again ({3 - attempts} left)</button>
                    ) : (
                       <div className="text-center">
                         <p className="text-sm">Correct answer:</p>
                         <p className="font-semibold text-lg mb-3">{currentQuestion.swedishSentence}</p>
                         <button onClick={handleNextQuestion} className="w-full bg-blue-500 font-bold py-3 rounded-full shadow-lg text-lg hover:bg-blue-600">Next</button>
                       </div>
                    )}
                  </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
};

export default SentenceScramble;
