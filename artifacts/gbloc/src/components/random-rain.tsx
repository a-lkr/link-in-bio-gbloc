import { useState, type CSSProperties } from 'react';

function createRainDrops() {
  const count = 55 + Math.floor(Math.random() * 36);
  return Array.from({ length: count }, (_, index) => {
    const duration = 0.7 + Math.random() * 1.2;
    return {
      id: index,
      style: {
        '--rain-x': `${Math.random() * 100}%`,
        '--rain-y': `${Math.random() * 100}%`,
        '--rain-length': `${12 + Math.random() * 26}px`,
        '--rain-width': `${0.7 + Math.random() * 0.8}px`,
        '--rain-angle': `${6 + Math.random() * 10}deg`,
        '--rain-drift': `${2 + Math.random() * 6}%`,
        '--rain-duration': `${duration.toFixed(2)}s`,
        '--rain-delay': `${-(Math.random() * duration).toFixed(2)}s`,
        '--rain-opacity': `${0.18 + Math.random() * 0.3}`,
      } as CSSProperties,
    };
  });
}

export function RandomRain({ className = '' }: { className?: string }) {
  const [drops] = useState(createRainDrops);
  return <div className={`random-rain ${className}`} aria-hidden="true" data-rain-count={drops.length}>
    {drops.map(drop => <i key={drop.id} style={drop.style} />)}
  </div>;
}
