import React, { useState, useEffect, useRef } from 'react';
import PixelMap from './components/PixelMap';
import { WorldEntities } from './components/WorldEntities';
import { UIOverlay } from './components/UIOverlay';
import { Modal } from './components/Modal';
import { ApplicationForm, CustomizationForm, NoticeBoardView, IntroView } from './components/Forms';
import { useGameLoop } from './hooks/useGameLoop';
import { useFuneralSystem } from './hooks/useFuneralSystem';
import { TILE_SIZE, Interactable, GameMap } from './types';
import { socket } from './services/socket';

type ModalType = 'APPLICATION' | 'WARDROBE' | 'NOTICE' | 'INTRO' | null;

const Game: React.FC = () => {
    // Map is now loaded from server
    const [map, setMap] = useState<GameMap | null>(null);
    
    // Viewport State
    const [zoomLevel, setZoomLevel] = useState(1.5);
    const [viewport, setViewport] = useState({ w: window.innerWidth, h: window.innerHeight });
    
    // Game State
    const [activeModal, setActiveModal] = useState<ModalType>('INTRO');
    const [notification, setNotification] = useState<string | null>(null);

    // Systems
    // useGameLoop now requires map to be loaded
    const { player, setPlayer, players, myId } = useGameLoop(map, !!activeModal);
    const { queue, history, directorPhase, activeCeremony, addFuneral, currentSpeechBubble } = useFuneralSystem();

    // Listen for Map Data
    useEffect(() => {
        console.log('Game component mounted, setting up socket listeners');
        socket.on('connect', () => {
            console.log('Socket connected:', socket.id);
        });
        socket.on('connect_error', (err) => {
            console.error('Socket connection error:', err);
        });
        socket.on('mapData', (data) => {
            console.log('Received map data');
            setMap(data);
        });
        return () => { 
            socket.off('connect');
            socket.off('connect_error');
            socket.off('mapData'); 
        };
    }, []);

    // Resize Handler
    useEffect(() => {
        const handleResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // --- DERIVED STATE: Nearest Interactable ---
    const getNearestInteractable = () => {
        if (!map) return { nearest: null, nearestId: null };
        const playerCenter = { x: player.pos.x + TILE_SIZE / 2, y: player.pos.y + TILE_SIZE / 2 };
        let nearest: Interactable | null = null;
        let nearestId: string | null = null;
        let minDist = 80;

        Object.entries(map.interactables).forEach(([key, obj]) => {
            const interactable = obj as Interactable;
            const [ty, tx] = key.split(',').map(Number);
            const objCenter = { x: tx * TILE_SIZE + TILE_SIZE / 2, y: ty * TILE_SIZE + TILE_SIZE / 2 };
            const dist = Math.hypot(playerCenter.x - objCenter.x, playerCenter.y - objCenter.y);
            if (dist < minDist) { 
                minDist = dist; 
                nearest = interactable;
                nearestId = interactable.id;
            }
        });
        return { nearest, nearestId };
    };

    const { nearest, nearestId } = getNearestInteractable();

    // Refs
    const nearestRef = useRef(nearest);
    const playerRef = useRef(player);
    const activeModalRef = useRef(activeModal);

    useEffect(() => { nearestRef.current = nearest; }, [nearest]);
    useEffect(() => { playerRef.current = player; }, [player]);
    useEffect(() => { activeModalRef.current = activeModal; }, [activeModal]);

    // Interaction Listener
    useEffect(() => {
        const handleInteract = (e: KeyboardEvent) => {
            const currentModal = activeModalRef.current;
            
            if (currentModal) {
                if (e.key === 'Escape' && currentModal !== 'INTRO') setActiveModal(null);
                return;
            }

            if (e.key.toLowerCase() !== 'f') return;
            e.preventDefault();

            const currentPlayer = playerRef.current;
            if (currentPlayer.isSitting) {
                setPlayer(p => ({ ...p, isSitting: false, pos: { ...p.pos, y: p.pos.y + 10 } }));
                return;
            }

            const currentNearest = nearestRef.current;
            if (!currentNearest) return;

            if (currentNearest.type === 'receptionist') {
                setActiveModal('APPLICATION');
            } else if (currentNearest.type === 'notice_board') {
                setActiveModal('NOTICE');
            } else if (currentNearest.type === 'chair') {
                const [y, x] = currentNearest.id.split('_').slice(1).map(Number);
                setPlayer(p => ({
                    ...p, 
                    isSitting: true, 
                    isMoving: false, 
                    direction: 'right', 
                    pos: { x: x * TILE_SIZE, y: y * TILE_SIZE - 10 }
                }));
            } else if (currentNearest.message) {
                setNotification(currentNearest.message);
                setTimeout(() => setNotification(null), 3000);
            }
        };

        window.addEventListener('keydown', handleInteract);
        return () => window.removeEventListener('keydown', handleInteract);
    }, [setPlayer]);

    if (!map) return <div className="w-full h-screen bg-black text-[#e4b85d] flex items-center justify-center font-pixel">Connecting to Afterlife...</div>;

    const camX = (viewport.w / (2 * zoomLevel)) - (player.pos.x + TILE_SIZE/2);
    const camY = (viewport.h / (2 * zoomLevel)) - (player.pos.y + TILE_SIZE/2);

    const renderModalContent = () => {
        switch(activeModal) {
            case 'WARDROBE':
                return <CustomizationForm player={player} setPlayer={setPlayer} close={() => setActiveModal(null)} />;
            case 'APPLICATION':
                return <ApplicationForm onSubmit={async (n, c) => {
                    setActiveModal(null);
                    setNotification("Request sent to server...");
                    await addFuneral(n, c);
                }} />;
            case 'NOTICE':
                return <NoticeBoardView history={history} queue={queue} />;
            case 'INTRO':
                return <IntroView onStart={() => setActiveModal(null)} />;
            default:
                return null;
        }
    };

    return (
        <div className="w-full h-screen bg-[#f0e6d2] overflow-hidden relative select-none font-pixel">
            <div 
                style={{ 
                    transform: `scale(${zoomLevel}) translate3d(${camX}px, ${camY}px, 0)`, 
                    transformOrigin: 'top left' 
                }}
                className="will-change-transform absolute top-0 left-0 transition-transform duration-75 ease-linear"
            >
                <PixelMap mapData={map} />
                <WorldEntities 
                    players={players}
                    myId={myId}
                    directorPhase={directorPhase} 
                    activeCeremony={activeCeremony} 
                    currentSpeechBubble={currentSpeechBubble}
                    npcs={map.npcs}
                    nearbyInteractableId={nearestId}
                />
            </div>

            <UIOverlay 
                queueLength={queue.length} 
                activeName={activeCeremony?.deceasedName}
                zoomLevel={zoomLevel}
                toggleZoom={() => setZoomLevel(z => z >= 3 ? 1 : z + 0.25)}
                openWardrobe={() => setActiveModal('WARDROBE')}
                notification={notification}
            />

            <Modal 
                isOpen={!!activeModal} 
                title={activeModal === 'WARDROBE' ? 'Wardrobe' : activeModal === 'APPLICATION' ? 'Funeral Application' : activeModal === 'NOTICE' ? 'Town Chronicles' : ''} 
                onClose={activeModal === 'INTRO' ? undefined : () => setActiveModal(null)}
            >
                {renderModalContent()}
            </Modal>
        </div>
    );
};

export default Game;