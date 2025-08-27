import React, { useState, useEffect, useRef } from 'react';
import type { Word, MissedItem } from '../types.ts';
import { ArrowLeftIcon } from './icons.tsx';

interface WordQuizProps {
  words: Word[];
  onFinish: (xpEarned: number, pointsEarned: number, missedItems: MissedItem[]) => void;
  onExit: () => void;
}

const WordQuiz: React.FC<WordQuizProps> = ({ words, onFinish, onExit }) => {
  const [shuffledWords, setShuffledWords] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [status, setStatus] = useState<'playing' | 'correct' | 'incorrect'>('playing');
  const [attempts, setAttempts] = useState(1);
  const [points, setPoints] = useState(0);
  const [xp, setXp] = useState(0);
  const [missedItems, setMissedItems] = useState<MissedItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setShuffledWords([...words].sort(() => Math.random() - 0.5));
    inputRef.current?.focus();
  }, [words]);
  
  const currentWord = shuffledWords[currentIndex];

  const handleNextQuestion = () => {
    if (currentIndex + 1 >= shuffledWords.length) {
      onFinish(xp, points, missedItems);
    } else {
      setCurrentIndex(prev => prev + 1);
      setStatus('playing');
      setUserAnswer('');
      setAttempts(1);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleCheckAnswer = () => {
    if (!userAnswer.trim()) return;

    const correctNormalized = currentWord.swedish.toLowerCase().trim();
    const userNormalized = userAnswer.toLowerCase().trim();

    if (userNormalized === correctNormalized) {
      setStatus('correct');
      if (attempts === 1) setPoints(p => p + 2);
      if (attempts === 2) setPoints(p => p + 1);
      setXp(x => x + 5);
    } else {
      setStatus('incorrect');
      if (attempts >= 2 && !missedItems.some(item => item.correctAnswer === currentWord.swedish)) {
        setMissedItems(prev => [...prev, {
          mode: 'quiz',
          question: currentWord.english,
          userAnswer: userAnswer.trim(),
          correctAnswer: currentWord.swedish,
        }]);
      }
      setAttempts(a => a + 1);
    }
  };

  const handleTryAgain = () => {
    setStatus('playing');
    setUserAnswer('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (status === 'playing') handleCheckAnswer();
      else if (status === 'correct') handleNextQuestion();
      else if (status === 'incorrect' && attempts < 3) handleTryAgain();
      else handleNextQuestion();
    }
  };

  const getStatusBorderColor = () => {
    if (status === 'correct') return 'border-green-500';
    if (status === 'incorrect') return 'border-red-500 animate-shake';
    return 'border-slate-500 focus-within:border-blue-400';
  };

  if (!currentWord) {
    return (
      <div className="flex-grow flex items-center justify-center text-white">
        <p className="text-lg animate-pulse">Preparing your quiz...</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col p-4 relative text-white">
      <div className="flex items-center justify-between w-full mb-4">
        <button onClick={onExit} className="text-white bg-black/30 rounded-full p-2 hover:bg-black/50" aria-label="Return to menu"><ArrowLeftIcon /></button>
        <h2 className="text-lg font-bold text-shadow">Word Quiz ({currentIndex + 1}/{shuffledWords.length})</h2>
        <div className="w-20 text-right font-bold text-yellow-400">{points} pts</div>
      </div>

      <div className="flex-grow flex flex-col justify-center items-center text-center">
        <div className="bg-black/20 p-6 rounded-xl w-full">
          <p className="text-sm text-slate-300">What is the Swedish word for:</p>
          <p className="text-4xl font-bold text-shadow my-2">"{currentWord.english}"</p>
        </div>

        <div className={`mt-6 w-full bg-slate-800/50 rounded-lg border-2 transition-colors ${getStatusBorderColor()}`}>
          <input
            ref={inputRef}
            type="text"
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your answer..."
            disabled={status !== 'playing'}
            className="w-full bg-transparent text-white text-xl text-center p-4 outline-none placeholder-slate-400 disabled:opacity-70"
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect="off"
          />
        </div>
      </div>

      <div className="mt-auto pt-4 h-32 flex flex-col justify-end">
        {status === 'playing' && <button onClick={handleCheckAnswer} disabled={!userAnswer.trim()} className="w-full bg-green-500 font-bold py-3 rounded-full shadow-lg text-lg hover:bg-green-600 disabled:bg-slate-500">Check Answer</button>}
        {status === 'correct' && (
          <div className="text-center">
            <p className="text-green-300 font-bold text-shadow mb-2">Correct!</p>
            <p className="text-white text-lg mb-3 font-semibold">{currentWord.swedish}</p>
            <button onClick={handleNextQuestion} className="w-full bg-blue-500 font-bold py-3 rounded-full shadow-lg text-lg hover:bg-blue-600">Next</button>
          </div>
        )}
        {status === 'incorrect' && (
          <div>
            <p className="text-center text-red-300 font-bold mb-2">Not quite...</p>
            {attempts < 3 ? (
              <button onClick={handleTryAgain} className="w-full bg-yellow-500 text-white font-bold py-3 rounded-full shadow-lg text-lg hover:bg-yellow-600">Try Again ({3 - attempts} left)</button>
            ) : (
              <div className="text-center">
                <p className="text-sm">The correct answer was:</p>
                <p className="font-semibold text-lg mb-3">{currentWord.swedish}</p>
                <button onClick={handleNextQuestion} className="w-full bg-blue-500 font-bold py-3 rounded-full shadow-lg text-lg hover:bg-blue-600">Next</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WordQuiz;
