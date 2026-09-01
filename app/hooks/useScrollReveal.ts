import { useEffect } from 'react';

/**
 * Hook to automatically reveal elements with class `.reveal` when they enter the viewport.
 * SSR-safe and uses passive observation with unobserve on reveal.
 */
export function useScrollReveal(selector = '.reveal', threshold = 0.12) {
  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      // Fallback: make everything visible immediately if IntersectionObserver is unsupported
      document.querySelectorAll(selector).forEach((el) => {
        el.classList.add('is-visible');
      });
      return;
    }

    const elements = document.querySelectorAll(selector);
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            obs.unobserve(entry.target);
          }
        });
      },
      {
        threshold,
        rootMargin: '0px 0px -40px 0px',
      },
    );

    elements.forEach((el) => {
      // Only observe if not already revealed
      if (!el.classList.contains('is-visible')) {
        observer.observe(el);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [selector, threshold]);
}
