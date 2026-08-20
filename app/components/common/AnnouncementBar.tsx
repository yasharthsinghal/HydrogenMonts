import React from 'react';

export const AnnouncementBar: React.FC = () => {
  return (
    <div
      className="w-full py-2.5 px-4 text-center text-xs font-medium tracking-wide text-white"
      style={{
        backgroundColor: '#1a1a1a',
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <span>
        Free shipping on orders above Rs. 999 &nbsp;·&nbsp; Easy returns within 30 days &nbsp;·&nbsp; Handcrafted in India
      </span>
    </div>
  );
};
