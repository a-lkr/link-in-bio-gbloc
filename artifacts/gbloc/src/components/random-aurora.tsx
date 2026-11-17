import { useState, type CSSProperties } from 'react';

const auroraHues = [158, 176, 192, 211, 232, 252, 274, 292, 314, 332];

function createCloudStyle(): CSSProperties {
  const hue = auroraHues[Math.floor(Math.random() * auroraHues.length)];
  return {
    '--aurora-x': `${12 + Math.random() * 76}%`,
    '--aurora-y': `${12 + Math.random() * 76}%`,
    '--aurora-width': `${38 + Math.random() * 48}%`,
    '--aurora-height': `${34 + Math.random() * 48}%`,
    '--aurora-hue': `${hue}`,
    '--aurora-shift-x': `${-22 + Math.random() * 44}%`,
    '--aurora-shift-y': `${-20 + Math.random() * 40}%`,
    '--aurora-rotation': `${-35 + Math.random() * 70}deg`,
    '--aurora-dim': `${0.12 + Math.random() * 0.12}`,
    '--aurora-peak': `${0.24 + Math.random() * 0.2}`,
  } as CSSProperties;
}

function createCloud(id: number) {
  const duration = `${18 + Math.random() * 20}s`;
  return {
    id,
    duration,
    style: {
      ...createCloudStyle(),
      '--aurora-duration': duration,
      '--aurora-delay': `${-(Math.random() * 28).toFixed(2)}s`,
    } as CSSProperties,
  };
}

export function RandomAurora({ className = '' }: { className?: string }) {
  const [clouds, setClouds] = useState(() =>
    Array.from({ length: 3 + Math.floor(Math.random() * 3) }, (_, index) => createCloud(index)),
  );

  function respawn(id: number) {
    setClouds(current => current.map(cloud => cloud.id === id
      ? {
        ...cloud,
        style: {
          ...createCloudStyle(),
          '--aurora-duration': cloud.duration,
          '--aurora-delay': '0s',
        } as CSSProperties,
      }
      : cloud));
  }

  return <div className={`random-aurora ${className}`} aria-hidden="true">
    {clouds.map(cloud => <i
      key={cloud.id}
      style={cloud.style}
      onAnimationIteration={() => respawn(cloud.id)}
    />)}
  </div>;
}
