import React, { useEffect } from 'react';
import { Link } from 'react-router';
import { X, ChevronRight, User, ShoppingBag } from 'lucide-react';
import { NAV_ITEMS } from './Navigation';

export interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex md:hidden" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#060505]/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-full max-w-xs bg-[#faf8f5] h-full shadow-2xl z-10 flex flex-col justify-between border-r border-[#e8e4df]">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-[#e8e4df]">
            <span
              className="text-xl font-bold tracking-widest text-[#060505]"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              MONTS
            </span>
            <button
              onClick={onClose}
              className="p-1 text-[#686764] hover:text-[#060505] cursor-pointer"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Nav Links */}
          <nav className="p-5 flex flex-col divide-y divide-[#e8e4df]">
            {NAV_ITEMS.map((item) => {
              const hasChildren = Boolean(item.children && item.children.length > 0);

              if (hasChildren) {
                return (
                  <div key={item.label} className="py-2 flex flex-col">
                    <div className="flex items-center justify-between py-2 text-sm font-semibold uppercase tracking-wider text-[#1a1a1a]">
                      <Link to={item.href} onClick={onClose} className="hover:text-[#c4622d] transition-colors">
                        {item.label}
                      </Link>
                    </div>
                    <div className="pl-3 pb-1 flex flex-col gap-2 border-l-2 border-[#e8e4df] ml-1 mt-1">
                      {item.children?.map((subItem) => (
                        <Link
                          key={subItem.label}
                          to={subItem.href}
                          onClick={onClose}
                          className="py-1 text-xs text-[#686764] hover:text-[#c4622d] transition-colors"
                        >
                          {subItem.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              }

              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={onClose}
                  className="py-3.5 flex items-center justify-between text-sm font-semibold uppercase tracking-wider text-[#1a1a1a] hover:text-[#c4622d] transition-colors"
                >
                  <span>{item.label}</span>
                  <ChevronRight className="w-4 h-4 text-[#afaba6]" />
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer actions */}
        <div className="p-5 border-t border-[#e8e4df] flex flex-col gap-3 bg-[#f5f0e8]">
          <Link
            to="/account"
            onClick={onClose}
            className="flex items-center gap-2.5 text-sm font-medium text-[#1a1a1a] hover:text-[#c4622d] py-1.5"
          >
            <User className="w-4 h-4 text-[#8b7355]" />
            <span>My Account / Login</span>
          </Link>
          <Link
            to="/cart"
            onClick={onClose}
            className="flex items-center gap-2.5 text-sm font-medium text-[#1a1a1a] hover:text-[#c4622d] py-1.5"
          >
            <ShoppingBag className="w-4 h-4 text-[#8b7355]" />
            <span>View Shopping Cart</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
