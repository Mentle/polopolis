import { useState, useEffect, useRef, useCallback } from 'react';
import { asciiArt, subheaderText, aboutBodyText, portfolioProjects } from '../config/asciiArt';

const typingSpeedMs = 50;

// Helper function to apply character backgrounds to ASCII art
function applyCharBackgrounds(originalText) {
  if (!originalText) return '';

  const lines = originalText.split('\n');
  const numRows = lines.length;
  if (numRows === 0) return '';

  const hasBg = lines.map(line => Array(line.length).fill(false));
  const queue = [];

  // Pass 1: Mark non-spaces (and non-underscores) as having background
  for (let r = 0; r < numRows; r++) {
    for (let c = 0; c < lines[r].length; c++) {
      if (lines[r][c] !== ' ' && lines[r][c] !== '_') {
        hasBg[r][c] = true;
      }
    }
  }

  // Pass 1.5: Mark characters directly under an underscore as having background
  for (let r = 0; r < numRows - 1; r++) {
    for (let c = 0; c < lines[r].length; c++) {
      if (lines[r][c] === '_') {
        if (r + 1 < numRows && c < lines[r + 1].length) {
          hasBg[r + 1][c] = true;
        }
      }
    }
  }

  // Pass 2: Seed the queue with spaces that are initially fillable
  for (let r = 0; r < numRows; r++) {
    for (let c = 0; c < lines[r].length; c++) {
      if (lines[r][c] === ' ' && !hasBg[r][c]) {
        const isLeftBg = (c > 0 && hasBg[r][c - 1]);
        const isRightBg = (c < lines[r].length - 1 && hasBg[r][c + 1]);
        const isUpBg = (r > 0 && c < lines[r - 1].length && hasBg[r - 1][c]);
        const isDownBg = (r < numRows - 1 && c < lines[r + 1].length && hasBg[r + 1][c]);

        if ((isLeftBg && isRightBg) || (isUpBg && isDownBg)) {
          hasBg[r][c] = true;
          queue.push([r, c]);
        }
      }
    }
  }

  // Pass 3: BFS-like expansion
  let head = 0;
  while (head < queue.length) {
    const [r, c] = queue[head++];
    const neighbors = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]];

    for (const [nr, nc] of neighbors) {
      if (nr >= 0 && nr < numRows && nc >= 0 && nc < lines[nr].length) {
        if (lines[nr][nc] === ' ' && !hasBg[nr][nc]) {
          const n_isLeftBg = (nc > 0 && hasBg[nr][nc - 1]);
          const n_isRightBg = (nc < lines[nr].length - 1 && hasBg[nr][nc + 1]);
          const n_isUpBg = (nr > 0 && nc < lines[nr - 1].length && hasBg[nr - 1][nc]);
          const n_isDownBg = (nr < numRows - 1 && nc < lines[nr + 1].length && hasBg[nr + 1][nc]);

          if ((n_isLeftBg && n_isRightBg) || (n_isUpBg && n_isDownBg)) {
            hasBg[nr][nc] = true;
            queue.push([nr, nc]);
          }
        }
      }
    }
  }

  // Pass 4: Reconstruct the text with spans
  let processedText = '';
  for (let r = 0; r < numRows; r++) {
    for (let c = 0; c < lines[r].length; c++) {
      if (hasBg[r][c]) {
        processedText += `<span class="char-bg">${lines[r][c]}</span>`;
      } else {
        processedText += lines[r][c];
      }
    }
    if (r < numRows - 1) {
      processedText += '\n';
    }
  }
  return processedText;
}

// Process text for character highlighting in about body
function processOriginalHTMLForCharHighlight(htmlString) {
  let resultHTML = '';
  let inTag = false;
  for (let i = 0; i < htmlString.length; i++) {
    const char = htmlString[i];
    if (char === '<') {
      inTag = true;
      resultHTML += char;
    } else if (char === '>') {
      inTag = false;
      resultHTML += char;
    } else if (inTag) {
      resultHTML += char;
    } else {
      if (char === '\n' || char === '\r') {
        resultHTML += char;
      } else {
        resultHTML += `<span class="body-char-bg">${char}</span>`;
      }
    }
  }
  return resultHTML;
}

function CoderOverlay({ isActive, onTypingComplete }) {
  const [displayedText, setDisplayedText] = useState('');
  const [showSubheader, setShowSubheader] = useState(false);
  const intervalRef = useRef(null);
  const processedText = useRef(applyCharBackgrounds(asciiArt.coder));

  useEffect(() => {
    if (!isActive) {
      setDisplayedText('');
      setShowSubheader(false);
      return;
    }

    const lines = processedText.current.split('\n');
    let currentLineIndex = 0;

    intervalRef.current = setInterval(() => {
      if (currentLineIndex < lines.length) {
        setDisplayedText(lines.slice(0, currentLineIndex + 1).join('\n'));
        currentLineIndex++;
      } else {
        clearInterval(intervalRef.current);
        setShowSubheader(true);
        if (onTypingComplete) onTypingComplete();
      }
    }, typingSpeedMs);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive, onTypingComplete]);

  return (
    <div id="coder-overlay" className={`text-overlay-content ${isActive ? 'active' : ''}`}>
      <pre dangerouslySetInnerHTML={{ __html: displayedText }} />
      <div className="subheader-text" style={{ display: showSubheader ? 'block' : 'none' }}>
        <p>{subheaderText.coder}</p>
      </div>
    </div>
  );
}

function AboutOverlay({ isActive }) {
  const [displayedText, setDisplayedText] = useState('');
  const [showSubheader, setShowSubheader] = useState(false);
  const [showBody, setShowBody] = useState(false);
  const [bodyCharsVisible, setBodyCharsVisible] = useState(0);
  const intervalRef = useRef(null);
  const bodyIntervalRef = useRef(null);
  const processedText = useRef(applyCharBackgrounds(asciiArt.about));
  const processedBodyHTML = useRef(processOriginalHTMLForCharHighlight(
    aboutBodyText.map(p => `<p>${p}</p>`).join('')
  ));

  useEffect(() => {
    if (!isActive) {
      setDisplayedText('');
      setShowSubheader(false);
      setShowBody(false);
      setBodyCharsVisible(0);
      return;
    }

    const lines = processedText.current.split('\n');
    let currentLineIndex = 0;

    intervalRef.current = setInterval(() => {
      if (currentLineIndex < lines.length) {
        setDisplayedText(lines.slice(0, currentLineIndex + 1).join('\n'));
        currentLineIndex++;
      } else {
        clearInterval(intervalRef.current);
        setShowSubheader(true);
        setShowBody(true);
      }
    }, typingSpeedMs);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (bodyIntervalRef.current) clearInterval(bodyIntervalRef.current);
    };
  }, [isActive]);

  // Animate body text character by character
  useEffect(() => {
    if (!showBody) return;

    const totalChars = (processedBodyHTML.current.match(/class="body-char-bg"/g) || []).length;
    let charIndex = 0;

    bodyIntervalRef.current = setInterval(() => {
      if (charIndex < totalChars) {
        setBodyCharsVisible(charIndex + 1);
        charIndex++;
      } else {
        clearInterval(bodyIntervalRef.current);
      }
    }, 3);

    return () => {
      if (bodyIntervalRef.current) clearInterval(bodyIntervalRef.current);
    };
  }, [showBody]);

  // Create CSS to show only visible chars
  const bodyStyle = {
    display: showBody ? 'block' : 'none'
  };

  return (
    <div id="about-overlay" className={`text-overlay-content ${isActive ? 'active' : ''}`}>
      <pre dangerouslySetInnerHTML={{ __html: displayedText }} />
      <div className="subheader-text" style={{ display: showSubheader ? 'block' : 'none' }}>
        <p>{subheaderText.about}</p>
      </div>
      <div 
        className="about-body-text" 
        style={bodyStyle}
        dangerouslySetInnerHTML={{ __html: processedBodyHTML.current }}
      />
      <style>{`
        .about-body-text .body-char-bg:nth-child(-n+${bodyCharsVisible}) {
          opacity: 1;
        }
      `}</style>
    </div>
  );
}

function ContactOverlay({ isActive }) {
  const [displayedText, setDisplayedText] = useState('');
  const [showSubheader, setShowSubheader] = useState(false);
  const [showCalendly, setShowCalendly] = useState(false);
  const intervalRef = useRef(null);
  const processedText = useRef(applyCharBackgrounds(asciiArt.contact));

  useEffect(() => {
    if (!isActive) {
      setDisplayedText('');
      setShowSubheader(false);
      setShowCalendly(false);
      return;
    }

    const lines = processedText.current.split('\n');
    let currentLineIndex = 0;

    intervalRef.current = setInterval(() => {
      if (currentLineIndex < lines.length) {
        setDisplayedText(lines.slice(0, currentLineIndex + 1).join('\n'));
        currentLineIndex++;
      } else {
        clearInterval(intervalRef.current);
        setShowSubheader(true);
        setShowCalendly(true);
      }
    }, typingSpeedMs);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive]);

  const handleCalendlyClick = (e) => {
    e.preventDefault();
    if (window.Calendly) {
      window.Calendly.initPopupWidget({
        url: 'https://calendly.com/marcodietrich23/30min?background_color=00004d&text_color=ffffff'
      });
    }
  };

  return (
    <div id="contact-overlay" className={`text-overlay-content ${isActive ? 'active' : ''}`}>
      <pre dangerouslySetInnerHTML={{ __html: displayedText }} />
      <div className="subheader-text" style={{ display: showSubheader ? 'block' : 'none' }}>
        <p>{subheaderText.contact}</p>
      </div>
      <div className="calendly-widget-container" style={{ display: showCalendly ? 'block' : 'none' }}>
        <div className="contact-buttons">
          <a href="#" onClick={handleCalendlyClick}>Book a Meeting</a>
          <a href="mailto:marcodietrich23@gmail.com" className="email-button">Send me an email</a>
        </div>
      </div>
    </div>
  );
}

function PortfolioOverlay({ isActive, modelBounds }) {
  const [displayedText, setDisplayedText] = useState('');
  const [showSubheader, setShowSubheader] = useState(false);
  const [showList, setShowList] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [iframeScale, setIframeScale] = useState(0.25);
  const previewRef = useRef(null);
  const intervalRef = useRef(null);
  const processedText = useRef(applyCharBackgrounds(asciiArt.portfolio));

  useEffect(() => {
    if (!isActive) {
      setDisplayedText('');
      setShowSubheader(false);
      setShowList(false);
      setExpandedIndex(null);
      return;
    }

    const lines = processedText.current.split('\n');
    let currentLineIndex = 0;

    intervalRef.current = setInterval(() => {
      if (currentLineIndex < lines.length) {
        setDisplayedText(lines.slice(0, currentLineIndex + 1).join('\n'));
        currentLineIndex++;
      } else {
        clearInterval(intervalRef.current);
        setShowSubheader(true);
        setShowList(true);
      }
    }, typingSpeedMs);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive]);

  // Compute iframe scale when expanded — use callback ref to avoid stale refs
  const previewCallbackRef = useCallback((node) => {
    previewRef.current = node;
    if (!node) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      if (w > 0) setIframeScale(w / 1280);
    });
    ro.observe(node);
    // Store cleanup on the node itself
    node._ro = ro;
    return () => ro.disconnect();
  }, []);

  const handleEntryClick = (index) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <div id="portfolio-overlay" className={`text-overlay-content ${isActive ? 'active' : ''}`}>
      <div className="portfolio-header">
        <pre aria-label="Work in Motion" role="img" dangerouslySetInnerHTML={{ __html: displayedText }} />
        <div className="subheader-text" style={{ display: showSubheader ? 'block' : 'none' }}>
          <p>{subheaderText.portfolio}</p>
        </div>
      </div>

      <div className={`terminal-block ${showList ? 'terminal-block--visible' : ''}`}>
        <div className="terminal-list">
          {portfolioProjects.map((project, index) => (
            <div key={index} className="terminal-entry-wrap">
              <button
                className={`terminal-entry ${expandedIndex === index ? 'terminal-entry--active' : ''}`}
                onClick={() => handleEntryClick(index)}
                style={{ animationDelay: `${index * 0.15}s` }}
              >
                <span className="terminal-chevron">{'>'}</span>
                <span className="terminal-name">{project.title}</span>
              </button>
              {/* Mobile inline expand — hidden on desktop via CSS */}
              {expandedIndex === index && (
                <div className="terminal-detail terminal-detail--inline">
                  <p className="terminal-desc">{project.description}</p>
                  <div className="terminal-preview" ref={previewCallbackRef}>
                    <iframe
                      src={project.iframeSrc}
                      title={project.title}
                      loading="lazy"
                      sandbox="allow-scripts allow-same-origin"
                      scrolling="no"
                      style={{ transform: `scale(${iframeScale})` }}
                    />
                  </div>
                  <a href={project.link} target="_blank" rel="noopener noreferrer" className="terminal-link">
                    View Project &rarr;
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Desktop side panel — hidden on mobile via CSS */}
        {expandedIndex !== null && (
          <div className="terminal-detail terminal-detail--side">
            <p className="terminal-desc">{portfolioProjects[expandedIndex].description}</p>
            <div className="terminal-preview" ref={previewCallbackRef}>
              <iframe
                src={portfolioProjects[expandedIndex].iframeSrc}
                title={portfolioProjects[expandedIndex].title}
                loading="lazy"
                sandbox="allow-scripts allow-same-origin"
                style={{ transform: `scale(${iframeScale})` }}
              />
            </div>
            <a
              href={portfolioProjects[expandedIndex].link}
              target="_blank"
              rel="noopener noreferrer"
              className="terminal-link"
            >
              View Project &rarr;
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TextOverlays({ currentSection, onTypingComplete, modelBounds }) {
  return (
    <div id="text-overlays">
      <CoderOverlay
        isActive={currentSection === 'coder'}
        onTypingComplete={onTypingComplete}
      />
      <AboutOverlay isActive={currentSection === 'about'} />
      <ContactOverlay isActive={currentSection === 'contact'} />
      <PortfolioOverlay isActive={currentSection === 'portfolio'} modelBounds={modelBounds} />
    </div>
  );
}
