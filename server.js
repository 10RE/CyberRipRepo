import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// --- MAP GENERATION LOGIC (Moved to Server) ---
// We need the map to be consistent for all players
const TILE_SIZE = 48;
const MAP_WIDTH = 40;
const MAP_HEIGHT = 30;

// TileType Enum mapping
const TileType = {
  FLOOR: 0, WALL: 1, GRASS: 2, DOOR: 3, TOMBSTONE: 5,
  ALTAR: 6, WATER: 7, CHAIR: 8, CARPET: 9, PATH: 10,
  DESK: 11, BENCH: 12, TREE: 13, FLOWER: 14, CANDLE: 15,
  WINDOW: 16, PODIUM: 17
};

const getRandomColor = (colors) => colors[Math.floor(Math.random() * colors.length)];
const HAT_COLORS = ['#e4b85d', '#333333', '#d32f2f', '#388e3c', '#1976d2'];
const SHIRT_COLORS = ['#f44336', '#2196f3', '#4caf50', '#ffeb3b', '#9c27b0', '#795548'];
const PANTS_COLORS = ['#1565c0', '#3e2723', '#212121', '#558b2f'];

const generateServerMap = () => {
    const tiles = Array(MAP_HEIGHT).fill(null).map(() => Array(MAP_WIDTH).fill(TileType.GRASS));
    const interactables = {};
    const npcs = [];

    const drawRect = (x1, y1, x2, y2, type, border = false) => {
        for(let y=y1; y<=y2; y++) {
            for(let x=x1; x<=x2; x++) {
                if (border && (x===x1 || x===x2 || y===y1 || y===y2)) tiles[y][x] = TileType.WALL;
                else tiles[y][x] = type;
            }
        }
    };
    const place = (x, y, type, interactable) => {
        tiles[y][x] = type;
        if (interactable) interactables[`${y},${x}`] = interactable;
    };

    // Graveyard
    for(let y=1; y<MAP_HEIGHT-1; y++) {
        for(let x=1; x<MAP_WIDTH-1; x++) {
           const r = Math.random();
           const isEdge = x < 8 || x > 31 || y < 6 || y > 24;
           if (isEdge && tiles[y][x] === TileType.GRASS) {
               if (r < 0.08) tiles[y][x] = TileType.TOMBSTONE;
               else if (r < 0.12) tiles[y][x] = TileType.TREE;
               else if (r < 0.15) tiles[y][x] = TileType.FLOWER;
           }
        }
    }
    drawRect(18, 0, 21, 8, TileType.PATH); 
    drawRect(18, 24, 21, 29, TileType.PATH); 
    drawRect(0, 14, 8, 16, TileType.PATH); 
    drawRect(32, 14, 39, 16, TileType.PATH); 

    // Fountain
    place(19, 27, TileType.WATER, { type: 'fountain', id: 'fountain_1', message: "You toss a coin." });
    place(20, 27, TileType.WATER, { type: 'fountain', id: 'fountain_2', message: "The water looks pixelated." });

    // Building
    const bX1 = 10, bY1 = 6, bX2 = 29, bY2 = 24;
    drawRect(bX1, bY1, bX2, 17, TileType.FLOOR, true); // Chapel
    place(13, bY1, TileType.WINDOW); place(16, bY1, TileType.WINDOW);
    place(23, bY1, TileType.WINDOW); place(26, bY1, TileType.WINDOW);
    drawRect(19, bY1 + 1, 20, 17, TileType.CARPET);
    interactables[`9,19`] = { type: 'priest', id: 'priest', message: "Shh..." };
    interactables[`9,20`] = { type: 'priest', id: 'priest_alt', message: "Shh..." };
    place(19, bY1 + 2, TileType.ALTAR); place(20, bY1 + 2, TileType.ALTAR);
    place(18, bY1 + 2, TileType.CANDLE); place(21, bY1 + 2, TileType.CANDLE);
    place(17, bY1 + 2, TileType.PODIUM);

    [10, 12, 14, 16].forEach(y => {
        [12, 13, 14, 15, 16].forEach(x => place(x, y, TileType.BENCH, { type: 'chair', id: `pew_${y}_${x}` }));
        [23, 24, 25, 26, 27].forEach(x => place(x, y, TileType.BENCH, { type: 'chair', id: `pew_${y}_${x}` }));
    });

    drawRect(bX1, 17, bX2, bY2, TileType.FLOOR, true); // Reception
    drawRect(bX1 + 1, 17, bX2 - 1, 17, TileType.WALL);
    place(19, 17, TileType.DOOR); place(20, 17, TileType.DOOR);
    place(19, 24, TileType.DOOR); place(20, 24, TileType.DOOR);
    place(18, 24, TileType.CANDLE); place(21, 24, TileType.CANDLE);
    place(bX1, 20, TileType.DOOR); place(bX2, 20, TileType.DOOR);
    place(24, 20, TileType.DESK); place(25, 20, TileType.DESK);
    interactables['21,24'] = { type: 'receptionist', id: 'receptionist', message: "Applications here." };
    interactables['21,25'] = { type: 'receptionist', id: 'receptionist_alt', message: "Applications here." };
    place(15, 17, TileType.WALL);
    interactables['18,15'] = { type: 'notice_board', id: 'notice_board', message: "History" };
    place(12, 19, TileType.BENCH, { type: 'chair', id: `wait_19_12` });
    place(12, 21, TileType.BENCH, { type: 'chair', id: `wait_21_12` });
    place(11, 23, TileType.FLOWER); place(28, 23, TileType.FLOWER);
    place(11, 18, TileType.CANDLE); place(28, 18, TileType.CANDLE);

    return { width: MAP_WIDTH, height: MAP_HEIGHT, tiles, interactables, npcs };
};

// --- SERVER SETUP ---
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" }
});

const __dirname = dirname(fileURLToPath(import.meta.url));
// app.use(express.static(join(__dirname, 'dist')));

// --- GAME STATE ---
const mapData = generateServerMap();
const players = {}; // { socketId: PlayerState }
const funeralQueue = [];
const funeralHistory = [];
let currentCeremony = null;
let directorPhase = 'idle';
let currentSpeechBubble = null;
let phaseTimer = null;

// --- FUNERAL LOGIC ---
const startNextFuneral = () => {
    if (funeralQueue.length === 0 || currentCeremony) return;

    currentCeremony = funeralQueue.shift();
    directorPhase = 'arrival';
    broadcastState();

    // Start Phase Loop
    runPhaseTimer(4000, () => {
        directorPhase = 'procession';
        broadcastState();
        
        runPhaseTimer(12000, () => {
            directorPhase = 'bearers_return';
            broadcastState();

            runPhaseTimer(6000, () => {
                directorPhase = 'preaching';
                broadcastState();

                // Preaching is variable length based on text
                const speechDuration = Math.min(15000, (currentCeremony.eulogy.length / 10) * 1000); // Rough estimate
                
                // Simulate speech bubbles roughly
                currentSpeechBubble = currentCeremony.eulogy.substring(0, 50) + "...";
                broadcastState();
                
                runPhaseTimer(speechDuration, () => {
                    currentSpeechBubble = null;
                    directorPhase = 'pre_amen';
                    broadcastState();

                    runPhaseTimer(3500, () => {
                        directorPhase = 'amen';
                        broadcastState();

                        runPhaseTimer(3000, () => {
                            directorPhase = 'burial';
                            broadcastState();

                            runPhaseTimer(4000, () => {
                                directorPhase = 'bearers_leave';
                                broadcastState();

                                runPhaseTimer(6000, () => {
                                    funeralHistory.unshift(currentCeremony);
                                    if(funeralHistory.length > 10) funeralHistory.pop();
                                    
                                    directorPhase = 'hearse_leave';
                                    broadcastState();

                                    runPhaseTimer(4000, () => {
                                        directorPhase = 'idle';
                                        currentCeremony = null;
                                        broadcastState();
                                        // Try next
                                        setTimeout(startNextFuneral, 1000);
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
};

const runPhaseTimer = (duration, callback) => {
    if (phaseTimer) clearTimeout(phaseTimer);
    phaseTimer = setTimeout(callback, duration);
};

const broadcastState = () => {
    io.emit('gameStateUpdate', {
        queue: funeralQueue,
        history: funeralHistory,
        activeCeremony: currentCeremony,
        directorPhase: directorPhase,
        currentSpeechBubble: currentSpeechBubble
    });
};

// --- SOCKET HANDLERS ---
io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);

    // 1. Send Map & Initial State
    socket.emit('mapData', mapData);
    socket.emit('gameStateUpdate', {
        queue: funeralQueue,
        history: funeralHistory,
        activeCeremony: currentCeremony,
        directorPhase: directorPhase,
        currentSpeechBubble: currentSpeechBubble
    });
    socket.emit('currentPlayers', players);

    // 2. Initialize Player
    players[socket.id] = {
        id: socket.id,
        pos: { x: 19 * TILE_SIZE, y: 26 * TILE_SIZE },
        direction: 'up',
        isMoving: false,
        isSitting: false,
        appearance: {
            hatColor: '#000000', shirtColor: '#000000', pantsColor: '#000000', skinColor: '#ffdbac', hasHat: true
        }
    };
    io.emit('playerJoined', players[socket.id]);

    // 3. Handle Movement
    socket.on('playerMove', (data) => {
        if (players[socket.id]) {
            players[socket.id] = { ...players[socket.id], ...data };
            // Broadcast to others (exclude sender to prevent jitter if client-side predicted)
            socket.broadcast.emit('playerMoved', players[socket.id]);
        }
    });

    // 4. Handle Appearance Update
    socket.on('updateAppearance', (appearance) => {
        if (players[socket.id]) {
            players[socket.id].appearance = appearance;
            io.emit('playerMoved', players[socket.id]);
        }
    });

    // 5. Handle Funeral Submission
    socket.on('submitFuneral', (data) => {
        // data: { deceasedName, causeOfDeath, eulogy }
        const newFuneral = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            attendees: 0,
            ...data
        };
        funeralQueue.push(newFuneral);
        broadcastState();
        if (directorPhase === 'idle') {
            startNextFuneral();
        }
    });

    // 6. Disconnect
    socket.on('disconnect', () => {
        console.log('Player disconnected:', socket.id);
        delete players[socket.id];
        io.emit('playerLeft', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`CyberRip Server running on port ${PORT}`);
});