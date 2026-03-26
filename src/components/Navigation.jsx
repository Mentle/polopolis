export default function Navigation({ onNavigate, isVisible, currentSection }) {
  const handleClick = (e, section) => {
    e.preventDefault();
    onNavigate(section);
  };

  const sections = [
    { id: 'nav-home', section: 'coder', label: 'HOME' },
    { id: 'nav-about', section: 'about', label: 'ABOUT' },
    { id: 'nav-portfolio', section: 'portfolio', label: 'PORTFOLIO' },
    { id: 'nav-contact', section: 'contact', label: 'CONTACT' },
  ];

  return (
    <div
      id="navigation-links"
      style={{
        opacity: isVisible ? 1 : 0,
        visibility: isVisible ? 'visible' : 'hidden'
      }}
    >
      {sections.map(({ id, section, label }) => (
        <a
          key={id}
          href="#"
          id={id}
          className={currentSection === section ? 'nav-active' : ''}
          onClick={(e) => handleClick(e, section)}
        >
          {label}
        </a>
      ))}
    </div>
  );
}
