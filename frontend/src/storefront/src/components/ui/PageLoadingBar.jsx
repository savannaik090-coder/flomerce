import { useState, useEffect, useRef } from 'react';

export default function PageLoadingBar() {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(true);
  const intervalRef = useRef(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev;
        return prev + (90 - prev) * 0.1;
      });
    }, 100);

    return () => {
      clearInterval(intervalRef.current);
      setProgress(100);
      setTimeout(() => setVisible(false), 300);
    };
  }, []);

  if (!visible && progress >= 100) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: 3,
      zIndex: 99999,
      pointerEvents: 'none',
    }}>
      <div style={{
        height: '100%',
        width: `${progress}%`,
        background: 'var(--color-primary, #000)',
        transition: 'width 0.2s ease',
        borderRadius: '0 2px 2px 0',
      }} />
    </div>
  );
}
