/**
 * CachedImage Component
 * Implements Scrydex image best practices with local caching
 * 
 * Features:
 * - Automatic image caching and fallback handling
 * - Lazy loading for performance
 * - Multiple size support (thumbnail, card, large, hd)
 * - Loading states and error handling
 * - Intersection Observer for efficient loading
 */

import React, { useState, useEffect, useRef } from 'react';
import imageCacheService from '../services/imageCacheService';

const CachedImage = ({ 
  src, 
  alt, 
  type = 'card', 
  size = 'card', 
  className = '',
  style = {},
  loading = 'lazy',
  onLoad = null,
  onError = null,
  fallbackSrc = null,
  placeholder = null,
  ...props 
}) => {
  const [imageSrc, setImageSrc] = useState(placeholder || '/icons/icon-192x192.svg');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const imgRef = useRef(null);
  const observerRef = useRef(null);

  useEffect(() => {
    // Set up Intersection Observer for lazy loading
    if (loading === 'lazy' && imgRef.current) {
      observerRef.current = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observerRef.current?.disconnect();
          }
        },
        {
          threshold: 0.1,
          rootMargin: '50px'
        }
      );

      observerRef.current.observe(imgRef.current);
    } else {
      // Load immediately if not lazy loading
      setIsVisible(true);
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [loading]);

  useEffect(() => {
    if (!isVisible || !src) return;

    let isMounted = true;

    const loadImage = async () => {
      try {
        setIsLoading(true);
        setHasError(false);

        // Get cached image or download if not cached
        const cachedUrl = await imageCacheService.getCachedImage(src, type, size);
        
        if (isMounted) {
          setImageSrc(cachedUrl);
          setIsLoading(false);
          onLoad?.(cachedUrl);
        }
      } catch (error) {
        console.error(`❌ Failed to load cached image: ${src}`, error);
        
        if (isMounted) {
          setHasError(true);
          setIsLoading(false);
          
          // Use fallback image
          const fallback = fallbackSrc || imageCacheService.getFallbackImage(type);
          setImageSrc(fallback);
          onError?.(error);
        }
      }
    };

    loadImage();

    return () => {
      isMounted = false;
    };
  }, [isVisible, src, type, size, fallbackSrc, onLoad, onError]);

  const handleImageError = () => {
    if (!hasError) {
      setHasError(true);
      const fallback = fallbackSrc || imageCacheService.getFallbackImage(type);
      setImageSrc(fallback);
      onError?.(new Error('Image failed to load'));
    }
  };

  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);
    onLoad?.(imageSrc);
  };

  return (
    <div 
      ref={imgRef}
      className={`relative overflow-hidden ${className}`}
      style={style}
      {...props}
    >
      {/* Loading placeholder */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-200 animate-pulse">
          <div className="w-8 h-8 bg-gray-300 rounded-full animate-spin"></div>
        </div>
      )}
      
      {/* Main image */}
      <img
        src={imageSrc}
        alt={alt}
        className={`w-full h-full object-contain transition-opacity duration-200 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        }`}
        onLoad={handleImageLoad}
        onError={handleImageError}
        loading="eager" // We handle lazy loading ourselves
      />
      
      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-500 text-xs">
          <span>Image unavailable</span>
        </div>
      )}
    </div>
  );
};

export default CachedImage;

