import { useState, useEffect, useRef } from 'react';

export default function PageLoadingBar() {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(true);
  const intervalRef = useRef(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev;
        return prev + (90 - prev) * 0.15;
      });
    }, 80);

    return () => {
      clearInterval(intervalRef.current);
      setProgress(100);
      setTimeout(() => setVisible(false), 400);
    };
  }, []);

  if (!visible && progress >= 100) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: 4,
      zIndex: 99999,
      background: 'rgba(0,0,0,0.06)',
      pointerEvents: 'none',
    }}>
      <div style={{
        height: '100%',
        width: `${progress}%`,
        background: 'var(--color-primary, #000)',
        transition: progress >= 100 ? 'width 0.2s ease, opacity 0.3s ease' : 'width 0.15s ease',
        opacity: progress >= 100 ? 0 : 1,
        borderRadius: '0 2px 2px 0',
        boxShadow: '0 0 8px var(--color-primary, rgba(0,0,0,0.3))',
      }} />
    </div>
  );
}
