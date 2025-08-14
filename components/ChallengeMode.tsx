import React, { useState, useEffect, useCallback } from 'react';
import type { Word } from '../types.ts';
import { ArrowLeftIcon } from './icons.tsx';

// Helper to shuffle an array
const shuffleArray = <T,>(array: T[]): T[] => {
  return [...array].sort(() => Math.random() - 0.5);
};

interface Question {
  swedish: string;
  options: string[];
  correct: string;
}

interface ChallengeModeProps {
  words: Word[];
  onExit: () => void;
}

const ChallengeMode: React.FC<ChallengeModeProps> = ({ words, onExit }) => {
  const [gameState, setGameState] = useState<'intro' | 'playing' | 'results'>('intro');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [question, setQuestion] = useState<Question | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState(0);
  const [isAnswered, setIsAnswered] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

  const generateQuestion = useCallback(() => {
    if (words.length < 5) return null;

    const wordPool = [...words];
    const correctWord = wordPool.splice(Math.floor(Math.random() * wordPool.length), 1)[0];
    
    const incorrectOptions = shuffleArray(wordPool)
      .slice(0, 4)
      .map(w => w.english);

    const options = shuffleArray([correctWord.english, ...incorrectOptions]);

    setQuestion({
      swedish: correctWord.swedish,
      options,
      correct: correctWord.english,
    });
    setQuestionStartTime(Date.now());
    setIsAnswered(false);
    setSelectedAnswer(null);
  }, [words]);

  const startChallenge = () => {
    setScore(0);
    setTimeLeft(60);
    generateQuestion();
    setGameState('playing');
  };

  useEffect(() => {
    if (gameState !== 'playing') return;

    if (timeLeft <= 0) {
      setGameState('results');
      return;
    }

    const timerId = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timerId);
  }, [gameState, timeLeft]);

  const handleAnswer = (answer: string) => {
    if (isAnswered) return;
    
    setIsAnswered(true);
    setSelectedAnswer(answer);

    if (answer === question?.correct) {
      const timeTaken = (Date.now() - questionStartTime) / 1000;
      const points = Math.max(1, 10 - Math.floor(timeTaken));
      setScore(prev => prev + points);
      setTimeout(() => generateQuestion(), 1000);
    } else {
      setTimeout(() => generateQuestion(), 1500);
    }
  };
  
  const getButtonClass = (option: string): string => {
    if (!isAnswered) {
        return 'bg-white/80 hover:bg-white/95';
    }
    const isCorrectAnswer = option === question?.correct;
    const isSelectedAnswer = option === selectedAnswer;

    if (isCorrectAnswer) return 'bg-green-500 text-white scale-105';
    if (isSelectedAnswer && !isCorrectAnswer) return 'bg-red-500 text-white';
    
    return 'bg-white/50 opacity-60';
  };

  const renderIntro = () => (
    <div className="text-center text-white p-6 flex flex-col items-center justify-center h-full">
      <h2 className="text-4xl font-bold mb-4 text-shadow">Challenge Mode</h2>
      <p className="mb-2 text-shadow">You have 60 seconds to answer as many questions as you can.</p>
      <p className="mb-6 text-shadow">The faster you answer, the more points you get!</p>
      <button 
        onClick={startChallenge}
        className="bg-green-500 text-white font-bold py-3 px-8 rounded-full shadow-lg text-xl hover:bg-green-600 transition-transform transform hover:scale-105"
      >
        Start Challenge
      </button>
    </div>
  );
  
  const renderGame = () => {
    if (!question) {
        return (
            <div className="w-full h-full flex items-center justify-center">
                <p className="text-white text-lg font-semibold bg-black/30 p-4 rounded-lg animate-pulse">Loading questions...</p>
            </div>
        )
    }
    return (
        <div className="flex flex-col h-full p-4">
            <div className="flex justify-between items-center text-white font-bold text-lg mb-4 text-shadow bg-black/20 p-2 rounded-lg">
                <span>Time: {timeLeft}s</span>
                <span>Score: {score}</span>
            </div>

            <div className="flex-grow flex flex-col items-center justify-center space-y-6">
                <div className="bg-white/90 backdrop-blur-lg p-6 rounded-xl shadow-lg w-full text-center">
                    <span className="text-slate-600 text-sm font-medium">Swedish</span>
                    <p className="text-5xl font-bold text-slate-900">{question.swedish}</p>
                </div>
                
                <div className="grid grid-cols-1 gap-3 w-full">
                    {question.options.map(option => (
                        <button
                            key={option}
                            onClick={() => handleAnswer(option)}
                            disabled={isAnswered}
                            className={`w-full text-left p-4 rounded-lg font-semibold text-slate-800 shadow-md transition-all duration-300 transform ${getButtonClass(option)}`}
                        >
                            {option}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
  };

  const renderResults = () => (
    <div className="text-center text-white p-6 flex flex-col items-center justify-center h-full">
      <h2 className="text-3xl font-bold mb-2 text-shadow">Time's Up!</h2>
      <p className="text-6xl font-bold mb-4 text-shadow">{score}</p>
      <p className="mb-8 text-shadow">Your Final Score</p>
      <button 
        onClick={startChallenge}
        className="bg-blue-500 text-white font-bold py-3 px-8 rounded-full shadow-lg text-lg mb-4 hover:bg-blue-600 transition-transform transform hover:scale-105 w-full"
      >
        Play Again
      </button>
    </div>
  );

  return (
    <div className="w-full h-full flex flex-col relative">
      {gameState !== 'intro' && (
        <button onClick={onExit} className="absolute top-3 left-3 z-20 text-white bg-black/30 rounded-full p-2 hover:bg-black/50 transition-colors" aria-label="Exit challenge mode">
            <ArrowLeftIcon />
        </button>
      )}

      {gameState === 'intro' && renderIntro()}
      {gameState === 'playing' && renderGame()}
      {gameState === 'results' && renderResults()}
    </div>
  );
};

export default ChallengeMode;