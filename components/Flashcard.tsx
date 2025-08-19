import React, { useState, useEffect, useCallback } from 'react';
import type { Word } from '../types.ts';
import { SpeakerIcon } from './icons.tsx';

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

  // When a new word is passed, reset the card to the front face.
  useEffect(() => {
    setIsFlipped(false);
  }, [word]);

  const handlePlaySound = useCallback(() => {
    if (!isSpeechSupported) {
      return;
    }
    // Cancel any previous speech to prevent overlap.
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(word.swedish);
    utterance.lang = 'sv-SE';
    
    // Manage UI state based on speech events.
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = (e) => {
      console.error('SpeechSynthesis Error:', e);
      setIsSpeaking(false);
    };

    // Find a Swedish voice if available for better quality.
    const voices = window.speechSynthesis.getVoices();
    const swedishVoice = voices.find(voice => voice.lang === 'sv-SE');
    if (swedishVoice) {
      utterance.voice = swedishVoice;
    }
    
    window.speechSynthesis.speak(utterance);
  }, [word.swedish, isSpeechSupported]);
  
  // Auto-play sound when the card's word changes.
  useEffect(() => {
    if (!isSpeechSupported) return;

    // Named handler for the onvoiceschanged event.
    const playSoundAfterVoicesLoad = () => {
        handlePlaySound();
        // Clean up the event listener once it has run.
        window.speechSynthesis.onvoiceschanged = null;
    };

    // Small delay to allow card flip animation to start.
    const timer = setTimeout(() => {
        // Voices often load asynchronously. We need to wait for them.
        if (window.speechSynthesis.getVoices().length === 0) {
            window.speechSynthesis.onvoiceschanged = playSoundAfterVoicesLoad;
        } else {
            handlePlaySound();
        }
    }, 100);

    // Cleanup function: runs when word changes or component unmounts.
    return () => {
        clearTimeout(timer);
        // Ensure any pending speech is stopped.
        window.speechSynthesis.cancel();
        // Remove the event listener if it's still attached.
        if (window.speechSynthesis.onvoiceschanged === playSoundAfterVoicesLoad) {
            window.speechSynthesis.onvoiceschanged = null;
        }
    };
  }, [handlePlaySound, isSpeechSupported]);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };
  
  const onSoundClick = (e: React.MouseEvent) => {
      e.stopPropagation(); // Prevent card from flipping when clicking the icon
      handlePlaySound();
  };

  return (
    <div
      className="w-full h-full [perspective:1000px] cursor-pointer"
      onClick={handleFlip}
      title="Click to flip"
      aria-live="polite"
    >
      <div
        className={`relative w-full h-full transition-transform duration-700 [transform-style:preserve-3d] ${
          isFlipped ? '[transform:rotateY(180deg)]' : ''
        }`}
      >
        {/* Front of the card (Swedish) */}
        <div className="absolute w-full h-full [backface-visibility:hidden] bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg flex flex-col items-center justify-center p-4 border border-white/20">
          <span className="text-slate-600 text-sm mb-2 font-medium">Swedish</span>
          <p className="text-4xl md:text-5xl font-bold text-slate-900 text-center">{word.swedish}</p>
          <button 
             onClick={onSoundClick} 
             className="absolute bottom-4 right-4 text-slate-500 hover:text-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
             aria-label="Play audio for swedish word"
             title={isSpeechSupported ? "Play sound" : "Text-to-speech not supported"}
             disabled={!isSpeechSupported}
           >
            <SpeakerIcon className={isSpeaking ? 'text-blue-600 animate-pulse' : ''} />
          </button>
        </div>

        {/* Back of the card (English) */}
        <div className="absolute w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] bg-blue-500/90 backdrop-blur-lg rounded-2xl shadow-lg flex flex-col items-center justify-center p-4 border border-white/20">
          <span className="text-blue-100 text-sm mb-2 font-medium">English</span>
          <p className="text-4xl md:text-5xl font-bold text-white text-center">{word.english}</p>
        </div>
      </div>
    </div>
  );
};

export default Flashcard;
