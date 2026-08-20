import React, { useState, useEffect } from 'react';
import { Link } from '@remix-run/react';
import { AnnouncementBar } from './AnnouncementBar';
import { Navigation } from './Navigation';
import { Search, ShoppingBag, User, Menu } from 'lucide-react';

export interface HeaderProps {
  cartCount?: number;
  onOpenMobileNav?: () => void;
  onOpenCart?: () => void;
  onOpenSearch?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  cartCount = 0,
  onOpenMobileNav,
  onOpenCart,
  onOpenSearch,
}) => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <AnnouncementBar />

      {/* Main Nav Bar */}
      <div
        className={`w-full transition-all duration-300 ${
          isScrolled ? 'shadow-md py-2.5' : 'py-4'
        }`}
        style={{
          backgroundColor: '#faf8f5',
          borderBottom: '1px solid #e8e4df',
        }}
      >
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 flex items-center justify-between gap-4">
          {/* Left: Mobile hamburger */}
          <button
            onClick={onOpenMobileNav}
            className="md:hidden p-2 transition-colors text-[#1a1a1a] hover:text-[#c4622d] cursor-pointer"
            aria-label="Open mobile menu"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Logo */}
          <Link
            to="/"
            className="text-2xl md:text-3xl font-bold tracking-widest uppercase text-[#060505] hover:opacity-90 transition-opacity"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            MONTS
          </Link>

          {/* Center: Desktop Navigation */}
          <div className="hidden md:flex flex-1 justify-center">
            <Navigation />
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Search */}
            <Link
              to="/search"
              onClick={(e) => {
                if (onOpenSearch) {
                  e.preventDefault();
                  onOpenSearch();
                }
              }}
              className="p-2 text-[#1a1a1a] hover:text-[#c4622d] hover:bg-[#f0edea] rounded-full transition-colors cursor-pointer"
              aria-label="Search catalog"
            >
              <Search className="w-5 h-5" />
            </Link>

            {/* Account */}
            <Link
              to="/account"
              className="p-2 text-[#1a1a1a] hover:text-[#c4622d] hover:bg-[#f0edea] rounded-full transition-colors"
              aria-label="Customer Account"
            >
              <User className="w-5 h-5" />
            </Link>

            {/* Cart Trigger */}
            <Link
              to="/cart"
              onClick={(e) => {
                if (onOpenCart) {
                  e.preventDefault();
                  onOpenCart();
                }
              }}
              className="relative flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-[6px] bg-[#c4622d] text-white hover:bg-[#923f12] transition-colors cursor-pointer"
              aria-label="Shopping Cart"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="hidden sm:inline">Cart</span>
              {cartCount > 0 && (
                <span className="flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded-full bg-white text-[#c4622d]">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};
