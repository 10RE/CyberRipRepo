import React from 'react';
import { TileType, TILE_SIZE, GameMap } from '../types';

interface PixelMapProps {
  mapData: GameMap;
}

const PixelMap: React.FC<PixelMapProps> = ({ mapData }) => {
  
  const getTileStyle = (type: TileType, x: number, y: number) => {
    const baseStyle: React.CSSProperties = {
      width: TILE_SIZE, // TILE_SIZE is 48
      height: TILE_SIZE,
      position: 'absolute',
      left: x * TILE_SIZE,
      top: y * TILE_SIZE,
      boxSizing: 'border-box',
      backgroundSize: 'cover',
      imageRendering: 'pixelated',
      // Fix for white lines between tiles:
      // Ensure background doesn't repeat and clamp to edges
      backgroundRepeat: 'no-repeat',
      // Slightly scale up background to cover sub-pixel gaps
      transform: 'scale(1.02)', 
      transformOrigin: 'center',
      zIndex: 0 // Ensure tiles are below objects
    };

    switch (type) {
      case TileType.WALL:
        return { 
            ...baseStyle, 
            backgroundImage: 'url(/assets/tiles/wall.png)',
            zIndex: 5,
            transform: 'none' // Walls might need precise alignment, don't scale
        }; 
      case TileType.FLOOR:
        return { 
            ...baseStyle, 
            backgroundImage: 'url(/assets/tiles/floor.png)',
        }; 
      case TileType.GRASS:
        return { 
            ...baseStyle, 
            backgroundImage: 'url(/assets/tiles/grass.png)',
        }; 
      case TileType.DOOR:
        return { 
            ...baseStyle, 
            backgroundImage: 'url(/assets/tiles/floor.png)', // Door sits on floor
        };
      case TileType.WATER:
        return { 
            ...baseStyle, 
            backgroundImage: 'url(/assets/tiles/water.png)',
            opacity: 0.9,
        };
      case TileType.BENCH:
        return { 
            ...baseStyle, 
            backgroundImage: 'url(/assets/tiles/floor.png)', // Bench sits on floor
        };
      case TileType.CARPET:
        return {
            ...baseStyle,
            backgroundColor: '#b71c1c', // Keep simple color for carpet for now or add asset
            borderLeft: '2px solid #ffeb3b',
            borderRight: '2px solid #ffeb3b',
        };
      case TileType.PATH:
        return {
            ...baseStyle,
            backgroundImage: 'url(/assets/tiles/path.png)',
        };
      case TileType.DESK:
        return {
            ...baseStyle,
            backgroundImage: 'url(/assets/tiles/floor.png)',
            zIndex: 10
        };
      case TileType.CANDLE:
        return { 
            ...baseStyle, 
            backgroundImage: 'url(/assets/tiles/wall.png)',
            zIndex: 5,
            transform: 'none' // Walls might need precise alignment, don't scale
        };
      case TileType.TOMBSTONE:
        return {
            ...baseStyle,
            backgroundImage: 'url(/assets/tiles/grass.png)',
        };
      case TileType.TREE:
        return {
            ...baseStyle,
            backgroundImage: 'url(/assets/tiles/grass.png)',
        };
      case TileType.PODIUM:
        return {
            ...baseStyle,
            backgroundImage: 'url(/assets/tiles/floor.png)',
            zIndex: 10
        };
      default:
        return baseStyle;
    }
  };

  const renderObject = (type: TileType, x: number, y: number) => {
    const style: React.CSSProperties = {
        width: TILE_SIZE,
        height: TILE_SIZE,
        position: 'absolute',
        left: x * TILE_SIZE,
        top: y * TILE_SIZE,
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10
    }

    const imgStyle: React.CSSProperties = {
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        imageRendering: 'pixelated'
    };

    if (type === TileType.TOMBSTONE) {
        return (
            <div style={style}>
                <img src="/assets/sprites/tombstone.png" alt="tombstone" style={imgStyle} />
            </div>
        )
    }

    if (type === TileType.WATER) {
        // Water is handled in tiles, but we can add a ripple effect here if needed
        return null;
    }

    if (type === TileType.ALTAR) {
        return (
            <div style={style}>
                <img src="/assets/sprites/altar.png" alt="altar" style={imgStyle} />
            </div>
        )
    }
    
    if (type === TileType.DOOR) {
        return (
            <div style={style}>
                 <img src="/assets/sprites/door.png" alt="door" style={imgStyle} />
            </div>
        )
    }

    if (type === TileType.BENCH) {
        return (
            <div style={{...style, zIndex: 5}}>
                <img src="/assets/sprites/bench.png" alt="bench" style={imgStyle} />
            </div>
        );
    }

    if (type === TileType.CANDLE) {
        return (
            <div style={style}>
                <img src="/assets/sprites/candle.png" alt="candle" style={imgStyle} />
                <div className="absolute top-0 left-0 w-full h-full bg-orange-500 opacity-20 animate-pulse rounded-full blur-md"></div>
            </div>
        )
    }

    if (type === TileType.FLOWER) {
        return (
            <div style={style} className="scale-75">
                 <img src="/assets/sprites/flower.png" alt="flower" style={imgStyle} />
            </div>
        );
    }

    if (type === TileType.TREE) {
        return (
            <div style={{...style, zIndex: 25, height: TILE_SIZE * 2, top: y * TILE_SIZE - TILE_SIZE}}>
                <img src="/assets/sprites/tree.png" alt="tree" style={{...imgStyle, height: '200%', width: 'auto'}} />
            </div>
        )
    }

    if (type === TileType.WINDOW) {
        return (
            <div style={{...style, zIndex: 4}}>
                <img src="/assets/sprites/window.png" alt="window" style={imgStyle} />
            </div>
        )
    }

    if (type === TileType.PODIUM) {
        return (
            <div style={style}>
                <img src="/assets/sprites/podium.png" alt="podium" style={imgStyle} />
            </div>
        )
    }

    if (type === TileType.DESK) {
        return (
            <div style={style}>
                <img src="/assets/sprites/desk.png" alt="desk" style={imgStyle} />
            </div>
        )
    }

    return null;
  };

  return (
    <div style={{ width: mapData.width * TILE_SIZE, height: mapData.height * TILE_SIZE, position: 'relative' }}>
      {/* Tiles Layer */}
      {mapData.tiles.map((row, y) =>
        row.map((tile, x) => (
          <React.Fragment key={`${x}-${y}`}>
            <div style={getTileStyle(tile, x, y)} />
            {renderObject(tile, x, y)}
          </React.Fragment>
        ))
      )}

      {/* Lighting Overlay */}
      <div 
        style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(15, 10, 20, 0.3)', // Base darkness
            pointerEvents: 'none',
            zIndex: 20,
            mixBlendMode: 'multiply'
        }}
      ></div>

      {/* Dynamic Light Glows */}
      {mapData.tiles.map((row, y) =>
        row.map((tile, x) => {
             if(tile === TileType.CANDLE || tile === TileType.ALTAR || tile === TileType.WINDOW) {
                 return (
                     <div 
                        key={`light-${x}-${y}`}
                        style={{
                            position: 'absolute',
                            left: (x * TILE_SIZE) - (TILE_SIZE * 1.5),
                            top: (y * TILE_SIZE) - (TILE_SIZE * 1.5),
                            width: TILE_SIZE * 4,
                            height: TILE_SIZE * 4,
                            background: tile === TileType.WINDOW 
                                ? 'radial-gradient(circle, rgba(100, 100, 255, 0.2) 0%, transparent 60%)' 
                                : 'radial-gradient(circle, rgba(255, 200, 100, 0.6) 0%, transparent 70%)',
                            pointerEvents: 'none',
                            zIndex: 21,
                            mixBlendMode: 'screen'
                        }}
                     />
                 )
             }
             return null;
        })
      )}
    </div>
  );
};

export default PixelMap;