

import React, { useState, useEffect, useCallback } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import type { Word } from '../types.ts';
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

interface SentenceScrambleProps {
  words: Word[];
  onFinish: (xpEarned: number) => void;
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

const SentenceScramble: React.FC<SentenceScrambleProps> = ({ words, onFinish, onExit }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sentenceData, setSentenceData] = useState<SentenceData | null>(null);
  const [scrambledBank, setScrambledBank] = useState<WordWithId[]>([]);
  const [userAnswer, setUserAnswer] = useState<WordWithId[]>([]);
  const [status, setStatus] = useState<'playing' | 'correct' | 'incorrect'>('playing');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);

  const generateNewSentence = useCallback(async () => {
    setLoading(true);
    setError(null);
    setStatus('playing');
    setUserAnswer([]);
    setSentenceData(null);

    if (!window.GEMINI_API_KEY || window.GEMINI_API_KEY === 'YOUR_API_KEY_HERE') {
        setError("API Key not configured.");
        setLoading(false);
        return;
    }
    
    try {
      const randomWord = words[Math.floor(Math.random() * words.length)];
      const ai = new GoogleGenAI({ apiKey: window.GEMINI_API_KEY });
      const sentenceSchema = {
        type: Type.OBJECT,
        properties: {
          swedishSentence: { type: Type.STRING },
          englishSentence: { type: Type.STRING },
        },
        required: ['swedishSentence', 'englishSentence'],
      };
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Create a simple, beginner-level Swedish sentence using the word "${randomWord.swedish}". The sentence must be between 3 and 6 words long. Provide the English translation as well.`,
        config: {
            responseMimeType: "application/json",
            responseSchema: sentenceSchema,
        }
      });

      const data: SentenceData = cleanAndParseJson(response.text);
      const wordsWithIds = data.swedishSentence.split(' ').map((word, index) => ({ id: index, word }));
      setSentenceData(data);
      setScrambledBank(shuffleArray(wordsWithIds));
    } catch (err) {
      console.error("Sentence generation failed:", err);
      setError("Could not generate a sentence. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [words]);

  useEffect(() => {
    generateNewSentence();
  }, [generateNewSentence]);
  
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

  const handleResetAttempt = () => {
    setStatus('playing');
    setUserAnswer([]);
    if (sentenceData) {
        const wordsWithIds = sentenceData.swedishSentence.split(' ').map((word, index) => ({ id: index, word }));
        setScrambledBank(shuffleArray(wordsWithIds));
    }
  };

  const handleCheckAnswer = () => {
    if (userAnswer.map(item => item.word).join(' ') === sentenceData?.swedishSentence) {
      setStatus('correct');
      setXpEarned(prev => prev + 5); // Award XP
      handlePlaySound();
    } else {
      setStatus('incorrect');
    }
  };
  
  const handlePlaySound = useCallback(() => {
    if (!('speechSynthesis' in window) || !sentenceData) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(sentenceData.swedishSentence);
    utterance.lang = 'sv-SE';
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    const voices = window.speechSynthesis.getVoices();
    const swedishVoice = voices.find(voice => voice.lang === 'sv-SE');
    if (swedishVoice) utterance.voice = swedishVoice;
    
    window.speechSynthesis.speak(utterance);
  }, [sentenceData]);

  const getStatusColor = () => {
    if (status === 'correct') return 'border-green-500 bg-green-500/20';
    if (status === 'incorrect') return 'border-red-500 bg-red-500/20 animate-shake';
    return 'border-white/20 bg-black/20';
  };
  
  return (
    <div className="w-full h-full flex flex-col p-4 relative text-white">
      <div className="flex items-center justify-between w-full mb-4">
        <button onClick={onExit} className="text-white bg-black/30 rounded-full p-2 hover:bg-black/50 transition-colors z-20" aria-label="Return to menu">
            <ArrowLeftIcon />
        </button>
        <h2 className="text-xl font-bold text-shadow">Sentence Scramble</h2>
        <div className="w-10 text-right font-bold text-yellow-400">+{xpEarned} XP</div>
      </div>
      
      {loading && (
          <div className="flex-grow flex items-center justify-center">
              <p className="text-white text-lg font-semibold bg-black/30 p-4 rounded-lg animate-pulse">Building a new sentence...</p>
          </div>
      )}

      {error && (
          <div className="flex-grow flex flex-col items-center justify-center text-center">
              <p className="text-red-300 text-lg mb-4">{error}</p>
              <button onClick={generateNewSentence} className="bg-blue-500 text-white font-bold py-2 px-6 rounded-full hover:bg-blue-600">
                  Try Again
              </button>
          </div>
      )}

      {!loading && !error && sentenceData && (
        <div className="flex-grow flex flex-col justify-between">
            <div>
                <div className="text-center mb-4 bg-black/20 p-3 rounded-lg">
                    <p className="text-sm text-slate-300">Translate this sentence:</p>
                    <p className="text-lg font-semibold text-shadow">"{sentenceData.englishSentence}"</p>
                </div>
                
                <div className={`min-h-[6rem] p-3 rounded-lg border-2 border-dashed transition-colors ${getStatusColor()}`}>
                    {userAnswer.map((item) => (
                        <button key={item.id} onClick={() => handleWordClick(item, 'answer')} className="inline-block bg-white/90 text-slate-900 font-bold py-2 px-4 rounded-lg m-1 shadow-md">
                            {item.word}
                        </button>
                    ))}
                    {userAnswer.length === 0 && <span className="text-slate-400">Click words below...</span>}
                </div>
            </div>

            <div className="text-center p-2 min-h-[6rem] flex flex-wrap gap-2 items-center justify-center">
                {scrambledBank.map((item) => (
                    <button key={item.id} onClick={() => handleWordClick(item, 'bank')} className="inline-block bg-white/20 backdrop-blur-sm text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-white/40 transition-colors transform hover:scale-105">
                        {item.word}
                    </button>
                ))}
            </div>
            
            <div className="mt-auto pt-4">
                {status === 'playing' && (
                  <div className="flex items-center space-x-2">
                    <button onClick={() => onFinish(xpEarned)} className="flex-shrink-0 bg-slate-600/50 text-white font-bold py-3 px-5 rounded-full hover:bg-slate-600/80 transition-colors">
                        Finish
                    </button>
                    <button onClick={handleCheckAnswer} disabled={userAnswer.length === 0} className="w-full bg-green-500 text-white font-bold py-3 rounded-full shadow-lg text-lg hover:bg-green-600 transition-all transform hover:scale-105 disabled:bg-slate-500 disabled:cursor-not-allowed">
                        Check Answer
                    </button>
                  </div>
                )}
                 {status === 'correct' && (
                    <div className="text-center">
                       <p className="text-green-300 font-bold text-shadow mb-2">Correct! +5 XP</p>
                       <div className="flex items-center justify-center space-x-4">
                         <button onClick={handlePlaySound} className="text-white bg-black/30 rounded-full p-3 hover:bg-black/50 transition-colors" aria-label="Play correct sentence">
                           <SpeakerIcon className={isSpeaking ? 'text-blue-400 animate-pulse' : ''} />
                         </button>
                         <button onClick={generateNewSentence} className="flex-grow bg-blue-500 text-white font-bold py-3 rounded-full shadow-lg text-lg hover:bg-blue-600 transition-transform transform hover:scale-105">
                             Next Sentence
                         </button>
                       </div>
                    </div>
                 )}
                 {status === 'incorrect' && (
                     <button onClick={handleResetAttempt} className="w-full bg-red-500 text-white font-bold py-3 rounded-full shadow-lg text-lg hover:bg-red-600 transition-transform transform hover:scale-105">
                         Try Again
                     </button>
                 )}
            </div>
        </div>
      )}
    </div>
  );
};

export default SentenceScramble;