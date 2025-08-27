import React, { useState, useEffect, useCallback } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { ArrowLeftIcon } from './icons.tsx';
import type { MissedItem } from '../types.ts';

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

interface GrammarDetectiveProps {
  onFinish: (xpEarned: number, pointsEarned: number, missedItems: MissedItem[]) => void;
  onExit: () => void;
}

interface QuestionData {
  swedishSentence: string;
  englishSentence: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

const TOTAL_QUESTIONS = 20;

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
    setLoading(true);
    setError(null);
    if (!window.GEMINI_API_KEY || window.GEMINI_API_KEY === 'YOUR_API_KEY_HERE') {
      setError("API Key not configured.");
      setLoading(false);
      return;
    }
    
    try {
      const ai = new GoogleGenAI({ apiKey: window.GEMINI_API_KEY! });
      const questionSchema = {
        type: Type.OBJECT,
        properties: {
          swedishSentence: { type: Type.STRING, description: "A simple Swedish sentence (3-7 words)." },
          englishSentence: { type: Type.STRING, description: "The English translation of the sentence." },
          question: { type: Type.STRING, description: "A neutral, multiple-choice question about a grammar point in the sentence." },
          options: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Three plausible options, one correct." },
          correctAnswer: { type: Type.STRING, description: "The correct answer from the options." },
          explanation: { type: Type.STRING, description: "A concise explanation comparing Swedish, English, and Tagalog grammar." }
        },
        required: ['swedishSentence', 'englishSentence', 'question', 'options', 'correctAnswer', 'explanation']
      };
      const responseSchema = {
        type: Type.ARRAY,
        items: questionSchema,
      };

      const prompt = `You are a language learning assistant. Create a JSON array of ${TOTAL_QUESTIONS} unique quiz objects about Swedish grammar.

      **CRITICAL INSTRUCTION: The question must test a grammar concept from the sentence, but the answer MUST NOT be directly visible in the sentence itself.**

      **BAD Example (Avoid this):**
      - Sentence: "Jag ser **en** röd bil."
      - Question: "Which word means 'a' for the noun 'bil'?"
      - Reason: The answer 'en' is in the sentence. This is too easy.

      **GOOD Example (Create questions like this):**
      - Sentence: "Jag ser en röd bil." (I see a red car.)
      - Question: "How would you correctly say 'the red car' (definite form)?"
      - Options: ["den röd bil", "den röda bilen", "en röd bilen"]
      - Reason: This tests definite articles and adjective endings, a concept related to the sentence, but requires new knowledge.

      For each quiz object, provide:
      1. 'swedishSentence': A simple Swedish sentence (3-7 words).
      2. 'englishSentence': The English translation.
      3. 'question': A multiple-choice question following the critical instruction. Focus on grammar like V2 word order, negation, noun gender, definite/indefinite forms, and adjective endings.
      4. 'options': Three plausible options, one correct.
      5. 'correctAnswer': The correct option.
      6. 'explanation': A concise explanation comparing the Swedish rule to English and Tagalog grammar, in the format: "Swedish: [explanation]. English: [comparison]. Tagalog: [comparison]."
      
      Generate only the JSON array.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: "application/json", responseSchema: responseSchema }
      });

      const data: QuestionData[] = cleanAndParseJson(response.text);
      if (data.length < TOTAL_QUESTIONS) throw new Error("API returned fewer questions than requested.");
      setQuestions(data);
    } catch (err) {
      console.error("Grammar question generation failed:", err);
      setError("Could not generate questions. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    generateNewQuestions();
  }, [generateNewQuestions]);

  const handleAnswer = (answer: string) => {
    if (status !== 'playing') return;
    setStatus('answered');
    setSelectedAnswer(answer);

    const currentQuestion = questions[currentIndex];
    if (answer === currentQuestion.correctAnswer) {
      setPoints(p => p + 2);
      setXp(x => x + 10);
    } else {
      setMissedItems(prev => [...prev, {
        mode: 'grammar',
        question: currentQuestion.question,
        userAnswer: answer,
        correctAnswer: currentQuestion.correctAnswer
      }]);
    }
  };
  
  const handleNextQuestion = () => {
    if (currentIndex + 1 >= questions.length) {
      onFinish(xp, points, missedItems);
    } else {
      setStatus('playing');
      setSelectedAnswer(null);
      setCurrentIndex(prev => prev + 1);
    }
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
      <div className="flex items-center justify-between w-full mb-4">
        <button onClick={onExit} className="text-white bg-black/30 rounded-full p-2 hover:bg-black/50" aria-label="Return to menu"><ArrowLeftIcon /></button>
        <h2 className="text-lg font-bold text-shadow">Detective ({currentIndex + 1}/{TOTAL_QUESTIONS})</h2>
        <div className="w-20 text-right font-bold text-yellow-400">{points} pts</div>
      </div>
      
      {loading && <div className="flex-grow flex items-center justify-center"><p className="text-lg animate-pulse">Preparing your case files...</p></div>}
      {error && <div className="flex-grow flex flex-col items-center justify-center"><p className="text-red-300 mb-4">{error}</p><button onClick={generateNewQuestions} className="bg-blue-500 py-2 px-6 rounded-full">Try Again</button></div>}

      {!loading && !error && currentQuestion && (
        <div className="flex-grow flex flex-col justify-between">
          <div className="space-y-4">
            <div className="bg-black/20 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-shadow">{currentQuestion.swedishSentence}</p>
              <p className="text-sm text-slate-300">"{currentQuestion.englishSentence}"</p>
            </div>
            
            <div className="bg-white/10 p-4 rounded-lg"><p className="font-semibold text-lg text-center">{currentQuestion.question}</p></div>

            <div className="space-y-3">
              {currentQuestion.options.map(option => (
                <button key={option} onClick={() => handleAnswer(option)} disabled={status === 'answered'} className={`w-full text-left p-3 rounded-lg font-semibold text-slate-800 shadow-md transition-all duration-300 transform ${getButtonClass(option)}`}>
                  {option}
                </button>
              ))}
            </div>
          </div>
          
          <div className="mt-auto pt-2">
            {status === 'playing' && <button onClick={() => onFinish(xp, points, missedItems)} className="w-full bg-slate-600/50 font-bold py-3 rounded-full hover:bg-slate-600/80">Finish Session</button>}
            {status === 'answered' && (
              <div className="flex flex-col space-y-3">
                <div className="p-3 bg-black/30 rounded-lg text-sm">
                  <p className="font-bold text-yellow-300 mb-1">The Clue:</p>
                  <p className="text-slate-200">{currentQuestion.explanation}</p>
                </div>
                <button onClick={handleNextQuestion} className="w-full bg-blue-500 font-bold py-3 rounded-full shadow-lg text-lg hover:bg-blue-600">
                  {currentIndex + 1 === TOTAL_QUESTIONS ? 'Finish' : 'Next Case'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GrammarDetective;