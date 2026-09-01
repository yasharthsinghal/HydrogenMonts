import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation, useFetcher } from 'react-router';
import { AnnouncementBar } from './AnnouncementBar';
import { Navigation } from './Navigation';
import { Search, X, ShoppingBag, User, Menu, ArrowRight, Loader2 } from 'lucide-react';
import type { ProductCardItem } from '~/types/storefront.types';

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
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const fetcher = useFetcher<{ products: ProductCardItem[]; totalCount: number }>();

  // Scroll listener
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-focus search input when opened
  useEffect(() => {
    if (searchOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setSearchQuery('');
    }
  }, [searchOpen]);

  // Handle Escape key to close search bar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && searchOpen) {
        setSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchOpen]);

  // Close search bar on location change
  useEffect(() => {
    setSearchOpen(false);
  }, [location.pathname, location.search]);

  // Live search fetcher logic
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length > 0 && searchOpen) {
      fetcher.load(`/api/search?q=${encodeURIComponent(trimmed)}`);
    }
  }, [searchQuery, searchOpen]);

  const handleToggleSearch = () => {
    if (onOpenSearch) {
      onOpenSearch();
    }
    setSearchOpen((prev) => !prev);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    setSearchOpen(false);
    navigate(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  const formatPrice = (amount: string, currency: string) => {
    const numeric = parseFloat(amount);
    if (isNaN(numeric)) return `${currency} ${amount}`;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'INR',
      maximumFractionDigits: 0,
    }).format(numeric);
  };

  const suggestions = searchOpen && searchQuery.trim() ? fetcher.data?.products || [] : [];
  const isLoadingSuggestions = fetcher.state === 'loading';

  return (
    <header className="sticky top-0 z-40 w-full" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <AnnouncementBar />

      {/* Main Nav Bar */}
      <div
        className={`w-full transition-all duration-300 ease-out border-b border-[#e8e4df] ${
          isScrolled
            ? 'shadow-sm py-2.5 bg-[#faf8f5]/92 backdrop-blur-md'
            : 'py-4 bg-[#faf8f5]'
        }`}
      >
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 flex items-center justify-between gap-4">
          {/* Left: Mobile hamburger */}
          <button
            onClick={onOpenMobileNav}
            className="md:hidden p-2 rounded-full transition-all text-[#1a1a1a] hover:text-[#c4622d] hover:bg-[#f0edea] active:scale-90 cursor-pointer"
            aria-label="Open mobile menu"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Logo */}
          <Link
            to="/"
            className="text-2xl md:text-3xl font-bold tracking-widest uppercase text-[#060505] hover:opacity-85 transition-opacity"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            MONTS
          </Link>

          {/* Center: Desktop Navigation */}
          <div className="hidden md:flex flex-1 justify-center">
            <Navigation />
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Search Toggle Button */}
            <button
              type="button"
              onClick={handleToggleSearch}
              className="p-2 text-[#1a1a1a] hover:text-[#c4622d] hover:bg-[#f0edea] active:scale-90 rounded-full transition-all cursor-pointer"
              aria-label={searchOpen ? 'Close search' : 'Open search'}
            >
              {searchOpen ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
            </button>

            {/* Account */}
            <Link
              to="/account"
              className="p-2 text-[#1a1a1a] hover:text-[#c4622d] hover:bg-[#f0edea] active:scale-90 rounded-full transition-all"
              aria-label="Customer Account"
            >
              <User className="w-5 h-5" />
            </Link>

            {/* Cart Trigger */}
            {onOpenCart ? (
              <button
                type="button"
                onClick={onOpenCart}
                className="relative flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-[6px] bg-[#c4622d] text-white hover:bg-[#923f12] active:scale-95 transition-all cursor-pointer shadow-xs"
                aria-label="Shopping Cart Drawer"
              >
                <ShoppingBag className="w-4 h-4" />
                <span className="hidden sm:inline">Cart</span>
                {cartCount > 0 && (
                  <span
                    key={cartCount}
                    className="flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded-full bg-white text-[#c4622d] animate-badge-pop"
                  >
                    {cartCount}
                  </span>
                )}
              </button>
            ) : (
              <Link
                to="/cart"
                className="relative flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-[6px] bg-[#c4622d] text-white hover:bg-[#923f12] active:scale-95 transition-all cursor-pointer shadow-xs"
                aria-label="Shopping Cart"
              >
                <ShoppingBag className="w-4 h-4" />
                <span className="hidden sm:inline">Cart</span>
                {cartCount > 0 && (
                  <span
                    key={cartCount}
                    className="flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded-full bg-white text-[#c4622d] animate-badge-pop"
                  >
                    {cartCount}
                  </span>
                )}
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Inline Search Bar Panel */}
      {searchOpen && (
        <div
          className="w-full bg-[#faf8f5] border-b border-[#e8e4df] shadow-md transition-all"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-4">
            <form onSubmit={handleSearchSubmit} className="relative flex items-center max-w-3xl mx-auto">
              <Search className="w-5 h-5 absolute left-4 text-[#686764] pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="w-full pl-12 pr-28 py-3.5 text-sm rounded-[6px] border border-[#e8e4df] bg-white text-[#2c2c2c] focus:outline-none focus:border-[#c4622d] focus:ring-1 focus:ring-[#c4622d]"
              />
              <button
                type="submit"
                className="absolute right-2 px-5 py-2 text-xs font-semibold rounded-[4px] bg-[#c4622d] text-white hover:bg-[#923f12] transition-colors cursor-pointer"
              >
                Search
              </button>
            </form>

            {/* Suggestions Panel */}
            {searchQuery.trim() !== '' && (
              <div className="max-w-3xl mx-auto mt-2 bg-white border border-[#e8e4df] rounded-[6px] shadow-lg overflow-hidden">
                {isLoadingSuggestions ? (
                  <div className="p-4 text-center text-xs text-[#686764] flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[#c4622d]" />
                    Searching products...
                  </div>
                ) : suggestions.length > 0 ? (
                  <div className="divide-y divide-[#e8e4df]">
                    {suggestions.map((product) => {
                      const price = product.priceRange?.minVariantPrice;
                      const image = product.featuredImage;
                      return (
                        <Link
                          key={product.id}
                          to={`/products/${product.handle}`}
                          onClick={() => setSearchOpen(false)}
                          className="flex items-center gap-4 p-3 hover:bg-[#faf8f5] transition-colors group"
                        >
                          {image?.url ? (
                            <img
                              src={image.url}
                              alt={image.altText || product.title}
                              className="w-12 h-12 object-cover rounded-[4px] bg-[#f5f0e8]"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-[#f0edea] rounded-[4px]" />
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-[#1a1a1a] group-hover:text-[#c4622d] transition-colors truncate">
                              {product.title}
                            </h4>
                            {price && (
                              <p className="text-xs text-[#686764]">
                                {formatPrice(price.amount, price.currencyCode)}
                              </p>
                            )}
                          </div>
                          <ArrowRight className="w-4 h-4 text-[#afaba6] group-hover:text-[#c4622d] transition-colors" />
                        </Link>
                      );
                    })}
                    <button
                      type="button"
                      onClick={handleSearchSubmit}
                      className="w-full p-3 text-left text-xs font-semibold text-[#c4622d] hover:bg-[#faf8f5] flex items-center justify-between transition-colors cursor-pointer border-t border-[#e8e4df]"
                    >
                      <span>View all results for "{searchQuery.trim()}" →</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-4 text-center text-xs text-[#686764]">
                    No results found for "{searchQuery.trim()}"
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
