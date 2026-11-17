import { useState, type CSSProperties } from 'react';

const starColors = [
  { color: 'rgba(255,255,255,.98)', glow: 'rgba(255,255,255,.9)' },
  { color: 'rgba(216,194,255,.98)', glow: 'rgba(191,153,255,.8)' },
  { color: 'rgba(178,229,255,.98)', glow: 'rgba(130,207,255,.8)' },
];

function createRandomStars() {
  const count = 20 + Math.floor(Math.random() * 31);
  const positions: { x: number; y: number }[] = [];
  const occupiedCells = new Set<string>();
  let attempts = 0;

  while (positions.length < count && attempts < count * 300) {
    attempts += 1;
    const cellX = Math.floor(Math.random() * 960);
    const cellY = Math.floor(Math.random() * 960);
    const key = `${cellX}:${cellY}`;
    if (occupiedCells.has(key)) continue;
    const x = 2 + cellX / 10;
    const y = 2 + cellY / 10;
    const spaced = positions.every(star => Math.hypot((x - star.x) / 100, (y - star.y) / 100) >= 0.055);
    if (spaced) {
      occupiedCells.add(key);
      positions.push({ x, y });
    }
  }

  while (positions.length < count) {
    const cellX = Math.floor(Math.random() * 960);
    const cellY = Math.floor(Math.random() * 960);
    const key = `${cellX}:${cellY}`;
    if (occupiedCells.has(key)) continue;
    occupiedCells.add(key);
    positions.push({ x: 2 + cellX / 10, y: 2 + cellY / 10 });
  }

  return positions.map((position, index) => {
    const palette = starColors[Math.floor(Math.random() * starColors.length)];
    const dim = 0.25 + Math.random() * 0.25;
    return {
      id: index,
      style: {
        '--random-star-x': `${position.x.toFixed(1)}%`,
        '--random-star-y': `${position.y.toFixed(1)}%`,
        '--random-star-size': `${1 + Math.random() * 1.8}px`,
        '--random-star-color': palette.color,
        '--random-star-glow': palette.glow,
        '--random-star-dim': `${dim}`,
        '--random-star-bright': `${0.75 + Math.random() * 0.25}`,
        '--random-star-duration': `${1.4 + Math.random() * 3.6}s`,
        '--random-star-delay': `${-(Math.random() * 5).toFixed(2)}s`,
      } as CSSProperties,
    };
  });
}

export function RandomStars({ className = '' }: { className?: string }) {
  const [stars] = useState(createRandomStars);
  return <div className={`random-stars ${className}`} aria-hidden="true" data-star-count={stars.length}>
    {stars.map(star => <i key={star.id} style={star.style} />)}
  </div>;
}

export function ShootingStars({ className = '' }: { className?: string }) {
  const [meteors] = useState(() => Array.from({ length: 6 }, (_, index) => ({
    id: index,
    style: {
      '--meteor-left': `${Math.round(Math.random() * 85)}%`,
      '--meteor-top': `${Math.round(Math.random() * 78)}%`,
      '--meteor-length': `${48 + Math.round(Math.random() * 72)}px`,
      '--meteor-travel-x': `${120 + Math.round(Math.random() * 210)}px`,
      '--meteor-travel-y': `${90 + Math.round(Math.random() * 150)}px`,
      '--meteor-angle': `${27 + Math.round(Math.random() * 27)}deg`,
      '--meteor-duration': `${7 + Math.round(Math.random() * 9)}s`,
      '--meteor-delay': `${-(Math.random() * 15).toFixed(2)}s`,
      '--meteor-brightness': `${0.7 + Math.random() * 0.3}`,
    } as CSSProperties,
  })));

  return <div className={`shooting-stars ${className}`} aria-hidden="true">
    {meteors.map(meteor => <i key={meteor.id} style={meteor.style} />)}
  </div>;
}
