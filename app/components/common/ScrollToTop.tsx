import React, { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

/**
 * Floating back-to-top button with subtle entrance/exit transition.
 * Appears after scrolling past 400px.
 */
export const ScrollToTop: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleScroll = () => {
      setIsVisible(window.scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    if (typeof window === 'undefined') return;
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Scroll to top of page"
      className={`fixed bottom-6 right-6 z-40 p-3 rounded-full bg-[#faf8f5]/90 hover:bg-[#faf8f5] text-[#060505] hover:text-[#c4622d] border border-[#e8e4df] shadow-lg backdrop-blur-xs transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-[#c4622d]/40 active:scale-95 cursor-pointer ${
        isVisible
          ? 'opacity-100 translate-y-0 pointer-events-auto'
          : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
    >
      <ArrowUp className="w-5 h-5" />
    </button>
  );
};
