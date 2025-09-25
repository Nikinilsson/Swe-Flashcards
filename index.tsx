
import React, { useState, useCallback, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";

// ============================================================================
// === INLINED: types.ts ===
// ============================================================================
interface Word {
  swedish: string;
  english: string;
  swedishSentence?: string;
  englishSentence?: string;
}

interface UserStats {
  streak: number;
  xp: number;
  lastCompletionDate: string | null;
}

interface LevelInfo {
  level: number;
  name: string;
  xp: number;
  nextLevelXp: number;
  progressPercent: number;
}

interface MissedItem {
  mode: 'scramble' | 'grammar' | 'quiz';
  question: string; // The correct sentence, grammar question, or English word
  userAnswer: string;
  correctAnswer: string;
}

interface PointsSummary {
  flashcard?: number;
  scramble?: number;
  grammar?: number;
  challenge?: number;
  quiz?: number;
}

interface DailyResult {
  date: string;
  totalPoints: number;
  points: PointsSummary;
  missedItems: MissedItem[];
}

interface ActivityProgress {
  date: string;
  completedModes: ('flashcard' | 'scramble' | 'grammar' | 'challenge' | 'quiz')[];
  points: PointsSummary;
  missedItems: MissedItem[];
}


// ============================================================================
// === INLINED: data/words.ts ===
// ============================================================================
const staticWords: Word[] = [
  { swedish: 'Hej', english: 'Hello', swedishSentence: 'Hej, hur mår du?', englishSentence: 'Hello, how are you?' },
  { swedish: 'Tack', english: 'Thank you', swedishSentence: 'Tack så mycket för hjälpen.', englishSentence: 'Thank you very much for the help.' },
  { swedish: 'Ja', english: 'Yes', swedishSentence: 'Ja, jag vill ha en kopp kaffe.', englishSentence: 'Yes, I want a cup of coffee.' },
  { swedish: 'Nej', english: 'No', swedishSentence: 'Nej, jag är inte trött.', englishSentence: 'No, I am not tired.' },
  { swedish: 'God morgon', english: 'Good morning', swedishSentence: 'God morgon! Sov du gott?', englishSentence: 'Good morning! Did you sleep well?' },
  { swedish: 'God kväll', english: 'Good evening', swedishSentence: 'God kväll, välkommen hem.', englishSentence: 'Good evening, welcome home.' },
  { swedish: 'Vatten', english: 'Water', swedishSentence: 'Kan jag få ett glas vatten?', englishSentence: 'Can I have a glass of water?' },
  { swedish: 'Mat', english: 'Food', swedishSentence: 'Maten är klar om fem minuter.', englishSentence: 'The food will be ready in five minutes.' },
  { swedish: 'Hus', english: 'House', swedishSentence: 'De bor i ett stort gult hus.', englishSentence: 'They live in a big yellow house.' },
  { swedish: 'Bil', english: 'Car', swedishSentence: 'Min bil är gammal men pålitlig.', englishSentence: 'My car is old but reliable.' },
  { swedish: 'Vän', english: 'Friend', swedishSentence: 'Jag ska träffa en vän i stan.', englishSentence: 'I am going to meet a friend in town.' },
  { swedish: 'Familj', english: 'Family', swedishSentence: 'Min familj kommer från Sverige.', englishSentence: 'My family comes from Sweden.' },
  { swedish: 'Älska', english: 'To love', swedishSentence: 'Jag älskar att resa.', englishSentence: 'I love to travel.' },
  { swedish: 'Skola', english: 'School', swedishSentence: 'Barnen går i skolan nu.', englishSentence: 'The children are at school now.' },
  { swedish: 'Bok', english: 'Book', swedishSentence: 'Hon läser en spännande bok.', englishSentence: 'She is reading an exciting book.' },
  { swedish: 'Sverige', english: 'Sweden', swedishSentence: 'Sverige är känt för sin vackra natur.', englishSentence: 'Sweden is known for its beautiful nature.' },
  { swedish: 'Prata', english: 'To speak', swedishSentence: 'Kan du prata lite långsammare?', englishSentence: 'Can you speak a little slower?' },
  { swedish: 'Förstå', english: 'To understand', swedishSentence: 'Jag förstår inte frågan.', englishSentence: 'I do not understand the question.' },
  { swedish: 'Hjälp', english: 'Help', swedishSentence: 'Behöver du hjälp med väskorna?', englishSentence: 'Do you need help with the bags?' },
  { swedish: 'Ursäkta', english: 'Excuse me', swedishSentence: 'Ursäkta, var ligger stationen?', englishSentence: 'Excuse me, where is the station?' },
];


// ============================================================================
// === INLINED: components/icons.tsx ===
// ============================================================================
interface IconProps {
  className?: string;
}

const ArrowLeftIcon: React.FC<IconProps> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={`h-6 w-6 ${className || ''}`}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

const ArrowRightIcon: React.FC<IconProps> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={`h-6 w-6 ${className || ''}`}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7-7-7H3" />
  </svg>
);

const SpeakerIcon: React.FC<IconProps> = ({ className }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className={`h-7 w-7 ${className || ''}`} 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor" 
        strokeWidth={2}
    >
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
    </svg>
);

const StarIcon: React.FC<IconProps & { filled?: boolean }> = ({ className, filled }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={`h-5 w-5 ${className || ''}`}
    viewBox="0 0 24 24"
    fill={filled ? "currentColor" : "none"}
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
    />
  </svg>
);

const TrophyIcon: React.FC<IconProps> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={`h-7 w-7 ${className || ''}`}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
  </svg>
);

const CardsIcon: React.FC<IconProps> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={`h-7 w-7 ${className || ''}`}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect>
    <path d="M17.5 2a2.5 2.5 0 0 1 0 5M6.5 2a2.5 2.5 0 0 0 0 5"></path>
  </svg>
);

const TimerIcon: React.FC<IconProps> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={`h-7 w-7 ${className || ''}`}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);

const ShuffleIcon: React.FC<IconProps> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={`h-7 w-7 ${className || ''}`}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="16 3 21 3 21 8"></polyline>
    <line x1="4" y1="20" x2="21" y2="3"></line>
    <polyline points="16 16 21 16 21 21"></polyline>
    <line x1="15" y1="15" x2="21" y2="21"></line>
    <line x1="4" y1="4" x2="11" y2="11"></line>
  </svg>
);

const MagnifyingGlassIcon: React.FC<IconProps> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={`h-7 w-7 ${className || ''}`}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

const CheckIcon: React.FC<IconProps> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={`h-6 w-6 ${className || ''}`}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={3}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const PencilIcon: React.FC<IconProps> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={`h-7 w-7 ${className || ''}`}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
    <path d="m15 5 4 4"></path>
  </svg>
);

const RefreshIcon: React.FC<IconProps> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${className || ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5m7 10v-5h-5M20.49 9A9 9 0 005.51 9M3.51 15A9 9 0 0018.49 15" />
    </svg>
);

// ============================================================================
// === INLINED: components/IconButton.tsx ===
// ============================================================================
interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

const IconButton: React.FC<IconButtonProps> = ({ children, ...props }) => {
  return (
    <button
      {...props}
      className="w-14 h-14 bg-white/60 rounded-full flex items-center justify-center text-slate-800 shadow-lg hover:bg-white/90 active:shadow-inner active:bg-white/100 backdrop-blur-sm border border-white/30 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-white"
    >
      {children}
    </button>
  );
};


// ============================================================================
// === INLINED: components/Flashcard.tsx ===
// ============================================================================
interface FlashcardProps {
  word: Word;
}

const Flashcard: React.FC<FlashcardProps> = ({ word }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    if (!('speechSynthesis' in window)) {
      setIsSpeechSupported(false);
      console.warn('Speech synthesis not supported.');
    }
  }, []);

  useEffect(() => {
    setIsFlipped(false);
  }, [word]);

  const handlePlaySound = useCallback(() => {
    if (!isSpeechSupported) return;
    window.speechSynthesis.cancel();
    const textToSpeak = word.swedishSentence ? `${word.swedish}. ${word.swedishSentence}` : word.swedish;
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'sv-SE';
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = (e) => {
      console.error('SpeechSynthesis Error:', e);
      setIsSpeaking(false);
    };
    const voices = window.speechSynthesis.getVoices();
    const swedishVoice = voices.find(voice => voice.lang === 'sv-SE');
    if (swedishVoice) utterance.voice = swedishVoice;
    window.speechSynthesis.speak(utterance);
  }, [word.swedish, word.swedishSentence, isSpeechSupported]);

  useEffect(() => {
    if (!isSpeechSupported) return;
    const playSoundAfterVoicesLoad = () => {
        handlePlaySound();
        window.speechSynthesis.onvoiceschanged = null;
    };
    const timer = setTimeout(() => {
        if (window.speechSynthesis.getVoices().length === 0) {
            window.speechSynthesis.onvoiceschanged = playSoundAfterVoicesLoad;
        } else {
            handlePlaySound();
        }
    }, 100);
    return () => {
        clearTimeout(timer);
        window.speechSynthesis.cancel();
        if (window.speechSynthesis.onvoiceschanged === playSoundAfterVoicesLoad) {
            window.speechSynthesis.onvoiceschanged = null;
        }
    };
  }, [handlePlaySound, isSpeechSupported]);

  const handleFlip = () => setIsFlipped(!isFlipped);
  const onSoundClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      handlePlaySound();
  };

  return (
    <div className="w-full h-full [perspective:1000px] cursor-pointer" onClick={handleFlip} title="Click to flip" aria-live="polite">
      <div className={`relative w-full h-full transition-transform duration-700 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>
        <div className="absolute w-full h-full [backface-visibility:hidden] bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg flex flex-col items-center justify-center p-4 border border-white/20">
          <span className="text-slate-600 text-sm mb-2 font-medium">Swedish</span>
          <p className="text-3xl md:text-4xl font-bold text-slate-900 text-center">{word.swedish}</p>
          {word.swedishSentence && <p className="text-slate-700 mt-3 text-center italic text-base">"{word.swedishSentence}"</p>}
          <button onClick={onSoundClick} className="absolute bottom-4 right-4 text-slate-500 hover:text-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Play audio for swedish word" title={isSpeechSupported ? "Play sound" : "Text-to-speech not supported"} disabled={!isSpeechSupported}>
            <SpeakerIcon className={isSpeaking ? 'text-blue-600 animate-pulse' : ''} />
          </button>
        </div>
        <div className="absolute w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] bg-blue-500/90 backdrop-blur-lg rounded-2xl shadow-lg flex flex-col items-center justify-center p-4 border border-white/20">
          <span className="text-blue-100 text-sm mb-2 font-medium">English</span>
          <p className="text-3xl md:text-4xl font-bold text-white text-center">{word.english}</p>
          {word.englishSentence && <p className="text-blue-100 mt-3 text-center italic text-base">"{word.englishSentence}"</p>}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// === INLINED: components/WeeklyProgress.tsx ===
// ============================================================================
interface WeeklyProgressProps {
  progress: boolean[];
  count: number;
  currentDayIndex: number;
}

const WeeklyProgress: React.FC<WeeklyProgressProps> = ({ progress, count, currentDayIndex }) => {
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  return (
    <div className="bg-slate-900/50 backdrop-blur-sm text-white p-2 shadow-md w-full flex items-center justify-center">
      <div className="text-center">
        <div className="flex items-center justify-center space-x-2.5">
          {progress.map((completed, index) => (
            <div key={index} className="flex flex-col items-center space-y-0.5">
              <span className={`text-xs font-mono text-shadow transition-colors ${index === currentDayIndex ? 'text-white font-bold' : 'text-slate-300'}`}>{days[index]}</span>
              <StarIcon filled={completed} className={completed ? 'text-yellow-400' : 'text-slate-600'} />
            </div>
          ))}
        </div>
        <p className="text-xs font-semibold tracking-wider mt-1.5 text-shadow">Week's Progress: {count} / 7</p>
      </div>
    </div>
  );
};

// ============================================================================
// === INLINED: components/ChallengeMode.tsx ===
// ============================================================================
const shuffleArray = <T,>(array: T[]): T[] => [...array].sort(() => Math.random() - 0.5);

interface ChallengeModeProps {
  words: Word[];
  onExit: () => void;
  onComplete: (xp: number, points: number) => void;
}

const ChallengeMode: React.FC<ChallengeModeProps> = ({ words, onExit, onComplete }) => {
  const [gameState, setGameState] = useState<'intro' | 'playing' | 'results'>('intro');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [question, setQuestion] = useState<{ swedish: string; options: string[]; correct: string; } | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState(0);
  const [isAnswered, setIsAnswered] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

  const generateQuestion = useCallback(() => {
    if (words.length < 5) return null;
    const wordPool = [...words];
    const correctWord = wordPool.splice(Math.floor(Math.random() * wordPool.length), 1)[0];
    const incorrectOptions = shuffleArray(wordPool).slice(0, 4).map(w => w.english);
    const options = shuffleArray([correctWord.english, ...incorrectOptions]);
    setQuestion({ swedish: correctWord.swedish, options, correct: correctWord.english });
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
    const timerId = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
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
    if (!isAnswered) return 'bg-white/80 hover:bg-white/95';
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
      <button onClick={startChallenge} className="bg-green-500 text-white font-bold py-3 px-8 rounded-full shadow-lg text-xl hover:bg-green-600 transition-transform transform hover:scale-105">Start Challenge</button>
    </div>
  );
  
  const renderGame = () => {
    if (!question) return <div className="w-full h-full flex items-center justify-center"><p className="text-white text-lg font-semibold bg-black/30 p-4 rounded-lg animate-pulse">Loading questions...</p></div>;
    return (
        <div className="flex flex-col h-full p-4">
            <div className="flex justify-between items-center text-white font-bold text-lg mb-4 text-shadow bg-black/20 p-2 rounded-lg"><span>Time: {timeLeft}s</span><span>Score: {score}</span></div>
            <div className="flex-grow flex flex-col items-center justify-center space-y-6">
                <div className="bg-white/90 backdrop-blur-lg p-6 rounded-xl shadow-lg w-full text-center"><span className="text-slate-600 text-sm font-medium">Swedish</span><p className="text-5xl font-bold text-slate-900">{question.swedish}</p></div>
                <div className="grid grid-cols-1 gap-3 w-full">{question.options.map(option => <button key={option} onClick={() => handleAnswer(option)} disabled={isAnswered} className={`w-full text-left p-4 rounded-lg font-semibold text-slate-800 shadow-md transition-all duration-300 transform ${getButtonClass(option)}`}>{option}</button>)}</div>
            </div>
        </div>
    );
  };

  const renderResults = () => (
    <div className="text-center text-white p-6 flex flex-col items-center justify-center h-full">
      <h2 className="text-3xl font-bold mb-2 text-shadow">Time's Up!</h2>
      <p className="text-6xl font-bold mb-4 text-shadow">{score}</p>
      <p className="mb-8 text-shadow">Your Score (+{score} XP &amp; Points)</p>
      <button onClick={() => onComplete(score, score)} className="bg-blue-500 text-white font-bold py-3 px-8 rounded-full shadow-lg text-lg mb-4 hover:bg-blue-600 transition-transform transform hover:scale-105 w-full">Finish Challenge</button>
    </div>
  );

  return (
    <div className="w-full h-full flex flex-col relative">
      <button onClick={onExit} className="absolute top-3 left-3 z-20 text-white bg-black/30 rounded-full p-2 hover:bg-black/50 transition-colors" aria-label="Exit session"><ArrowLeftIcon /></button>
      {gameState === 'intro' && renderIntro()}
      {gameState === 'playing' && renderGame()}
      {gameState === 'results' && renderResults()}
    </div>
  );
};


// ============================================================================
// === INLINED: components/WelcomeScreen.tsx ===
// ============================================================================
type Mode = 'flashcard' | 'challenge' | 'scramble' | 'grammar' | 'quiz';

interface WelcomeScreenProps {
  onModeSelect: (mode: Mode) => void;
  loading: boolean;
  stats: UserStats;
  levelInfo: LevelInfo;
  activityProgress: ActivityProgress;
  onScrambleWords: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onModeSelect, loading, stats, levelInfo, activityProgress, onScrambleWords }) => {
  const isCompleted = (mode: Mode) => activityProgress.completedModes.includes(mode);

  return (
    <div className="flex-grow flex flex-col items-center justify-between p-6 text-center text-white">
      <div className="w-full">
        <h1 className="font-cursive text-6xl text-shadow mb-2">Välkommen!</h1>
        <p className="text-lg text-slate-200 mb-6 text-shadow">Ready for your daily Swedish lesson?</p>
      </div>
      <div className="w-full bg-black/20 backdrop-blur-sm rounded-xl p-4 space-y-4 border border-white/10 shadow-lg">
          <div className="flex items-center justify-center space-x-4">
              <div className="text-center"><span className="text-4xl">🔥</span><p className="text-lg font-bold">{stats.streak}</p><p className="text-xs text-slate-300 uppercase tracking-wider">Day Streak</p></div>
          </div>
          <div className="w-full text-left">
            <div className="flex justify-between items-baseline mb-1"><p className="font-bold text-sm">Level {levelInfo.level}: {levelInfo.name}</p><p className="text-xs text-slate-300">{stats.xp} / {levelInfo.nextLevelXp} XP</p></div>
            <div className="w-full bg-slate-700 rounded-full h-2.5"><div className="bg-yellow-400 h-2.5 rounded-full transition-all duration-500" style={{width: `${levelInfo.progressPercent}%`}}></div></div>
          </div>
      </div>
      <div className="w-full mt-6">
        <p className="font-semibold text-shadow mb-3">Choose an activity:</p>
        <div className="flex flex-col gap-4">
           <ModeButton icon={<CardsIcon />} label="Flashcards" onClick={() => onModeSelect('flashcard')} disabled={loading} completed={isCompleted('flashcard')} isFullWidth />
           <div className="grid grid-cols-2 gap-4">
             <ModeButton icon={<ShuffleIcon />} label="Scramble" onClick={() => onModeSelect('scramble')} disabled={loading} completed={isCompleted('scramble')} />
             <ModeButton icon={<MagnifyingGlassIcon />} label="Grammar" onClick={() => onModeSelect('grammar')} disabled={loading} completed={isCompleted('grammar')} />
             <ModeButton icon={<PencilIcon />} label="Word Quiz" onClick={() => onModeSelect('quiz')} disabled={loading} completed={isCompleted('quiz')} />
             <ModeButton icon={<TimerIcon />} label="Challenge" onClick={() => onModeSelect('challenge')} disabled={loading} completed={isCompleted('challenge')} />
           </div>
        </div>
        <p className="text-sm text-slate-300 mt-4 text-shadow min-h-[20px] animate-pulse">{loading && 'Generating fresh content for you...'}</p>
        <button 
            onClick={onScrambleWords}
            disabled={loading}
            className="mt-2 w-full flex items-center justify-center p-2 bg-white/10 backdrop-blur-sm rounded-lg shadow-md transition-all duration-200 transform hover:bg-white/20 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
        >
            <RefreshIcon className="mr-2" />
            <span className="font-semibold text-sm">New Words for Today</span>
        </button>
      </div>
    </div>
  );
};

interface ModeButtonProps {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    disabled: boolean;
    completed: boolean;
    isFullWidth?: boolean;
}
const ModeButton: React.FC<ModeButtonProps> = ({ icon, label, onClick, disabled, completed, isFullWidth}) => (
    <button onClick={onClick} disabled={disabled} className={`relative flex items-center p-4 bg-white/10 backdrop-blur-sm rounded-lg shadow-md transition-all duration-200 transform ${isFullWidth ? 'flex-row justify-start' : 'flex-col justify-center'} ${!disabled ? 'hover:bg-white/20 active:scale-95' : ''} ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
        {completed && <div className="absolute top-1 right-1 bg-green-500 rounded-full p-0.5"><CheckIcon className="h-3 w-3 text-white" /></div>}
        {icon}
        <span className={`${isFullWidth ? 'ml-4' : 'mt-1.5 text-xs'} font-semibold`}>{label}</span>
    </button>
);


// ============================================================================
// === INLINED: components/SentenceScramble.tsx ===
// ============================================================================
const cleanAndParseJson = (text: string): any => {
  let cleanedText = text.trim();
  if (cleanedText.startsWith('```json')) cleanedText = cleanedText.substring(7).trim();
  if (cleanedText.endsWith('```')) cleanedText = cleanedText.substring(0, cleanedText.length - 3).trim();
  return JSON.parse(cleanedText);
};

interface SentenceScrambleProps {
  onFinish: (xpEarned: number, pointsEarned: number, missedItems: MissedItem[]) => void;
  onExit: () => void;
}
interface SentenceData { swedishSentence: string; englishSentence: string; }
interface WordWithId { id: number; word: string; }
const TOTAL_QUESTIONS_SCRAMBLE = 20;

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
    const shuffleWords = <T,>(array: T[]): T[] => { let i = array.length; while (i !== 0) { let ri = Math.floor(Math.random() * i); i--; [array[i], array[ri]] = [array[ri], array[i]]; } return array; };
    setScrambledBank(shuffleWords(wordsWithIds));
  }, []);

  const generateNewSentences = useCallback(async () => {
    setLoading(true); setError(null);
    if (!window.GEMINI_API_KEY || window.GEMINI_API_KEY === 'YOUR_API_KEY_HERE') { setError("API Key not configured."); setLoading(false); return; }
    try {
      const ai = new GoogleGenAI({ apiKey: window.GEMINI_API_KEY! });
      const responseSchema = { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { swedishSentence: { type: Type.STRING }, englishSentence: { type: Type.STRING } }, required: ['swedishSentence', 'englishSentence'] } };
      const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: `Create a JSON array of ${TOTAL_QUESTIONS_SCRAMBLE} simple, unique, beginner-level Swedish sentences. Each sentence should be between 3 and 7 words long. For each, provide the English translation.`, config: { responseMimeType: "application/json", responseSchema } });
      const data: SentenceData[] = cleanAndParseJson(response.text);
      setQuestions(data);
      setupQuestion(data[0]);
    } catch (err) { console.error("Sentence generation failed:", err); setError("Could not generate sentences. Please try again.");
    } finally { setLoading(false); }
  }, [setupQuestion]);

  useEffect(() => { generateNewSentences(); }, [generateNewSentences]);
  
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
    if (currentIndex + 1 >= questions.length) onFinish(xp, points, missedItems);
    else { setCurrentIndex(prev => prev + 1); setupQuestion(questions[currentIndex + 1]); }
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
      if (attempts >= 2 && !missedItems.some(item => item.correctAnswer === currentQuestion.swedishSentence)) setMissedItems(prev => [...prev, { mode: 'scramble', question: currentQuestion.englishSentence, userAnswer: userAnswerString, correctAnswer: currentQuestion.swedishSentence }]);
      setAttempts(a => a + 1);
    }
  };

  const handleTryAgain = () => {
    setStatus('playing');
    setUserAnswer([]);
    const currentQuestion = questions[currentIndex];
    const normalizedSentence = currentQuestion.swedishSentence.toLowerCase().replace(/[.,?!]/g, '').trim();
    const wordsWithIds = normalizedSentence.split(' ').filter(w => w.length > 0).map((word, index) => ({ id: index, word }));
    const shuffleWords = <T,>(array: T[]): T[] => { let i = array.length; while (i !== 0) { let ri = Math.floor(Math.random() * i); i--; [array[i], array[ri]] = [array[ri], array[i]]; } return array; };
    setScrambledBank(shuffleWords(wordsWithIds));
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
      <div className="flex items-center justify-between w-full mb-4"><button onClick={onExit} className="text-white bg-black/30 rounded-full p-2 hover:bg-black/50" aria-label="Return to menu"><ArrowLeftIcon /></button><h2 className="text-lg font-bold text-shadow">Scramble ({currentIndex + 1}/{TOTAL_QUESTIONS_SCRAMBLE})</h2><div className="w-20 text-right font-bold text-yellow-400">{points} pts</div></div>
      {loading && <div className="flex-grow flex items-center justify-center"><p className="text-lg animate-pulse">Building sentences...</p></div>}
      {error && <div className="flex-grow flex flex-col items-center justify-center"><p className="text-red-300 mb-4">{error}</p><button onClick={generateNewSentences} className="bg-blue-500 py-2 px-6 rounded-full">Try Again</button></div>}
      {!loading && !error && currentQuestion && (
        <div className="flex-grow flex flex-col justify-between">
            <div>
                <div className="text-center mb-4 bg-black/20 p-3 rounded-lg"><p className="text-sm text-slate-300">Translate this sentence:</p><p className="text-lg font-semibold text-shadow">"{currentQuestion.englishSentence}"</p></div>
                <div className={`min-h-[6rem] p-3 rounded-lg border-2 border-dashed transition-colors ${getStatusColor()}`}>{userAnswer.map((item) => (<button key={item.id} onClick={() => handleWordClick(item, 'answer')} className="inline-block bg-white/90 text-slate-900 font-bold py-2 px-4 rounded-lg m-1 shadow-md">{item.word}</button>))}{userAnswer.length === 0 && <span className="text-slate-400">Click words below...</span>}</div>
            </div>
            <div className="text-center p-2 min-h-[6rem] flex flex-wrap gap-2 items-center justify-center">{scrambledBank.map((item) => (<button key={item.id} onClick={() => handleWordClick(item, 'bank')} className="inline-block bg-white/20 backdrop-blur-sm font-bold py-2 px-4 rounded-lg shadow-md hover:bg-white/40 transform hover:scale-105">{item.word}</button>))}</div>
            <div className="mt-auto pt-4">
                {status === 'playing' && <button onClick={handleCheckAnswer} disabled={userAnswer.length === 0} className="w-full bg-green-500 font-bold py-3 rounded-full shadow-lg text-lg hover:bg-green-600 disabled:bg-slate-500">Check Answer</button>}
                {status === 'correct' && <div className="text-center"><p className="text-green-300 font-bold text-shadow mb-2">Correct!</p><p className="text-white text-lg mb-3 font-semibold">{currentQuestion.swedishSentence}</p><div className="flex items-center justify-center space-x-4"><button onClick={handlePlaySound} className="bg-black/30 rounded-full p-3 hover:bg-black/50"><SpeakerIcon className={isSpeaking ? 'text-blue-400 animate-pulse' : ''} /></button><button onClick={handleNextQuestion} className="flex-grow bg-blue-500 font-bold py-3 rounded-full shadow-lg text-lg hover:bg-blue-600">Next</button></div></div>}
                {status === 'incorrect' && <div><p className="text-center text-red-300 font-bold mb-2">Not quite, try again!</p>{attempts < 3 ? <button onClick={handleTryAgain} className="w-full bg-yellow-500 text-white font-bold py-3 rounded-full shadow-lg text-lg hover:bg-yellow-600">Try Again ({3 - attempts} left)</button> : <div className="text-center"><p className="text-sm">Correct answer:</p><p className="font-semibold text-lg mb-3">{currentQuestion.swedishSentence}</p><button onClick={handleNextQuestion} className="w-full bg-blue-500 font-bold py-3 rounded-full shadow-lg text-lg hover:bg-blue-600">Next</button></div>}</div>}
            </div>
        </div>
      )}
    </div>
  );
};


// ============================================================================
// === INLINED: components/GrammarDetective.tsx ===
// ============================================================================
interface GrammarDetectiveProps {
  onFinish: (xpEarned: number, pointsEarned: number, missedItems: MissedItem[]) => void;
  onExit: () => void;
}
interface QuestionData { swedishSentence: string; englishSentence: string; question: string; options: string[]; correctAnswer: string; explanation: string; }
const TOTAL_QUESTIONS_GRAMMAR = 20;

const GrammarDetective: React.FC<GrammarDetectiveProps> = ({ onFinish, onExit }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [status, setStatus] = useState<'playing' | 'answered'>('playing');
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [points, setPoints] = useState(0);
  const [xp, setXp] = useState(0);
  const [missedItems, setMissedItems] = useState<MissedItem[]>([]);

  const generateNewQuestions = useCallback(async () => {
    setLoading(true); setError(null);
    if (!window.GEMINI_API_KEY || window.GEMINI_API_KEY === 'YOUR_API_KEY_HERE') { setError("API Key not configured."); setLoading(false); return; }
    try {
      const ai = new GoogleGenAI({ apiKey: window.GEMINI_API_KEY! });
      const questionSchema = { type: Type.OBJECT, properties: { swedishSentence: { type: Type.STRING, description: "A simple Swedish sentence (3-7 words)." }, englishSentence: { type: Type.STRING, description: "The English translation of the sentence." }, question: { type: Type.STRING, description: "A neutral, multiple-choice question about a grammar point in the sentence." }, options: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Three plausible options, one correct." }, correctAnswer: { type: Type.STRING, description: "The correct answer from the options." }, explanation: { type: Type.STRING, description: "A concise explanation comparing Swedish, English, and Tagalog grammar." } }, required: ['swedishSentence', 'englishSentence', 'question', 'options', 'correctAnswer', 'explanation'] };
      const responseSchema = { type: Type.ARRAY, items: questionSchema };
      const prompt = `You are a language learning assistant. Create a JSON array of ${TOTAL_QUESTIONS_GRAMMAR} unique quiz objects about Swedish grammar. **CRITICAL INSTRUCTION: The question must test a grammar concept from the sentence, but the answer MUST NOT be directly visible in the sentence itself.** **GOOD Example (Create questions like this):** - Sentence: "Jag ser en röd bil." (I see a red car.) - Question: "How would you correctly say 'the red car' (definite form)?" - Options: ["den röd bil", "den röda bilen", "en röd bilen"] - Reason: This tests definite articles and adjective endings, a concept related to the sentence, but requires new knowledge. For each quiz object, provide: 1. 'swedishSentence': A simple Swedish sentence (3-7 words). 2. 'englishSentence': The English translation. 3. 'question': A multiple-choice question following the critical instruction. Focus on grammar like V2 word order, negation, noun gender, definite/indefinite forms, and adjective endings. 4. 'options': Three plausible options, one correct. 5. 'correctAnswer': The correct option. 6. 'explanation': A concise explanation comparing the Swedish rule to English and Tagalog grammar, in the format: "Swedish: [explanation]. English: [comparison]. Tagalog: [comparison]." Generate only the JSON array.`;
      const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: "application/json", responseSchema: responseSchema } });
      const data: QuestionData[] = cleanAndParseJson(response.text);
      if (data.length < TOTAL_QUESTIONS_GRAMMAR) throw new Error("API returned fewer questions than requested.");
      setQuestions(data);
    } catch (err) { console.error("Grammar question generation failed:", err); setError("Could not generate questions. Please try again.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { generateNewQuestions(); }, [generateNewQuestions]);

  const handleAnswer = (answer: string) => {
    if (status !== 'playing') return;
    setStatus('answered');
    setSelectedAnswer(answer);
    const currentQuestion = questions[currentIndex];
    if (answer === currentQuestion.correctAnswer) { setPoints(p => p + 2); setXp(x => x + 10); } 
    else { setMissedItems(prev => [...prev, { mode: 'grammar', question: currentQuestion.question, userAnswer: answer, correctAnswer: currentQuestion.correctAnswer }]); }
  };
  
  const handleNextQuestion = () => {
    if (currentIndex + 1 >= questions.length) onFinish(xp, points, missedItems);
    else { setStatus('playing'); setSelectedAnswer(null); setCurrentIndex(prev => prev + 1); }
  }

  const getButtonClass = (option: string): string => {
    if (status !== 'answered') return 'bg-white/80 hover:bg-white/95';
    const isCorrect = option === questions[currentIndex]?.correctAnswer;
    const isSelected = option === selectedAnswer;
    if (isCorrect) return 'bg-green-500 text-white scale-105';
    if (isSelected && !isCorrect) return 'bg-red-500 text-white';
    return 'bg-white/50 opacity-60';
  };

  const currentQuestion = questions[currentIndex];

  return (
    <div className="w-full h-full flex flex-col p-4 relative text-white">
      <div className="flex items-center justify-between w-full mb-4"><button onClick={onExit} className="text-white bg-black/30 rounded-full p-2 hover:bg-black/50" aria-label="Return to menu"><ArrowLeftIcon /></button><h2 className="text-lg font-bold text-shadow">Detective ({currentIndex + 1}/{TOTAL_QUESTIONS_GRAMMAR})</h2><div className="w-20 text-right font-bold text-yellow-400">{points} pts</div></div>
      {loading && <div className="flex-grow flex items-center justify-center"><p className="text-lg animate-pulse">Preparing your case files...</p></div>}
      {error && <div className="flex-grow flex flex-col items-center justify-center"><p className="text-red-300 mb-4">{error}</p><button onClick={generateNewQuestions} className="bg-blue-500 py-2 px-6 rounded-full">Try Again</button></div>}
      {!loading && !error && currentQuestion && (
        <div className="flex-grow flex flex-col justify-between">
          <div className="space-y-4">
            <div className="bg-black/20 p-4 rounded-lg text-center"><p className="text-2xl font-bold text-shadow">{currentQuestion.swedishSentence}</p><p className="text-sm text-slate-300">"{currentQuestion.englishSentence}"</p></div>
            <div className="bg-white/10 p-4 rounded-lg"><p className="font-semibold text-lg text-center">{currentQuestion.question}</p></div>
            <div className="space-y-3">{currentQuestion.options.map(option => <button key={option} onClick={() => handleAnswer(option)} disabled={status === 'answered'} className={`w-full text-left p-3 rounded-lg font-semibold text-slate-800 shadow-md transition-all duration-300 transform ${getButtonClass(option)}`}>{option}</button>)}</div>
          </div>
          <div className="mt-auto pt-2">
            {status === 'playing' && <button onClick={() => onFinish(xp, points, missedItems)} className="w-full bg-slate-600/50 font-bold py-3 rounded-full hover:bg-slate-600/80">Finish Session</button>}
            {status === 'answered' && <div className="flex flex-col space-y-3"><div className="p-3 bg-black/30 rounded-lg text-sm"><p className="font-bold text-yellow-300 mb-1">The Clue:</p><p className="text-slate-200">{currentQuestion.explanation}</p></div><button onClick={handleNextQuestion} className="w-full bg-blue-500 font-bold py-3 rounded-full shadow-lg text-lg hover:bg-blue-600">{currentIndex + 1 === TOTAL_QUESTIONS_GRAMMAR ? 'Finish' : 'Next Case'}</button></div>}
          </div>
        </div>
      )}
    </div>
  );
};


// ============================================================================
// === INLINED: components/DailySummary.tsx ===
// ============================================================================
interface DailySummaryProps {
  result: DailyResult;
  history: DailyResult[];
  onClose: () => void;
}

const DailySummary: React.FC<DailySummaryProps> = ({ result, history, onClose }) => {
  const { totalPoints, missedItems } = result;
  const last7DaysHistory = history.slice(0, 7).reverse();
  const maxPoints = Math.max(...last7DaysHistory.map(d => d.totalPoints), 50);
  const getIconForMode = (mode: MissedItem['mode']) => {
    if (mode === 'scramble') return <ShuffleIcon className="h-5 w-5 mr-2" />;
    if (mode === 'grammar') return <MagnifyingGlassIcon className="h-5 w-5 mr-2" />;
    if (mode === 'quiz') return <PencilIcon className="h-5 w-5 mr-2" />;
    return null;
  };
  
  return (
    <div className="w-full h-full flex flex-col text-white">
      <div className="flex items-center justify-between w-full p-4"><button onClick={onClose} className="text-white bg-black/30 rounded-full p-2 hover:bg-black/50" aria-label="Return to menu"><ArrowLeftIcon /></button><h2 className="text-xl font-bold text-shadow">Daily Summary</h2><div className="w-10"></div></div>
      <div className="flex-grow overflow-y-auto p-4 pt-0">
        <div className="text-center bg-black/20 p-4 rounded-lg mb-4"><p className="text-slate-300">Today's Total Score</p><p className="text-6xl font-bold text-yellow-300 text-shadow">{totalPoints} pts</p></div>
        <div className="bg-black/20 p-4 rounded-lg mb-4">
            <h3 className="font-bold mb-3 text-center">7-Day Performance</h3>
            <div className="flex justify-around items-end h-32 w-full">
                {last7DaysHistory.map((day, index) => {
                    const barHeight = Math.max(5, (day.totalPoints / maxPoints) * 100);
                    const isToday = day.date === result.date;
                    return (
                        <div key={index} className="flex flex-col items-center w-8">
                            <span className="text-xs mb-1">{day.totalPoints}</span>
                            <div className={`w-4 rounded-t-sm ${isToday ? 'bg-yellow-400' : 'bg-slate-500'}`} style={{ height: `${barHeight}%` }} title={`${day.date}: ${day.totalPoints} points`}></div>
                            <span className={`text-xs mt-1 font-mono ${isToday ? 'font-bold' : ''}`}>{new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' }).charAt(0)}</span>
                        </div>
                    );
                })}
            </div>
        </div>
        {missedItems.length > 0 && <div className="bg-black/20 p-4 rounded-lg"><h3 className="font-bold mb-3 text-center">Items to Review</h3><ul className="space-y-3">{missedItems.map((item, index) => (<li key={index} className="bg-slate-800/50 p-3 rounded-md text-sm"><p className="flex items-center font-semibold text-slate-300 capitalize">{getIconForMode(item.mode)} {item.mode}</p><p className="mt-1"><span className="font-semibold text-slate-400">Q:</span> "{item.question}"</p><p className="text-red-400"><span className="font-semibold">Your answer:</span> {item.userAnswer}</p><p className="text-green-400"><span className="font-semibold">Correct:</span> {item.correctAnswer}</p></li>))}</ul></div>}
      </div>
    </div>
  );
};

// ============================================================================
// === INLINED: components/WordQuiz.tsx ===
// ============================================================================
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
    if (currentIndex + 1 >= shuffledWords.length) onFinish(xp, points, missedItems);
    else { setCurrentIndex(prev => prev + 1); setStatus('playing'); setUserAnswer(''); setAttempts(1); setTimeout(() => inputRef.current?.focus(), 100); }
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
      if (attempts >= 2 && !missedItems.some(item => item.correctAnswer === currentWord.swedish)) setMissedItems(prev => [...prev, { mode: 'quiz', question: currentWord.english, userAnswer: userAnswer.trim(), correctAnswer: currentWord.swedish }]);
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

  if (!currentWord) return <div className="flex-grow flex items-center justify-center text-white"><p className="text-lg animate-pulse">Preparing your quiz...</p></div>;

  return (
    <div className="w-full h-full flex flex-col p-4 relative text-white">
      <div className="flex items-center justify-between w-full mb-4"><button onClick={onExit} className="text-white bg-black/30 rounded-full p-2 hover:bg-black/50" aria-label="Return to menu"><ArrowLeftIcon /></button><h2 className="text-lg font-bold text-shadow">Word Quiz ({currentIndex + 1}/{shuffledWords.length})</h2><div className="w-20 text-right font-bold text-yellow-400">{points} pts</div></div>
      <div className="flex-grow flex flex-col justify-center items-center text-center">
        <div className="bg-black/20 p-6 rounded-xl w-full"><p className="text-sm text-slate-300">What is the Swedish word for:</p><p className="text-4xl font-bold text-shadow my-2">"{currentWord.english}"</p></div>
        <div className={`mt-6 w-full bg-slate-800/50 rounded-lg border-2 transition-colors ${getStatusBorderColor()}`}><input ref={inputRef} type="text" value={userAnswer} onChange={(e) => setUserAnswer(e.target.value)} onKeyDown={handleKeyDown} placeholder="Type your answer..." disabled={status !== 'playing'} className="w-full bg-transparent text-white text-xl text-center p-4 outline-none placeholder-slate-400 disabled:opacity-70" autoCapitalize="none" autoComplete="off" autoCorrect="off" /></div>
      </div>
      <div className="mt-auto pt-4 h-32 flex flex-col justify-end">
        {status === 'playing' && <button onClick={handleCheckAnswer} disabled={!userAnswer.trim()} className="w-full bg-green-500 font-bold py-3 rounded-full shadow-lg text-lg hover:bg-green-600 disabled:bg-slate-500">Check Answer</button>}
        {status === 'correct' && <div className="text-center"><p className="text-green-300 font-bold text-shadow mb-2">Correct!</p><p className="text-white text-lg mb-3 font-semibold">{currentWord.swedish}</p><button onClick={handleNextQuestion} className="w-full bg-blue-500 font-bold py-3 rounded-full shadow-lg text-lg hover:bg-blue-600">Next</button></div>}
        {status === 'incorrect' && <div><p className="text-center text-red-300 font-bold mb-2">Not quite...</p>{attempts < 3 ? <button onClick={handleTryAgain} className="w-full bg-yellow-500 text-white font-bold py-3 rounded-full shadow-lg text-lg hover:bg-yellow-600">Try Again ({3 - attempts} left)</button> : <div className="text-center"><p className="text-sm">The correct answer was:</p><p className="font-semibold text-lg mb-3">{currentWord.swedish}</p><button onClick={handleNextQuestion} className="w-full bg-blue-500 font-bold py-3 rounded-full shadow-lg text-lg hover:bg-blue-600">Next</button></div>}</div>}
      </div>
    </div>
  );
};


// ============================================================================
// === INLINED: App.tsx ===
// ============================================================================
declare global {
  interface Window { GEMINI_API_KEY?: string; }
}
const toLocaleDateStringISO = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const LEVELS = [ { level: 1, name: "Nybörjare", xp: 0 }, { level: 2, name: "Lärling", xp: 100 }, { level: 3, name: "Utforskare", xp: 250 }, { level: 4, name: "Talare", xp: 500 }, { level: 5, name: "Expert", xp: 1000 }, { level: 6, name: "Mästare", xp: 2000 } ];
const THEMES = ['Food and Drink', 'Travel', 'Animals', 'Common Verbs', 'Adjectives', 'Household Items', 'Emotions', 'Weather', 'Professions', 'Hobbies', 'Nature', 'Family', 'Clothing', 'Numbers'];
const calculateLevelInfo = (xp: number): LevelInfo => {
    const currentLevel = [...LEVELS].reverse().find(l => xp >= l.xp) || LEVELS[0];
    const nextLevel = LEVELS.find(l => l.xp > xp);
    if (!nextLevel) return { ...currentLevel, nextLevelXp: xp, progressPercent: 100 };
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
  const [view, setView] = useState<'welcome' | 'flashcard' | 'challenge' | 'scramble' | 'grammar' | 'quiz' | 'summary'>('welcome');
  const [userStats, setUserStats] = useState<UserStats>({ streak: 0, xp: 0, lastCompletionDate: null });
  const [levelInfo, setLevelInfo] = useState<LevelInfo>(calculateLevelInfo(0));
  const [activityProgress, setActivityProgress] = useState<ActivityProgress>({ date: toLocaleDateStringISO(new Date()), completedModes: [], points: {}, missedItems: []});
  const [historicalResults, setHistoricalResults] = useState<DailyResult[]>([]);

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
      const getStartOfWeek = (date: Date): Date => { const d = new Date(date); const day = d.getDay(); const diff = d.getDate() - day + (day === 0 ? -6 : 1); d.setHours(0, 0, 0, 0); return new Date(d.setDate(diff)); };
      const today = new Date();
      const startOfWeek = getStartOfWeek(today);
      const progress: boolean[] = [];
      let count = 0;
      for (let i = 0; i < 7; i++) {
        const day = new Date(startOfWeek);
        day.setDate(startOfWeek.getDate() + i);
        const dayStr = toLocaleDateStringISO(day);
        if (completedDates.includes(dayStr)) { progress.push(true); count++; } 
        else { progress.push(false); }
      }
      setWeeklyProgress(progress);
      setCompletionCount(count);
  }, []);

  const fetchNewContent = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const ai = new GoogleGenAI({ apiKey: window.GEMINI_API_KEY! });
      const wordsSchema = { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { swedish: { type: Type.STRING }, english: { type: Type.STRING }, swedishSentence: { type: Type.STRING }, englishSentence: { type: Type.STRING } }, required: ['swedish', 'english', 'swedishSentence', 'englishSentence'] } };
      const randomTheme = THEMES[Math.floor(Math.random() * THEMES.length)];
      const wordsPromise = ai.models.generateContent({ model: 'gemini-2.5-flash', contents: `Generate a list of 20 simple Swedish words for a beginner flashcard app, based on the theme of "${randomTheme}". For each word, provide its English translation and a simple example sentence in both Swedish and English using the word.`, config: { responseMimeType: "application/json", responseSchema: wordsSchema } });
      const factPromise = ai.models.generateContent({ model: 'gemini-2.5-flash', contents: `Generate one short, interesting, and fun fact about Sweden related to the topic of "${randomTheme}". The fact should be a single sentence and not enclosed in quotes.` });
      const [wordsResponse, factResponse] = await Promise.all([wordsPromise, factPromise]);
      const newWords: Word[] = cleanAndParseJson(wordsResponse.text);
      const newFact = factResponse.text.trim();
      if (Array.isArray(newWords) && newWords.length > 0 && newFact) { setWords(newWords); setFunFact(newFact); setCurrentIndex(0); } 
      else { throw new Error("API returned invalid data format."); }
    } catch (err) {
      console.error("Failed to fetch new content:", err);
      setError("Could not generate new content. Using the default set.");
      setWords(staticWords);
      setFunFact("Sweden is the third-largest country in the European Union by area.");
    } finally { setLoading(false); }
  }, []);

  const handleScrambleWords = useCallback(async () => {
    const todayStr = toLocaleDateStringISO(new Date());
    const initialProgress = { date: todayStr, completedModes: [], points: {}, missedItems: [] };
    setActivityProgress(initialProgress);
    localStorage.setItem('svenskaActivityProgress', JSON.stringify(initialProgress));
    await fetchNewContent();
  }, [fetchNewContent]);

  useEffect(() => {
    if (!window.GEMINI_API_KEY || window.GEMINI_API_KEY === 'YOUR_API_KEY_HERE') { setApiKeyStatus('invalid'); setLoading(false); return; }
    setApiKeyStatus('valid');
    const todayStr = toLocaleDateStringISO(new Date());
    const storedStatsRaw = localStorage.getItem('svenskaUserStats');
    if (storedStatsRaw) {
      try {
        const storedStats: UserStats = JSON.parse(storedStatsRaw);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = toLocaleDateStringISO(yesterday);
        if (storedStats.lastCompletionDate !== todayStr && storedStats.lastCompletionDate !== yesterdayStr) storedStats.streak = 0;
        setUserStats(storedStats);
        setLevelInfo(calculateLevelInfo(storedStats.xp));
      } catch (e) { console.error("Failed to parse user stats", e); }
    }
    const storedProgressRaw = localStorage.getItem('svenskaActivityProgress');
    if(storedProgressRaw) {
      const storedProgress: ActivityProgress = JSON.parse(storedProgressRaw);
      if(storedProgress.date === todayStr) setActivityProgress(storedProgress);
    }
    const storedHistoryRaw = localStorage.getItem('svenskaDailyResults');
    if(storedHistoryRaw) setHistoricalResults(JSON.parse(storedHistoryRaw));
    
    const initialDatesRaw = localStorage.getItem('svenskaCompletionDates');
    updateWeeklyProgressDisplay(initialDatesRaw ? JSON.parse(initialDatesRaw) : []);
    
    fetchNewContent();
  }, [updateWeeklyProgressDisplay, fetchNewContent]);

  const handleNext = useCallback(() => setCurrentIndex((prev) => (prev + 1) % words.length), [words.length]);
  const handlePrev = useCallback(() => setCurrentIndex((prev) => (prev - 1 + words.length) % words.length), [words.length]);

  const handleActivityComplete = (mode: 'flashcard' | 'scramble' | 'grammar' | 'challenge' | 'quiz', xpEarned: number, pointsEarned: number, missed: MissedItem[] = []) => {
    const todayStr = toLocaleDateStringISO(new Date());
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = toLocaleDateStringISO(yesterday);
    const newStats = { ...userStats };
    newStats.xp += xpEarned;
    if (newStats.lastCompletionDate !== todayStr) { newStats.streak = (newStats.lastCompletionDate === yesterdayStr) ? newStats.streak + 1 : 1; newStats.lastCompletionDate = todayStr; logCompletionAndRefreshProgress(todayStr); }
    setUserStats(newStats); setLevelInfo(calculateLevelInfo(newStats.xp)); localStorage.setItem('svenskaUserStats', JSON.stringify(newStats));
    const newProgress = { ...activityProgress };
    if (!newProgress.completedModes.includes(mode)) newProgress.completedModes.push(mode);
    newProgress.points[mode] = pointsEarned;
    newProgress.missedItems = [...newProgress.missedItems.filter(item => item.mode !== mode), ...missed];
    setActivityProgress(newProgress); localStorage.setItem('svenskaActivityProgress', JSON.stringify(newProgress));
    const allModes: ('flashcard' | 'scramble' | 'grammar' | 'challenge' | 'quiz')[] = ['flashcard', 'scramble', 'grammar', 'challenge', 'quiz'];
    const allDone = allModes.every(m => newProgress.completedModes.includes(m));
    if (allDone) {
        // FIX: Explicitly convert `pts` to a number to handle `unknown` type from Object.values and resolve errors with `+` operator and type assignment.
        const totalPoints = Object.values(newProgress.points).reduce((sum, pts) => sum + (Number(pts) || 0), 0);
        const finalResult: DailyResult = { date: newProgress.date, totalPoints, points: newProgress.points, missedItems: newProgress.missedItems };
        const newHistory = [finalResult, ...historicalResults.filter(h => h.date !== finalResult.date)].slice(0, 30);
        setHistoricalResults(newHistory);
        localStorage.setItem('svenskaDailyResults', JSON.stringify(newHistory));
        setView('summary');
    } else { setView('welcome'); }
  };
  
  const formattedDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  if (apiKeyStatus === 'invalid') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-800 text-white">
        <div className="w-full max-w-lg text-left bg-slate-900/50 p-8 rounded-2xl shadow-2xl border border-red-500/50">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Configuration Error</h1>
          <p className="text-slate-300 mb-4">The Gemini API key is missing or invalid. Please follow the deployment instructions in `index.html` to add your key via snippet injection.</p>
        </div>
      </div>
    );
  }

  const currentWord = words[currentIndex];
  const renderContent = () => {
    switch (view) {
      case 'welcome': return <WelcomeScreen onModeSelect={(mode) => setView(mode)} loading={loading} stats={userStats} levelInfo={levelInfo} activityProgress={activityProgress} onScrambleWords={handleScrambleWords} />;
      case 'challenge': return <ChallengeMode words={words} onComplete={(xp, points) => handleActivityComplete('challenge', xp, points)} onExit={() => setView('welcome')} />;
      case 'scramble': return <SentenceScramble onFinish={(xp, points, missed) => handleActivityComplete('scramble', xp, points, missed)} onExit={() => setView('welcome')}/>;
      case 'grammar': return <GrammarDetective onFinish={(xp, points, missed) => handleActivityComplete('grammar', xp, points, missed)} onExit={() => setView('welcome')}/>;
      case 'quiz': return <WordQuiz words={words} onFinish={(xp, points, missed) => handleActivityComplete('quiz', xp, points, missed)} onExit={() => setView('welcome')} />;
      case 'summary': const todayResult = historicalResults.find(r => r.date === activityProgress.date); return <DailySummary result={todayResult!} history={historicalResults} onClose={() => setView('welcome')} />;
      case 'flashcard': default: return (
          <div className="flex-grow flex flex-col">
            <main className="flex-grow flex flex-col items-center justify-center p-4 space-y-4">
              <div className="text-center bg-black/20 text-white p-2 rounded-lg"><p className="font-medium text-shadow">{formattedDate}</p>{error && <p className="text-red-300 text-sm mt-1 text-shadow">{error}</p>}</div>
              <div className="w-full h-64 md:h-72">{loading ? <div className="w-full h-full flex items-center justify-center"><p className="text-white text-lg font-semibold bg-black/30 p-4 rounded-lg animate-pulse">Generating words...</p></div> : (currentWord && <Flashcard key={currentIndex} word={currentWord} />)}</div>
              <div className="w-full flex items-center justify-between">
                <IconButton onClick={handlePrev} aria-label="Previous" disabled={loading || currentIndex === 0}><ArrowLeftIcon /></IconButton>
                <p className="text-white font-semibold text-lg bg-black/30 px-4 py-2 rounded-full text-shadow">{!loading && words.length > 0 ? `${currentIndex + 1} / ${words.length}` : '...'}</p>
                {currentIndex === words.length - 1 && !loading ? <button onClick={() => handleActivityComplete('flashcard', 20, 40)} className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-green-600" title="Finish Flashcards"><TrophyIcon className="h-7 w-7"/></button> : <IconButton onClick={handleNext} aria-label="Next" disabled={loading}><ArrowRightIcon /></IconButton>}
              </div>
              <div className="w-full text-center pt-2 px-2 min-h-[40px] flex items-center justify-center">{loading ? <div className="h-5 bg-black/20 rounded-md animate-pulse w-4/5"></div> : (funFact && <p className="font-cursive text-xl text-white/90 text-shadow">"{funFact}"</p>)}</div>
            </main>
          </div>);
    }
  };

  return (
    <div className="min-h-screen w-full bg-cover bg-center flex items-center justify-center p-4 relative" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1510798831971-661eb04b3739?q=80&w=2580&auto=format&fit=crop')" }}>
      <div className="absolute inset-0 w-full h-full bg-gradient-to-b from-black/50 via-transparent to-black/70 z-0"></div>
      <div className="relative z-10 w-full max-w-sm md:max-w-md flex flex-col bg-slate-900/30 backdrop-blur-lg rounded-2xl shadow-xl overflow-hidden min-h-[600px] md:min-h-[650px]">
          <WeeklyProgress progress={weeklyProgress} count={completionCount} currentDayIndex={(new Date().getDay() + 6) % 7} />
          {renderContent()}
      </div>
    </div>
  );
};


// ============================================================================
// === INLINED: original index.tsx content ===
// ============================================================================
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);