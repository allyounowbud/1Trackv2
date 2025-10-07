import React, { useState, useRef, useEffect } from 'react';

// Helper function to validate URLs
const isValidUrl = (url) => {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return false;
  }
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Safe image component with lazy loading
const SafeImage = ({ src, alt, className, style, onError, onLoad, fallback, lazy = true }) => {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(!lazy);
  const imgRef = useRef(null);
  
  useEffect(() => {
    if (!lazy || !imgRef.current) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { 
        threshold: 0.1,
        rootMargin: '50px' // Start loading 50px before the image comes into view
      }
    );
    
    observer.observe(imgRef.current);
    
    return () => observer.disconnect();
  }, [lazy]);
  
  if (!src || !isValidUrl(src) || hasError) {
    return fallback || (
      <div ref={imgRef} className={`${className} flex items-center justify-center bg-transparent`} style={style}>
        <div className="text-gray-400 text-center">
          <div className="text-2xl mb-2">🃏</div>
          <div className="text-sm">No Image</div>
        </div>
      </div>
    );
  }
  
  return (
    <div ref={imgRef} className={className} style={style}>
      {isInView ? (
        <img
          src={src}
          alt={alt || 'Card'}
          className="w-full h-full object-contain"
          onError={(e) => {
            setHasError(true);
            if (onError) onError(e);
          }}
          onLoad={(e) => {
            setIsLoaded(true);
            if (onLoad) onLoad(e);
          }}
          data-no-cornhusk="true"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-800 rounded">
          <div className="animate-pulse bg-gray-700 rounded w-full h-full"></div>
        </div>
      )}
    </div>
  );
};

export default SafeImage;

