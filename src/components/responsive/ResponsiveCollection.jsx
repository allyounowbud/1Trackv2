import { useState, useEffect } from 'react';
import Collection from '../../pages/Collection';
import DesktopCollection from '../desktop/DesktopCollection';

const ResponsiveCollection = () => {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      const isDesktopSize = window.innerWidth >= 768; // Lower breakpoint for testing
      console.log('📊 ResponsiveCollection screen check:', { width: window.innerWidth, isDesktop: isDesktopSize });
      setIsDesktop(isDesktopSize);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  console.log('📊 ResponsiveCollection render:', { isDesktop, width: window.innerWidth });

  if (isDesktop) {
    console.log('📊 Rendering DesktopCollection');
    return <DesktopCollection />;
  }

  // Mobile version (unchanged)
  console.log('📊 Rendering mobile Collection');
  return <Collection />;
};

export default ResponsiveCollection;
