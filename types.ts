export enum TileType {
  FLOOR = 0,      // Standard wood floor
  WALL = 1,       // Brick/Wood wall
  GRASS = 2,      // Textured grass
  DOOR = 3,       // Doorways
  // Coffin is an Entity, not a tile
  TOMBSTONE = 5,  // Static tombstone tile
  ALTAR = 6,      // Church altar
  WATER = 7,      // Fountain water
  CHAIR = 8,      // Generic Chair (Unused now, using BENCH)
  CARPET = 9,     // Red carpet
  PATH = 10,      // Stone path
  DESK = 11,      // Reception desk
  BENCH = 12,     // Church Pews
  TREE = 13,      // Nature
  FLOWER = 14,    // Nature
  CANDLE = 15,    // Light source
  WINDOW = 16,    // Stained Glass
  PODIUM = 17     // Speaker stand
}

export interface Position {
  x: number;
  y: number;
}

export interface CharacterAppearance {
  hatColor: string;
  shirtColor: string;
  pantsColor: string;
  skinColor: string;
  hasHat: boolean;
}

export interface NPC {
  id: string;
  pos: Position;
  appearance: CharacterAppearance;
}

export interface FuneralData {
  id: string;
  deceasedName: string;
  causeOfDeath: string; 
  eulogy: string;
  timestamp: number;
  attendees: number;
}

export interface PlayerState {
  pos: Position;
  direction: 'up' | 'down' | 'left' | 'right';
  isMoving: boolean;
  isSitting: boolean;
  appearance: CharacterAppearance;
}

export interface GameMap {
  width: number;
  height: number;
  tiles: TileType[][];
  interactables: Record<string, Interactable>;
  npcs: NPC[];
}

export interface Interactable {
  type: 'coffin' | 'tombstone' | 'priest' | 'fountain' | 'chair' | 'receptionist' | 'notice_board';
  message?: string;
  id: string;
}

export enum DirectorPhase {
  IDLE = 'idle',
  ARRIVAL = 'arrival',       // Hearse arrives
  PROCESSION = 'procession', // Pallbearers carry coffin to altar
  BEARERS_RETURN = 'bearers_return', // Bearers walk back to door
  PREACHING = 'preaching',   // Ceremony
  PRE_AMEN = 'pre_amen',     // "Rest in Peace"
  AMEN = 'amen',
  BURIAL = 'burial',
  BEARERS_LEAVE = 'bearers_leave', // Bearers exit
  HEARSE_LEAVE = 'hearse_leave'    // Hearse drives off
}

export const TILE_SIZE = 48;
export const MAP_WIDTH = 40;
export const MAP_HEIGHT = 30;

// Socket Types
export interface ServerToClientEvents {
    mapData: (map: GameMap) => void;
    gameStateUpdate: (state: {
        queue: FuneralData[];
        history: FuneralData[];
        activeCeremony: FuneralData | null;
        directorPhase: string; // string from server, mapped to enum on client
        currentSpeechBubble: string | null;
    }) => void;
    currentPlayers: (players: Record<string, PlayerState>) => void;
    playerJoined: (player: PlayerState) => void;
    playerMoved: (player: PlayerState) => void;
    playerLeft: (id: string) => void;
}

export interface ClientToServerEvents {
    playerMove: (player: Partial<PlayerState>) => void;
    updateAppearance: (appearance: CharacterAppearance) => void;
    submitFuneral: (data: { deceasedName: string; causeOfDeath: string; eulogy: string }) => void;
}