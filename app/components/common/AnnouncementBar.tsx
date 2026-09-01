import React, { useState, useEffect } from 'react';

const ANNOUNCEMENTS = [
  '⚡ Extra 15% Instant Discount on all Prepaid Orders (UPI & Cards)',
  '🇮🇳 Free Domestic Shipping Across India on All Orders (Prepaid & COD)',
  '✈️ Worldwide Express Shipping to USA, UK, Singapore, Japan & Dubai (at actuals)',
  'Vastra by Monty is now MONTS — Same artisanal quality, elevated experience.',
];

export const AnnouncementBar: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % ANNOUNCEMENTS.length);
        setFade(true);
      }, 300);
    }, 4000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className="w-full py-2 px-4 text-center text-[11px] sm:text-xs font-medium tracking-wide text-white overflow-hidden leading-snug"
      style={{
        backgroundColor: '#1a1a1a',
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <span
        className={`inline-block transition-opacity duration-300 ${
          fade ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {ANNOUNCEMENTS[currentIndex]}
      </span>
    </div>
  );
};

