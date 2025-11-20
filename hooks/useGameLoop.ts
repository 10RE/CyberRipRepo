
import { useState, useRef, useCallback, useEffect } from 'react';
import { PlayerState, GameMap, TILE_SIZE, TileType, MAP_WIDTH, MAP_HEIGHT } from '../types';

const MOVEMENT_SPEED = 4;
const PLAYER_HITBOX_SIZE = 24;

export const useGameLoop = (map: GameMap, paused: boolean) => {
  const [player, setPlayer] = useState<PlayerState>({
    pos: { x: 19 * TILE_SIZE, y: 26 * TILE_SIZE }, // Start at new Main Entrance (South)
    direction: 'up',
    isMoving: false,
    isSitting: false,
    appearance: {
        hatColor: '#000000',
        shirtColor: '#000000',
        pantsColor: '#000000',
        skinColor: '#ffdbac',
        hasHat: true
    }
  });

  const keysPressed = useRef<Set<string>>(new Set());
  const requestRef = useRef<number | null>(null);

  // Input Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        const key = e.key.toLowerCase();
        keysPressed.current.add(key);
        
        // Stand up logic
        if (player.isSitting && ['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(key)) {
            setPlayer(prev => ({ 
                ...prev, 
                isSitting: false, 
                pos: { ...prev.pos, y: prev.pos.y + 10 } // Pop out of chair
            }));
        }
    };
    const handleKeyUp = (e: KeyboardEvent) => keysPressed.current.delete(e.key.toLowerCase());

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
    };
  }, [player.isSitting]);

  // Physics Loop
  const updateGame = useCallback(() => {
    if (paused || player.isSitting) {
        requestRef.current = requestAnimationFrame(updateGame);
        return;
    }

    let dx = 0;
    let dy = 0;
    const k = keysPressed.current;

    if (k.has('arrowup') || k.has('w')) dy -= 1;
    if (k.has('arrowdown') || k.has('s')) dy += 1;
    if (k.has('arrowleft') || k.has('a')) dx -= 1;
    if (k.has('arrowright') || k.has('d')) dx += 1;

    if (dx !== 0 || dy !== 0) {
        // Normalize diagonal speed
        const length = Math.sqrt(dx * dx + dy * dy);
        dx = (dx / length) * MOVEMENT_SPEED;
        dy = (dy / length) * MOVEMENT_SPEED;
        
        setPlayer(prev => {
            const nextX = prev.pos.x + dx;
            const nextY = prev.pos.y + dy;
            
            const hitboxOffset = (TILE_SIZE - PLAYER_HITBOX_SIZE) / 2;
            
            // AABB Collision
            const checkCollision = (x: number, y: number) => {
                const left = x + hitboxOffset;
                const right = x + TILE_SIZE - hitboxOffset;
                const top = y + TILE_SIZE / 2; // Feet only
                const bottom = y + TILE_SIZE - 4;

                const corners = [{x: left, y: top}, {x: right, y: top}, {x: left, y: bottom}, {x: right, y: bottom}];

                for (const p of corners) {
                    const tx = Math.floor(p.x / TILE_SIZE);
                    const ty = Math.floor(p.y / TILE_SIZE);
                    
                    if (tx < 0 || tx >= MAP_WIDTH || ty < 0 || ty >= MAP_HEIGHT) return true;
                    
                    const tile = map.tiles[ty][tx];
                    // Wall and Desk block movement. Doors, Water, etc are walkable (though logic might vary for water)
                    if (tile === TileType.WALL || tile === TileType.DESK) return true;
                }
                return false;
            };

            let finalX = prev.pos.x;
            let finalY = prev.pos.y;

            // Sliding collision (check X and Y separately)
            if (!checkCollision(nextX, prev.pos.y)) finalX = nextX;
            if (!checkCollision(finalX, nextY)) finalY = nextY;

            // Determine Direction
            let dir = prev.direction;
            if (Math.abs(dx) > Math.abs(dy)) dir = dx > 0 ? 'right' : 'left';
            else if (dy !== 0) dir = dy > 0 ? 'down' : 'up';

            return { ...prev, pos: { x: finalX, y: finalY }, direction: dir, isMoving: true };
        });
    } else {
        setPlayer(prev => prev.isMoving ? { ...prev, isMoving: false } : prev);
    }

    requestRef.current = requestAnimationFrame(updateGame);
  }, [map, paused, player.isSitting]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(updateGame);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [updateGame]);

  return { player, setPlayer };
};
