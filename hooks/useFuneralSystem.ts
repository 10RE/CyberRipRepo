import { useState, useEffect, useRef } from 'react';
import { FuneralData, DirectorPhase } from '../types';
// import { generateWittyEulogy } from '../services/geminiService';
import { generateWittyEulogy } from '../services/openaiService';

const INITIAL_FUNERAL: FuneralData = {
  id: 'init',
  deceasedName: 'Your Motivation',
  causeOfDeath: 'Doomscrolling',
  eulogy: "It died as it lived: consuming content without creating anything. It was tragic. We gathered here today not to mourn, but to scroll past this moment.",
  timestamp: Date.now(),
  attendees: 0
};

export const useFuneralSystem = () => {
  const [queue, setQueue] = useState<FuneralData[]>([]);
  const [history, setHistory] = useState<FuneralData[]>([]);
  const [directorPhase, setDirectorPhase] = useState<DirectorPhase>(DirectorPhase.IDLE);
  const [activeCeremony, setActiveCeremony] = useState<FuneralData | null>(null);
  
  // Speech Logic
  const [currentSpeechBubble, setCurrentSpeechBubble] = useState<string | null>(null);
  const speechChunksRef = useRef<string[]>([]);
  const currentChunkIndexRef = useRef(0);

  const addFuneral = async (name: string, cause: string) => {
      const eulogy = await generateWittyEulogy(name, cause);
      const newFuneral: FuneralData = {
          id: Date.now().toString(),
          deceasedName: name,
          causeOfDeath: cause,
          eulogy,
          timestamp: Date.now(),
          attendees: 0
      };
      setQueue(prev => [...prev, newFuneral]);
  };

  // Improved Chunking: Split by sentence, then by length
  const chunkText = (text: string): string[] => {
      // Regex looks for sentence terminators (.!?) and splits after them
      // matching the terminator and following whitespace
      const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
      const finalChunks: string[] = [];

      sentences.forEach(sentence => {
          const trimmed = sentence.trim();
          if (!trimmed) return;

          // If sentence is too long (> 15 words), split it roughly
          const words = trimmed.split(/\s+/);
          if (words.length > 15) {
              let chunk: string[] = [];
              words.forEach(word => {
                  chunk.push(word);
                  if (chunk.length >= 10) {
                      finalChunks.push(chunk.join(' ') + '...');
                      chunk = [];
                  }
              });
              if (chunk.length > 0) finalChunks.push(chunk.join(' '));
          } else {
              finalChunks.push(trimmed);
          }
      });
      
      return finalChunks;
  };

  // Ceremony Loop
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const runPreachingLoop = () => {
        const chunks = speechChunksRef.current;
        const idx = currentChunkIndexRef.current;

        if (idx < chunks.length) {
            // Show bubble
            setCurrentSpeechBubble(chunks[idx]);
            currentChunkIndexRef.current++;
            
            // Calculate reading time based on length, min 2.5s, max 5s
            const readTime = Math.min(5000, Math.max(2500, chunks[idx].length * 60));
            
            // Display time
            timer = setTimeout(() => {
                // Hide bubble (Gap)
                setCurrentSpeechBubble(null);
                // Gap duration (1s)
                timer = setTimeout(runPreachingLoop, 1000);
            }, readTime);
        } else {
            // Done preaching
            setCurrentSpeechBubble(null);
            setDirectorPhase(DirectorPhase.PRE_AMEN);
        }
    };

    // STATE MACHINE
    if (directorPhase === DirectorPhase.IDLE && queue.length > 0 && !activeCeremony) {
        const next = queue[0];
        setActiveCeremony(next);
        setQueue(prev => prev.slice(1));
        setDirectorPhase(DirectorPhase.ARRIVAL);
        
        speechChunksRef.current = chunkText(next.eulogy);
        currentChunkIndexRef.current = 0;
    }
    else if (directorPhase === DirectorPhase.ARRIVAL) {
        // Hearse drives in (4s animation)
        timer = setTimeout(() => setDirectorPhase(DirectorPhase.PROCESSION), 4000);
    }
    else if (directorPhase === DirectorPhase.PROCESSION) {
        // Bearers walk to Altar (Slower: 12s)
        timer = setTimeout(() => setDirectorPhase(DirectorPhase.BEARERS_RETURN), 12000);
    }
    else if (directorPhase === DirectorPhase.BEARERS_RETURN) {
        // Bearers walk back to CHAPEL DOOR (y=17) from Altar (y=8). 
        // Slower: 6s
        timer = setTimeout(() => setDirectorPhase(DirectorPhase.PREACHING), 6000);
    }
    else if (directorPhase === DirectorPhase.PREACHING) {
        if (currentChunkIndexRef.current === 0) {
            // Small delay before speaking starts
            timer = setTimeout(runPreachingLoop, 1000);
        }
    }
    else if (directorPhase === DirectorPhase.PRE_AMEN) {
        // "Rest in Peace [Name]" (3s)
        timer = setTimeout(() => setDirectorPhase(DirectorPhase.AMEN), 3500);
    }
    else if (directorPhase === DirectorPhase.AMEN) {
        // "AMEN" (3s)
        timer = setTimeout(() => setDirectorPhase(DirectorPhase.BURIAL), 3000);
    }
    else if (directorPhase === DirectorPhase.BURIAL) {
        // Coffin Sinks (4s)
        timer = setTimeout(() => setDirectorPhase(DirectorPhase.BEARERS_LEAVE), 4000); 
    }
    else if (directorPhase === DirectorPhase.BEARERS_LEAVE) {
        // Bearers walk out from Chapel Door to Main Gate (6s)
        if (activeCeremony) setHistory(prev => [activeCeremony, ...prev]);
        timer = setTimeout(() => setDirectorPhase(DirectorPhase.HEARSE_LEAVE), 6000);
    }
    else if (directorPhase === DirectorPhase.HEARSE_LEAVE) {
        // Hearse drives away (4s)
        timer = setTimeout(() => {
            setDirectorPhase(DirectorPhase.IDLE);
            setActiveCeremony(null);
            setCurrentSpeechBubble(null);
        }, 4000);
    }

    return () => clearTimeout(timer);
  }, [directorPhase, queue, activeCeremony]);

  return { queue, history, directorPhase, activeCeremony, addFuneral, currentSpeechBubble };
};