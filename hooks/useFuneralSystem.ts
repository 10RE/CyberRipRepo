import { useState, useEffect } from 'react';
import { FuneralData, DirectorPhase } from '../types';
import { socket } from '../services/socket';
import { generateWittyEulogy } from '../services/geminiService';

export const useFuneralSystem = () => {
  const [queue, setQueue] = useState<FuneralData[]>([]);
  const [history, setHistory] = useState<FuneralData[]>([]);
  const [directorPhase, setDirectorPhase] = useState<DirectorPhase>(DirectorPhase.IDLE);
  const [activeCeremony, setActiveCeremony] = useState<FuneralData | null>(null);
  const [currentSpeechBubble, setCurrentSpeechBubble] = useState<string | null>(null);

  useEffect(() => {
    socket.on('gameStateUpdate', (state) => {
        setQueue(state.queue);
        setHistory(state.history);
        setActiveCeremony(state.activeCeremony);
        // Cast string to enum if needed, or just rely on string matching
        setDirectorPhase(state.directorPhase as DirectorPhase); 
        setCurrentSpeechBubble(state.currentSpeechBubble);
    });

    return () => {
        socket.off('gameStateUpdate');
    };
  }, []);

  // Sending data to server now
  const addFuneral = async (name: string, cause: string) => {
      const eulogy = await generateWittyEulogy(name, cause);
      socket.emit('submitFuneral', { deceasedName: name, causeOfDeath: cause, eulogy });
  };

  return { queue, history, directorPhase, activeCeremony, addFuneral, currentSpeechBubble };
};