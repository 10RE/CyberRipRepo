import { useState, useRef, useCallback, useEffect } from 'react';
import { PlayerState, GameMap, TILE_SIZE, TileType, MAP_WIDTH, MAP_HEIGHT } from '../types';
import { socket } from '../services/socket';

const MOVEMENT_SPEED = 4;
const PLAYER_HITBOX_SIZE = 24;

export const useGameLoop = (map: GameMap | null, paused: boolean) => {
  const [players, setPlayers] = useState<Record<string, PlayerState>>({});
  const [myId, setMyId] = useState<string | null>(null);

  // Local state for immediate rendering (Client prediction)
  const [localPlayer, setLocalPlayer] = useState<PlayerState>({
    pos: { x: 19 * TILE_SIZE, y: 26 * TILE_SIZE },
    direction: 'up',
    isMoving: false,
    isSitting: false,
    appearance: {
        hatColor: '#000000', shirtColor: '#000000', pantsColor: '#000000', skinColor: '#ffdbac', hasHat: true
    }
  });

  const playerRef = useRef(localPlayer);
  useEffect(() => { playerRef.current = localPlayer; }, [localPlayer]);

  const keysPressed = useRef<Set<string>>(new Set());
  const requestRef = useRef<number | null>(null);
  const lastEmitRef = useRef<number>(0);

  // --- SOCKET LISTENERS ---
  useEffect(() => {
    const onConnect = () => setMyId(socket.id || null);
    
    socket.on('connect', onConnect);
    socket.on('currentPlayers', (serverPlayers) => setPlayers(serverPlayers));
    socket.on('playerJoined', (p) => setPlayers(prev => ({ ...prev, [p.id!]: p })));
    socket.on('playerMoved', (p) => {
        if (p.id !== socket.id) { // Only update others from server
            setPlayers(prev => ({ ...prev, [p.id!]: p }));
        }
    });
    socket.on('playerLeft', (id) => {
        setPlayers(prev => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
    });

    return () => {
        socket.off('connect', onConnect);
        socket.off('currentPlayers');
        socket.off('playerJoined');
        socket.off('playerMoved');
        socket.off('playerLeft');
    };
  }, []);

  // Update server with appearance changes
  const updateAppearance = (newAppearance: any) => {
      setLocalPlayer(prev => {
          const updated = { ...prev, appearance: newAppearance };
          socket.emit('updateAppearance', newAppearance);
          return updated;
      });
  };

  // Input Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        const key = e.key.toLowerCase();
        keysPressed.current.add(key);
        
        if (playerRef.current.isSitting && ['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(key)) {
            const newState = { 
                ...playerRef.current, 
                isSitting: false, 
                pos: { ...playerRef.current.pos, y: playerRef.current.pos.y + 10 } 
            };
            setLocalPlayer(newState);
            socket.emit('playerMove', newState);
        }
    };
    const handleKeyUp = (e: KeyboardEvent) => keysPressed.current.delete(e.key.toLowerCase());

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Physics Loop
  const updateGame = useCallback(() => {
    if (!map) return;
    const currentPlayer = playerRef.current;

    if (paused || currentPlayer.isSitting) {
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

    let isMoving = false;
    let newPos = { ...currentPlayer.pos };
    let newDir = currentPlayer.direction;

    if (dx !== 0 || dy !== 0) {
        isMoving = true;
        const length = Math.sqrt(dx * dx + dy * dy);
        dx = (dx / length) * MOVEMENT_SPEED;
        dy = (dy / length) * MOVEMENT_SPEED;
        
        const nextX = currentPlayer.pos.x + dx;
        const nextY = currentPlayer.pos.y + dy;
        const hitboxOffset = (TILE_SIZE - PLAYER_HITBOX_SIZE) / 2;
        
        const checkCollision = (x: number, y: number) => {
            const left = x + hitboxOffset;
            const right = x + TILE_SIZE - hitboxOffset;
            const top = y + TILE_SIZE / 2;
            const bottom = y + TILE_SIZE - 4;
            const corners = [{x: left, y: top}, {x: right, y: top}, {x: left, y: bottom}, {x: right, y: bottom}];

            for (const p of corners) {
                const tx = Math.floor(p.x / TILE_SIZE);
                const ty = Math.floor(p.y / TILE_SIZE);
                if (tx < 0 || tx >= MAP_WIDTH || ty < 0 || ty >= MAP_HEIGHT) return true;
                const tile = map.tiles[ty][tx];
                if (tile === TileType.WALL || tile === TileType.DESK || tile === TileType.TOMBSTONE || tile === TileType.ALTAR || tile === TileType.WATER || tile === TileType.TREE || tile === TileType.PODIUM) return true;
            }
            return false;
        };

        if (!checkCollision(nextX, currentPlayer.pos.y)) newPos.x = nextX;
        if (!checkCollision(newPos.x, nextY)) newPos.y = nextY;

        if (Math.abs(dx) > Math.abs(dy)) newDir = dx > 0 ? 'right' : 'left';
        else if (dy !== 0) newDir = dy > 0 ? 'down' : 'up';
    }

    if (isMoving || currentPlayer.isMoving) {
        const newState = { ...currentPlayer, pos: newPos, direction: newDir, isMoving };
        setLocalPlayer(newState);

        // Emit to server (throttled to 30ms to avoid flooding)
        const now = Date.now();
        if (now - lastEmitRef.current > 30) {
            socket.emit('playerMove', { pos: newPos, direction: newDir, isMoving });
            lastEmitRef.current = now;
        }
    }

    requestRef.current = requestAnimationFrame(updateGame);
  }, [map, paused]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(updateGame);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [updateGame]);

  // Merge local player into players list for rendering
  const allPlayers = { ...players };
  if (myId) {
      allPlayers[myId] = { ...localPlayer, id: myId };
  }

  // Helper for setting local player specifically (e.g. sit down)
  const setLocalPlayerWrapper = (action: (p: PlayerState) => PlayerState) => {
      setLocalPlayer(prev => {
          const next = action(prev);
          socket.emit('playerMove', next);
          return next;
      });
  }

  return { player: localPlayer, setPlayer: setLocalPlayerWrapper, players: allPlayers, myId };
};