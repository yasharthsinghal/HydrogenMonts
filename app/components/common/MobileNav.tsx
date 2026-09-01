import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { X, ChevronRight, User, ShoppingBag } from 'lucide-react';
import { NAV_ITEMS, DEFAULT_COLLECTIONS, type NavSubItem } from './Navigation';
import { useRouteLoaderData } from 'react-router';
import type { CollectionCardItem } from '~/types/storefront.types';

export interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ isOpen, onClose }) => {
  const rootData = useRouteLoaderData<{ collections?: CollectionCardItem[] }>('root');
  const [collectionsExpanded, setCollectionsExpanded] = React.useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  const collectionsList: NavSubItem[] = React.useMemo(() => {
    if (rootData?.collections && rootData.collections.length > 0) {
      return rootData.collections.map((col) => ({
        label: col.title,
        href: `/collections/${col.handle}`,
        description: col.description?.replace(/<[^>]*>?/gm, '').trim() || undefined,
      }));
    }
    return DEFAULT_COLLECTIONS;
  }, [rootData?.collections]);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      const el = drawerRef.current;
      const cleanup = () => {
        document.body.style.overflow = '';
      };
      if (el) {
        el.addEventListener('transitionend', cleanup, { once: true });
      } else {
        document.body.style.overflow = '';
      }
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <div
      aria-hidden={!isOpen}
      className={`fixed inset-0 z-50 flex md:hidden transition-opacity duration-300 ease-out ${
        isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
      }`}
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-[#060505]/60 backdrop-blur-xs transition-opacity duration-300 ease-out ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={`relative w-full max-w-xs bg-[#faf8f5] h-full shadow-2xl z-10 flex flex-col justify-between border-r border-[#e8e4df] transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="overflow-y-auto">
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
              className="p-1.5 rounded-full text-[#686764] hover:text-[#060505] hover:bg-[#f0edea] active:scale-95 transition-all cursor-pointer"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Nav Links */}
          <nav className="p-5 flex flex-col divide-y divide-[#e8e4df]">
            {NAV_ITEMS.map((item) => {
              if (item.label === 'Collections') {
                return (
                  <div key={item.label} className="py-2 flex flex-col">
                    <div className="flex items-center justify-between py-2 text-sm font-semibold uppercase tracking-wider text-[#1a1a1a]">
                      <Link to={item.href} onClick={onClose} className="hover:text-[#c4622d] transition-colors">
                        {item.label}
                      </Link>
                      <button
                        type="button"
                        onClick={() => setCollectionsExpanded((prev) => !prev)}
                        className="p-1 text-[#8b7355] hover:text-[#c4622d] cursor-pointer text-xs flex items-center gap-1"
                        aria-label="Toggle collections"
                      >
                        <ChevronRight
                          className={`w-4 h-4 transition-transform duration-250 ease-out ${
                            collectionsExpanded ? 'rotate-90 text-[#c4622d]' : ''
                          }`}
                        />
                      </button>
                    </div>

                    {/* Smooth Accordion with CSS grid */}
                    <div
                      className={`grid transition-[grid-template-rows] duration-250 ease-out ${
                        collectionsExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className="pl-3 pb-2 flex flex-col gap-1.5 border-l-2 border-[#e8e4df] ml-1 mt-1">
                          <Link
                            to="/collections"
                            onClick={onClose}
                            className="py-1 text-xs font-semibold text-[#c4622d] hover:underline"
                          >
                            View All Collections →
                          </Link>
                          {collectionsList.map((col) => (
                            <Link
                              key={col.href}
                              to={col.href}
                              onClick={onClose}
                              className="py-1 text-xs text-[#686764] hover:text-[#c4622d] transition-colors"
                            >
                              {col.label}
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

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
                  className="py-3.5 flex items-center justify-between text-sm font-semibold uppercase tracking-wider text-[#1a1a1a] hover:text-[#c4622d] transition-colors group"
                >
                  <span>{item.label}</span>
                  <ChevronRight className="w-4 h-4 text-[#afaba6] group-hover:translate-x-1 transition-transform" />
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
            className="flex items-center gap-2.5 text-sm font-medium text-[#1a1a1a] hover:text-[#c4622d] py-1.5 transition-colors"
          >
            <User className="w-4 h-4 text-[#8b7355]" />
            <span>My Account / Login</span>
          </Link>
          <Link
            to="/cart"
            onClick={onClose}
            className="flex items-center gap-2.5 text-sm font-medium text-[#1a1a1a] hover:text-[#c4622d] py-1.5 transition-colors"
          >
            <ShoppingBag className="w-4 h-4 text-[#8b7355]" />
            <span>View Shopping Cart</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
