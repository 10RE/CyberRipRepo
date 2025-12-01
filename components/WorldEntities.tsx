import React from 'react';
import { PlayerState, TILE_SIZE, DirectorPhase, FuneralData, NPC } from '../types';

interface WorldEntitiesProps {
  players: Record<string, PlayerState>;
  myId: string | null;
  directorPhase: DirectorPhase;
  activeCeremony: FuneralData | null;
  currentSpeechBubble: string | null;
  npcs: NPC[];
  nearbyInteractableId: string | null;
}

export const WorldEntities: React.FC<WorldEntitiesProps> = ({ 
    players,
    myId,
    directorPhase, 
    activeCeremony, 
    currentSpeechBubble, 
    npcs,
    nearbyInteractableId
}) => {
  
  const isInChapel = (pos: {x: number, y: number}) => {
      const tileX = pos.x / TILE_SIZE;
      const tileY = pos.y / TILE_SIZE;
      return tileX >= 10 && tileX <= 29 && tileY >= 6 && tileY <= 17;
  };

  // --- NEW: Layered Sprite Component ---
  const renderCharacter = (appearance: any, direction: string = 'down', isMoving: boolean = false, isSitting: boolean = false, glasses: boolean = false) => {
      // Normalize direction for sprites (left is usually flipped right, but let's assume we have 4 dir or just use down for now)
      // For simplicity in this first pass, we will use 'down' (front view) for all, 
      // but you can easily change this to `${direction}` once you have all 4 direction sprites.
      const dirSuffix = 'down'; 

      const spriteStyle: React.CSSProperties = {
          position: 'absolute',
          inset: 0,
          maskSize: 'contain',
          WebkitMaskSize: 'contain',
          maskRepeat: 'no-repeat',
          WebkitMaskRepeat: 'no-repeat',
          maskPosition: 'center',
          WebkitMaskPosition: 'center',
          imageRendering: 'pixelated'
      };

      const Layer = ({ part, color, z }: { part: string, color: string, z: number }) => (
          <div style={{
              ...spriteStyle,
              backgroundColor: color,
              maskImage: `url(/assets/sprites/char_${part}_${dirSuffix}.png)`,
              WebkitMaskImage: `url(/assets/sprites/char_${part}_${dirSuffix}.png)`,
              zIndex: z
          }} />
      );

      const Overlay = ({ part, z }: { part: string, z: number }) => (
        <img 
            src={`/assets/sprites/char_${part}_${dirSuffix}.png`}
            style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                imageRendering: 'pixelated',
                zIndex: z,
                pointerEvents: 'none'
            }}
        />
      );

      return (
          <div className={`w-12 h-16 relative -mt-6 -ml-2 ${isMoving ? 'animate-bounce' : ''} ${isSitting ? 'translate-y-2' : ''} drop-shadow-lg`}>
              {/* 1. Skin Layer */}
              <Layer part="skin" color={appearance.skinColor} z={1} />
              
              {/* 2. Pants Layer */}
              <Layer part="pants" color={appearance.pantsColor} z={2} />
              
              {/* 3. Shirt Layer */}
              <Layer part="shirt" color={appearance.shirtColor} z={3} />

              {/* 4. Hat Layer (Optional) */}
              {appearance.hasHat && (
                  <Layer part="hat" color={appearance.hatColor} z={4} />
              )}

              {/* 5. Outline/Shadow Overlay (Crucial for detail!) */}
              {/* This image should be semi-transparent black outlines/shading, NO colors */}
              <Overlay part="overlay" z={10} />

              {/* Glasses (Extra accessory example) */}
              {glasses && (
                  <div className="absolute top-4 left-3 w-6 h-2 bg-black opacity-80 z-20 rounded-sm"></div>
              )}
          </div>
      );
  };

  const renderCoffin = () => (
      <div className="w-24 h-12 flex flex-col shadow-2xl items-center justify-center relative">
        <div className="w-full h-full bg-[#5d4037] border-4 border-[#3e2723] relative rounded flex items-center justify-center overflow-hidden">
            <div className="w-full h-full opacity-10 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,#000_10px,#000_12px)]"></div>
            <div className="w-16 h-2 bg-[#e4b85d] absolute shadow-sm"></div>
            <div className="w-2 h-10 bg-[#e4b85d] absolute left-1/3 shadow-sm"></div>
        </div>
    </div>
  );

  const renderBearerGroup = (isCarrying: boolean = false) => {
     const b1 = {pantsColor:'black', shirtColor:'black', skinColor:'#ffdbac', hatColor:'black', hasHat:false};
     const b2 = {pantsColor:'black', shirtColor:'black', skinColor:'#8d5524', hatColor:'black', hasHat:false};
     const b3 = {pantsColor:'black', shirtColor:'black', skinColor:'#e0ac69', hatColor:'black', hasHat:false};
     const b4 = {pantsColor:'black', shirtColor:'black', skinColor:'#f1c27d', hatColor:'black', hasHat:false};

     return (
         <div className="relative w-24 h-12 flex items-center justify-center">
             {isCarrying && renderCoffin()}
             <div className="absolute -top-8 -left-6">{renderCharacter(b1, 'up', true, false, true)}</div>
             <div className="absolute -top-8 -right-6">{renderCharacter(b2, 'up', true, false, true)}</div>
             <div className="absolute -bottom-6 -left-6">{renderCharacter(b3, 'up', true, false, true)}</div>
             <div className="absolute -bottom-6 -right-6">{renderCharacter(b4, 'up', true, false, true)}</div>
         </div>
     );
  }

  // Bubble only shows if active phase AND content exists
  const shouldShowBubble = 
      (directorPhase === DirectorPhase.PREACHING && currentSpeechBubble) ||
      directorPhase === DirectorPhase.PRE_AMEN ||
      directorPhase === DirectorPhase.AMEN ||
      directorPhase === DirectorPhase.BURIAL;

  return (
    <>
        {/* --- HEARSE --- */}
        {activeCeremony && directorPhase !== DirectorPhase.IDLE && (
            <div 
                style={{
                    position: 'absolute',
                    left: 18 * TILE_SIZE,
                    top: directorPhase === DirectorPhase.HEARSE_LEAVE ? 35 * TILE_SIZE : 25 * TILE_SIZE,
                    width: 160,
                    height: 80,
                    zIndex: 25,
                    transition: 'top 4s ease-in',
                }}
                className={directorPhase === DirectorPhase.ARRIVAL ? 'hearse-arrive' : ''}
            >
                <style>{`
                    @keyframes driveIn { from { top: ${35 * TILE_SIZE}px; } to { top: ${25 * TILE_SIZE}px; } }
                    .hearse-arrive { animation: driveIn 4s ease-out forwards; }
                `}</style>
                <div className="w-full h-full bg-black border-4 border-gray-800 relative rounded-lg shadow-2xl">
                    <div className="absolute top-2 left-2 right-2 h-1/3 bg-blue-900 border border-gray-600"></div>
                    <div className="absolute -bottom-4 left-4 w-10 h-10 bg-gray-900 rounded-full border-4 border-gray-500 animate-spin"></div>
                    <div className="absolute -bottom-4 right-4 w-10 h-10 bg-gray-900 rounded-full border-4 border-gray-500 animate-spin"></div>
                    <div className="absolute -top-2 left-2 w-4 h-2 bg-yellow-500 animate-pulse shadow-[0_0_10px_yellow]"></div>
                    <div className="absolute -top-2 right-2 w-4 h-2 bg-yellow-500 animate-pulse shadow-[0_0_10px_yellow]"></div>
                </div>
            </div>
        )}

        {/* --- BEARERS LOGIC --- */}
        {directorPhase === DirectorPhase.PROCESSION && (
             <div style={{ position: 'absolute', left: 19 * TILE_SIZE, top: 8 * TILE_SIZE, zIndex: 30 }} className="procession-walk">
                 <style>{`@keyframes walkUp { from { top: ${24 * TILE_SIZE}px; } to { top: ${8 * TILE_SIZE + 10}px; } } .procession-walk { animation: walkUp 12s linear forwards; }`}</style>
                 {renderBearerGroup(true)}
             </div>
        )}
        {directorPhase === DirectorPhase.BEARERS_RETURN && (
            <div style={{ position: 'absolute', left: 19 * TILE_SIZE, top: 17 * TILE_SIZE, zIndex: 30 }} className="bearers-return">
                <style>{`@keyframes walkBack { from { top: ${8 * TILE_SIZE}px; } to { top: ${17 * TILE_SIZE}px; } } .bearers-return { animation: walkBack 6s linear forwards; }`}</style>
                {renderBearerGroup(false)}
            </div>
        )}
        {(directorPhase === DirectorPhase.PREACHING || directorPhase === DirectorPhase.PRE_AMEN || directorPhase === DirectorPhase.AMEN || directorPhase === DirectorPhase.BURIAL) && (
            <div style={{ position: 'absolute', left: 19 * TILE_SIZE, top: 17 * TILE_SIZE, zIndex: 30 }}>
                {renderBearerGroup(false)}
            </div>
        )}
        {directorPhase === DirectorPhase.BEARERS_LEAVE && (
            <div style={{ position: 'absolute', left: 19 * TILE_SIZE, top: 25 * TILE_SIZE, zIndex: 30 }} className="bearers-leave">
                <style>{`@keyframes walkOut { from { top: ${17 * TILE_SIZE}px; } to { top: ${25 * TILE_SIZE}px; } } .bearers-leave { animation: walkOut 6s linear forwards; }`}</style>
                {renderBearerGroup(false)}
            </div>
        )}

        {/* --- STATIC COFFIN (At Altar) --- */}
        {activeCeremony && (
            directorPhase === DirectorPhase.BEARERS_RETURN || 
            directorPhase === DirectorPhase.PREACHING || 
            directorPhase === DirectorPhase.PRE_AMEN || 
            directorPhase === DirectorPhase.AMEN || 
            directorPhase === DirectorPhase.BURIAL
        ) && (
            <div
            style={{
                position: 'absolute',
                left: 19 * TILE_SIZE, 
                top: 8 * TILE_SIZE + 10,
                width: 96, 
                height: 48, 
                zIndex: 25, 
                transition: 'all 3s ease-in-out',
                transform: directorPhase === DirectorPhase.BURIAL ? 'translateY(48px)' : 'translateY(0)',
                opacity: directorPhase === DirectorPhase.BURIAL ? 0 : 1
            }}
            className="flex flex-col items-center justify-center"
            >
                {renderCoffin()}
            </div>
        )}

        {/* --- NPCS --- */}
        {npcs.map(npc => (
            <div 
                key={npc.id}
                style={{
                    width: TILE_SIZE, height: TILE_SIZE,
                    position: 'absolute', left: npc.pos.x, top: npc.pos.y,
                    zIndex: 15
                }}
                className="flex items-center justify-center"
            >
                {renderCharacter(npc.appearance, 'right', false, true)}
                {directorPhase === DirectorPhase.AMEN && isInChapel(npc.pos) && (
                    <div className="absolute -top-6 bg-white px-1 rounded text-[8px] border border-black animate-float whitespace-nowrap z-50">
                        amen
                    </div>
                )}
            </div>
        ))}

        {/* --- PRIEST --- */}
        <div 
        style={{
            width: TILE_SIZE, height: TILE_SIZE,
            position: 'absolute', left: 19 * TILE_SIZE, top: 7 * TILE_SIZE,
            zIndex: 16
        }}
        className="flex items-center justify-center"
        >
            <div className={`w-8 h-10 bg-purple-900 relative flex justify-center rounded-t-xl drop-shadow-lg ${(directorPhase === DirectorPhase.PREACHING || directorPhase === DirectorPhase.PRE_AMEN) ? 'animate-pulse' : 'animate-float'}`}>
                <div className="w-full h-2 bg-yellow-500 absolute top-4"></div>
                <div className="w-2 h-2 bg-[#ffdbac] absolute top-1 rounded-full"></div>
                <div className="absolute top-2 left-3 w-0.5 h-0.5 bg-black"></div>
                <div className="absolute top-2 right-3 w-0.5 h-0.5 bg-black"></div>
            </div>
            {shouldShowBubble && activeCeremony && (
                <div className="absolute bottom-14 left-1/2 -translate-x-1/2 w-64 bg-white p-3 rounded-lg border-2 border-black text-[10px] z-[60] flex flex-col items-center text-center shadow-xl">
                    {directorPhase === DirectorPhase.PREACHING && currentSpeechBubble && (
                        <>
                        <span className="font-bold mb-1 text-red-600 text-xs block">{activeCeremony.deceasedName}</span>
                        <span className="italic text-gray-800 leading-tight font-serif">"{currentSpeechBubble}"</span>
                        </>
                    )}
                     {directorPhase === DirectorPhase.PRE_AMEN && (
                        <span className="italic text-gray-800 leading-tight font-serif">Rest in peace, {activeCeremony.deceasedName}.</span>
                    )}
                    {directorPhase === DirectorPhase.AMEN && (
                        <span className="text-xl font-bold text-blue-800 tracking-widest">AMEN.</span>
                    )}
                    {directorPhase === DirectorPhase.BURIAL && (
                        <span className="text-gray-500 font-mono">*Dirt Sounds*</span>
                    )}
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-b-2 border-r-2 border-black rotate-45"></div>
                </div>
            )}
        </div>

        {/* --- RECEPTIONIST --- */}
        <div 
        style={{
            width: TILE_SIZE, height: TILE_SIZE,
            position: 'absolute', left: 25 * TILE_SIZE, top: 20 * TILE_SIZE - 25,
            zIndex: 9 
        }}
        className="flex items-center justify-center"
        >
            <div className="w-8 h-10 bg-blue-800 relative flex justify-center rounded-t-xl drop-shadow-lg">
                <div className="w-full h-2 bg-white absolute top-4"></div>
                <div className="w-2 h-2 bg-[#ffdbac] absolute top-1 rounded-full"></div>
                <div className="absolute top-2 left-3 w-0.5 h-0.5 bg-black"></div>
                <div className="absolute top-2 right-3 w-0.5 h-0.5 bg-black"></div>
                 <div className="absolute top-2 left-2 w-4 h-1 border-b border-black"></div>
            </div>
            {nearbyInteractableId && nearbyInteractableId.includes('receptionist') && (
                <div className="absolute -top-10 bg-white px-2 py-1 rounded-lg border-2 border-black text-[8px] whitespace-nowrap animate-bounce z-50">
                    How can I help?
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white border-b border-r border-black rotate-45"></div>
                </div>
            )}
        </div>

        {/* --- PLAYERS (Multiplayer) --- */}
        {Object.values(players).map((p: PlayerState) => (
            <div 
            key={p.id}
            style={{
                width: TILE_SIZE, height: TILE_SIZE,
                position: 'absolute', left: p.pos.x, top: p.pos.y,
                zIndex: p.isSitting ? 15 : 20, pointerEvents: 'none',
                transition: 'left 0.1s linear, top 0.1s linear' // Smooth out server updates
            }}
            className="flex items-center justify-center"
            >
                {renderCharacter(p.appearance, p.direction, p.isMoving, p.isSitting)}
                <div className={`absolute -top-8 text-[8px] px-1 rounded text-white whitespace-nowrap scale-[0.6] ${p.id === myId ? 'bg-yellow-600' : 'bg-black/40'}`}>
                    {p.id === myId ? 'You' : 'Guest'}
                </div>
                {directorPhase === DirectorPhase.AMEN && isInChapel(p.pos) && (
                     <div className="absolute -top-12 bg-white px-2 rounded text-[10px] border border-black animate-float z-50">
                        AMEN
                    </div>
                )}
            </div>
        ))}
    </>
  );
};