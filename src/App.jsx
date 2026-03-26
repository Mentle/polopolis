import { useState, useCallback, useEffect, useRef } from 'react';
import ThreeScene from './components/ThreeScene';
import LoadingOverlay from './components/LoadingOverlay';
import Navigation from './components/Navigation';
import TextOverlays from './components/TextOverlays';
import LiquidAscii from './components/react-bits/liquid-ascii';
import './App.css';

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [startZoom, setStartZoom] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const [currentSection, setCurrentSection] = useState('coder');
  const [navVisible, setNavVisible] = useState(false);
  const [modelBounds, setModelBounds] = useState(null);
  const modelBoundsRef = useRef(null);

  const handleModelBoundsUpdate = useCallback((bounds) => {
    // Only update state if bounds changed meaningfully (avoid re-render spam)
    const prev = modelBoundsRef.current;
    if (!prev ||
      Math.abs(prev.left - bounds.left) > 5 ||
      Math.abs(prev.top - bounds.top) > 5 ||
      Math.abs(prev.right - bounds.right) > 5 ||
      Math.abs(prev.bottom - bounds.bottom) > 5) {
      modelBoundsRef.current = bounds;
      setModelBounds(bounds);
    }
  }, []);

  const handleLoadProgress = useCallback((progress) => {
    setLoadProgress(progress);
  }, []);

  // Models finished loading — trigger overlay fade-out
  const handleModelsLoaded = useCallback(() => {
    setIsLoading(false);
  }, []);

  // Overlay fade-out completed — start zoom animation
  const handleOverlayFadeComplete = useCallback(() => {
    setStartZoom(true);
  }, []);

  // Zoom animation completed — scene is ready, show text overlays
  const handleSceneReady = useCallback(() => {
    setSceneReady(true);
  }, []);

  const handleSectionChange = useCallback((section) => {
    setCurrentSection(section);
  }, []);

  const handleNavigate = useCallback((section) => {
    setCurrentSection(section);
  }, []);

  const handleTypingComplete = useCallback(() => {
    setNavVisible(true);
  }, []);

  // Forward mouse moves to LiquidAscii (it has pointer-events:none)
  const liquidRef = useRef(null);
  const liquidAsciiRef = useRef(null);

  // Splash the liquid on page switch
  useEffect(() => {
    if (liquidAsciiRef.current) {
      liquidAsciiRef.current.splash();
    }
  }, [currentSection]);
  useEffect(() => {
    const onMove = (e) => {
      const target = liquidRef.current?.querySelector('.relative');
      if (target) {
        target.dispatchEvent(new MouseEvent('mousemove', {
          clientX: e.clientX,
          clientY: e.clientY,
          bubbles: true
        }));
      }
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  // Load Calendly script
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://assets.calendly.com/assets/external/widget.css';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://assets.calendly.com/assets/external/widget.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.head.removeChild(link);
      document.body.removeChild(script);
    };
  }, []);

  return (
    <>
      <div className="liquid-ascii-bg" ref={liquidRef}>
        <LiquidAscii
          ref={liquidAsciiRef}
          width="100%"
          height="100%"
          color="#334d88"
          backgroundColor="#00004d"
          cellSize={15}
          speed={0.46}
          fillHeight={0.4}
          gravity={-25}
          flipRatio={0.75}
          overRelaxation={1.5}
          cursorRadius={0.25}
          cursorForce={66}
          pressureIters={30}
          separationIters={3}
          opacity={0.3}
          characters=" .:-~=+*#%@"
          autoWave={true}
        />
      </div>
      <LoadingOverlay
        progress={loadProgress}
        isLoading={isLoading}
        onFadeOutComplete={handleOverlayFadeComplete}
      />
      <ThreeScene
        currentSection={currentSection}
        onLoadProgress={handleLoadProgress}
        onModelsLoaded={handleModelsLoaded}
        onSceneReady={handleSceneReady}
        onSectionChange={handleSectionChange}
        onModelBoundsUpdate={handleModelBoundsUpdate}
        startZoom={startZoom}
      />
      {sceneReady && (
        <TextOverlays
          currentSection={currentSection}
          onTypingComplete={handleTypingComplete}
          modelBounds={modelBounds}
        />
      )}
      <Navigation onNavigate={handleNavigate} isVisible={navVisible} currentSection={currentSection} />
    </>
  );
}

export default App;
