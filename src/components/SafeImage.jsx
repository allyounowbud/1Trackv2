import React, { useState } from 'react';

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

// Safe image component
const SafeImage = ({ src, alt, className, style, onError, onLoad, fallback }) => {
  const [hasError, setHasError] = useState(false);
  
  if (!src || !isValidUrl(src) || hasError) {
    return fallback || (
      <div className={`${className} flex items-center justify-center bg-transparent`} style={style}>
        <div className="text-gray-400 text-center">
          <div className="text-2xl mb-2">🃏</div>
          <div className="text-sm">No Image</div>
        </div>
      </div>
    );
  }
  
  return (
    <img
      src={src}
      alt={alt || 'Card'}
      className={className}
      style={style}
      onError={(e) => {
        setHasError(true);
        if (onError) onError(e);
      }}
      onLoad={onLoad}
      data-no-cornhusk="true"
    />
  );
};

export default SafeImage;

