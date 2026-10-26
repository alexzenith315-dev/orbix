import { useEffect, useRef, useState } from 'react';

// Procedural artwork: CSS 3D tilt on pointer move, disabled for reduced-motion users.
export function NftArt({ nft, float = false, className = '' }) {
  const ref = useRef(null);
  const [style, setStyle] = useState({});
  const reduced =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const onMove = (e) => {
    if (reduced || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    setStyle({ transform: `rotateX(${-y * 16}deg) rotateY(${x * 16}deg) translateZ(20px)` });
  };
  const onLeave = () => setStyle({});

  useEffect(() => setStyle({}), [nft?.id]);

  const h = nft.hue;
  const h2 = (h + 60) % 360;
  return (
    <div className={`art-wrap ${className}`} ref={ref} onPointerMove={onMove} onPointerLeave={onLeave}>
      <div className={`art ${float && !reduced ? 'art-float' : ''}`} style={style}>
        <svg viewBox="0 0 200 200" role="img" aria-label={`${nft.name} artwork`}>
          <defs>
            <radialGradient id={`g-${nft.id}`} cx="50%" cy="40%" r="70%">
              <stop offset="0" stopColor={`hsl(${h} 90% 60%)`} />
              <stop offset="0.6" stopColor={`hsl(${h2} 80% 25%)`} />
              <stop offset="1" stopColor="#060612" />
            </radialGradient>
          </defs>
          <rect width="200" height="200" fill={`url(#g-${nft.id})`} />
          {[70, 52, 34].map((r, i) => (
            <circle
              key={r}
              cx="100"
              cy="100"
              r={r}
              fill="none"
              stroke={`hsl(${(h + i * 30) % 360} 95% 70%)`}
              strokeOpacity={0.5 + i * 0.15}
              strokeWidth={2 + i}
              transform={`rotate(${i * 25} 100 100) scale(1 0.55)`}
            />
          ))}
          <circle cx="100" cy="100" r="14" fill={`hsl(${h2} 100% 75%)`} />
        </svg>
      </div>
    </div>
  );
}
