import { useState, useEffect } from 'react';

const ScreenSizeDebug = () => {
  const [screenSize, setScreenSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateScreenSize = () => {
      setScreenSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    updateScreenSize();
    window.addEventListener('resize', updateScreenSize);
    return () => window.removeEventListener('resize', updateScreenSize);
  }, []);

  const isDesktop = screenSize.width >= 768;

  return (
    <div className="fixed top-4 right-4 bg-black bg-opacity-75 text-white p-4 rounded-lg z-50 text-sm">
      <div>Width: {screenSize.width}px</div>
      <div>Height: {screenSize.height}px</div>
      <div>Is Desktop: {isDesktop ? 'YES' : 'NO'}</div>
      <div>Breakpoint: 768px</div>
    </div>
  );
};

export default ScreenSizeDebug;
