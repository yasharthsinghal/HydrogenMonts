import React, { useState, useEffect } from 'react';

const ANNOUNCEMENTS = [
  'Vastra by Monty is now MONTS — Same handcrafted quality, elevated experience.',
  'Free Shipping Across India | Extra 15% Off on Prepaid Orders',
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
      className="w-full py-2.5 px-4 text-center text-xs font-medium tracking-wide text-white overflow-hidden"
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

