
import React, { useState, useEffect, useMemo, useRef } from 'react';
import PixelMap from './components/PixelMap';
import { WorldEntities } from './components/WorldEntities';
import { UIOverlay } from './components/UIOverlay';
import { Modal } from './components/Modal';
import { ApplicationForm, CustomizationForm, NoticeBoardView, IntroView } from './components/Forms';
import { useGameLoop } from './hooks/useGameLoop';
import { useFuneralSystem } from './hooks/useFuneralSystem';
import { generateMap } from './utils/mapGenerator';
import { TILE_SIZE, Interactable } from './types';

type ModalType = 'APPLICATION' | 'WARDROBE' | 'NOTICE' | 'INTRO' | null;

const Game: React.FC = () => {
    // Generate map once on mount
    const map = useMemo(() => generateMap(), []);
    
    // Viewport State
    const [zoomLevel, setZoomLevel] = useState(1.5);
    const [viewport, setViewport] = useState({ w: window.innerWidth, h: window.innerHeight });
    
    // Game State
    const [activeModal, setActiveModal] = useState<ModalType>('INTRO');
    const [notification, setNotification] = useState<string | null>(null);

    // Systems
    const { player, setPlayer } = useGameLoop(map, !!activeModal);
    const { queue, history, directorPhase, activeCeremony, addFuneral, currentSpeechBubble } = useFuneralSystem();

    // Resize Handler
    useEffect(() => {
        const handleResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // --- DERIVED STATE: Nearest Interactable ---
    // Calculate this during render to avoid useEffect state cycles
    const getNearestInteractable = () => {
        const playerCenter = { x: player.pos.x + TILE_SIZE / 2, y: player.pos.y + TILE_SIZE / 2 };
        let nearest: Interactable | null = null;
        let nearestId: string | null = null;
        let minDist = 80; // Interaction range

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

    // Refs for Event Listener Access (prevents stale closures without re-binding listeners)
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
                // Allow closing modals with Escape (except Intro)
                if (e.key === 'Escape' && currentModal !== 'INTRO') setActiveModal(null);
                return;
            }

            if (e.key.toLowerCase() !== 'f') return;

            // Prevent 'f' from being typed into inputs if a modal opens
            e.preventDefault();

            const currentPlayer = playerRef.current;
            // Standing up from chair
            if (currentPlayer.isSitting) {
                setPlayer(p => ({ ...p, isSitting: false, pos: { ...p.pos, y: p.pos.y + 10 } }));
                return;
            }

            const currentNearest = nearestRef.current;
            if (!currentNearest) return;

            // Handle specific interaction types
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
    }, [setPlayer]); // Minimal dependencies

    // Camera Calculation
    const camX = (viewport.w / (2 * zoomLevel)) - (player.pos.x + TILE_SIZE/2);
    const camY = (viewport.h / (2 * zoomLevel)) - (player.pos.y + TILE_SIZE/2);

    const renderModalContent = () => {
        switch(activeModal) {
            case 'WARDROBE':
                return <CustomizationForm player={player} setPlayer={setPlayer} close={() => setActiveModal(null)} />;
            case 'APPLICATION':
                return <ApplicationForm onSubmit={async (n, c) => {
                    setActiveModal(null);
                    setNotification("Processing request...");
                    await addFuneral(n, c);
                    setNotification("Funeral scheduled.");
                }} />;
            case 'NOTICE':
                return <NoticeBoardView history={history} queue={queue} />;
            case 'INTRO':
                return <IntroView onStart={() => setActiveModal(null)} />;
            default:
                return null;
        }
    };

    const getModalTitle = () => {
        switch(activeModal) {
            case 'WARDROBE': return 'Wardrobe';
            case 'APPLICATION': return 'Funeral Application';
            case 'NOTICE': return 'Town Chronicles';
            case 'INTRO': return '';
            default: return '';
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
                    player={player} 
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
                title={getModalTitle()} 
                onClose={activeModal === 'INTRO' ? undefined : () => setActiveModal(null)}
            >
                {renderModalContent()}
            </Modal>
        </div>
    );
};

export default Game;
