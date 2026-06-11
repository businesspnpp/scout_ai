import { useState, useEffect } from 'react';

export default function useBreakpoint() {
  const [width, setWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );
  useEffect(() => {
    const h = () => setWidth(window.innerWidth);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return {
    width,
    isMobile: width < 640,
    isTablet: width < 1024,
  };
}
