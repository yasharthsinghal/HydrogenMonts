import React, { useEffect, useState, useRef } from 'react';
import { useNavigation } from 'react-router';

/**
 * High-performance, smooth top progress bar for true route changes.
 * Ignored during background fetcher calls to keep micro-actions seamless.
 */
export const PageProgressLoader: React.FC = () => {
  const navigation = useNavigation();
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // True page navigation occurs when navigation.location is defined
  const isNavigating = navigation.state !== 'idle' && Boolean(navigation.location);

  useEffect(() => {
    if (isNavigating) {
      setIsVisible(true);
      setProgress((prev) => (prev > 0 ? prev : 15));

      // Gentle non-linear trickle
      timerRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 88) return prev;
          const remaining = 90 - prev;
          return prev + Math.max(1, Math.floor(remaining * 0.15));
        });
      }, 250);
    } else if (isVisible) {
      // Complete the progress
      if (timerRef.current) clearInterval(timerRef.current);
      setProgress(100);

      const hideTimer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => setProgress(0), 200);
      }, 250);

      return () => clearTimeout(hideTimer);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isNavigating, isVisible]);

  if (!isVisible && progress === 0) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-[100] h-[3px] pointer-events-none transition-opacity duration-200"
      style={{
        opacity: isVisible ? 1 : 0,
      }}
    >
      <div
        className="h-full bg-gradient-to-r from-[#8b7355] via-[#c4622d] to-[#e2844e] transition-all duration-300 ease-out relative overflow-hidden shadow-[0_0_8px_rgba(196,98,45,0.6)]"
        style={{
          width: `${progress}%`,
        }}
      >
        {/* Shimmer sweep effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-progress-shimmer w-full h-full" />
      </div>
    </div>
  );
};
