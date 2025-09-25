import { useState, useEffect } from 'react';
import Collection from '../../pages/Collection';
import DesktopCollection from '../desktop/DesktopCollection';

const ResponsiveCollection = () => {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  if (isDesktop) {
    return <DesktopCollection />;
  }

  // Mobile version (unchanged)
  return <Collection />;
};

export default ResponsiveCollection;
