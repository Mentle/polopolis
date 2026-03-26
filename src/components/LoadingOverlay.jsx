import { useState, useEffect, useRef } from 'react';

const asciiSpinnerFrames = ['/', '-', '\\', '|'];

export default function LoadingOverlay({ progress, isLoading, onFadeOutComplete }) {
  const [spinnerIndex, setSpinnerIndex] = useState(0);
  const [hidden, setHidden] = useState(false);
  const overlayRef = useRef(null);

  useEffect(() => {
    if (!isLoading) return;
    
    const interval = setInterval(() => {
      setSpinnerIndex(prev => (prev + 1) % asciiSpinnerFrames.length);
    }, 100);

    return () => clearInterval(interval);
  }, [isLoading]);

  // Handle fade-out transition matching the original transitionend pattern
  useEffect(() => {
    if (isLoading) return;

    const el = overlayRef.current;
    if (!el) return;

    let handled = false;
    const finish = () => {
      if (handled) return;
      handled = true;
      setHidden(true);
      if (onFadeOutComplete) onFadeOutComplete();
    };

    const handleTransitionEnd = (e) => {
      if (e.target === el) finish();
    };

    el.addEventListener('transitionend', handleTransitionEnd);

    // Fallback: if transitionend doesn't fire within 600ms, proceed anyway
    const fallbackTimer = setTimeout(finish, 600);

    return () => {
      el.removeEventListener('transitionend', handleTransitionEnd);
      clearTimeout(fallbackTimer);
    };
  }, [isLoading, onFadeOutComplete]);

  if (hidden) return null;

  const displayText = progress >= 100 
    ? '[OK] Loaded! 100%' 
    : `${asciiSpinnerFrames[spinnerIndex]} Loading... ${progress}%`;

  return (
    <div 
      ref={overlayRef}
      id="loading-overlay" 
      style={{ opacity: isLoading ? 1 : 0 }}
    >
      <div id="loader-circle">
        <pre id="ascii-loader-content">{displayText}</pre>
      </div>
    </div>
  );
}
