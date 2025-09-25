import { useState, useEffect } from 'react';

const SimpleResponsiveTest = () => {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      const isDesktopSize = window.innerWidth >= 768;
      console.log('🧪 SimpleResponsiveTest screen check:', { width: window.innerWidth, isDesktop: isDesktopSize });
      setIsDesktop(isDesktopSize);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  console.log('🧪 SimpleResponsiveTest render:', { isDesktop, width: window.innerWidth });

  if (isDesktop) {
    return (
      <div style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '20px',
        textAlign: 'center',
        fontSize: '24px',
        fontWeight: 'bold'
      }}>
        🖥️ DESKTOP LAYOUT IS WORKING! 🖥️
        <br />
        Width: {window.innerWidth}px
      </div>
    );
  }

  return (
    <div style={{ 
      background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      color: 'white',
      padding: '20px',
      textAlign: 'center',
      fontSize: '24px',
      fontWeight: 'bold'
    }}>
      📱 MOBILE LAYOUT
      <br />
      Width: {window.innerWidth}px
    </div>
  );
};

export default SimpleResponsiveTest;
