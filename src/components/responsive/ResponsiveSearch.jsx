import { useState, useEffect } from 'react';
import Search from '../../pages/Search';
import DesktopSearch from '../desktop/DesktopSearch';

const ResponsiveSearch = () => {
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
    return <DesktopSearch />;
  }

  // Mobile version (unchanged)
  return <Search />;
};

export default ResponsiveSearch;
