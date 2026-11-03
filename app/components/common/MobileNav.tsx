import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { X, ChevronRight, User, ShoppingBag, Sparkles, LogIn, UserPlus } from 'lucide-react';
import { NAV_ITEMS, DEFAULT_COLLECTIONS, type NavSubItem } from './Navigation';
import { useRouteLoaderData } from 'react-router';
import type { CollectionCardItem } from '~/types/storefront.types';

export interface MobileNavProps {
  isOpen: boolean;
  isLoggedIn?: boolean;
  onClose: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ isOpen, isLoggedIn: propIsLoggedIn, onClose }) => {
  const rootData = useRouteLoaderData<{ isLoggedIn?: boolean; collections?: CollectionCardItem[] }>('root');
  const loggedIn = propIsLoggedIn ?? Boolean(rootData?.isLoggedIn);
  const [collectionsExpanded, setCollectionsExpanded] = React.useState(false);
  const [shopExpanded, setShopExpanded] = React.useState(true);
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
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#e8e4df]">
            <Link to="/" onClick={onClose} className="flex flex-col items-center justify-center text-center leading-none group">
              <img
                src="/monts_logo.png"
                alt="MONTS"
                className="h-7.5 w-auto object-contain mx-auto"
              />
              <span className="text-[6.5px] tracking-[0.08em] uppercase font-semibold text-[#8b7355] mt-0.5 whitespace-nowrap text-center block">
                Vastra by Monty
              </span>
            </Link>
            <button
              onClick={onClose}
              className="p-1 rounded-full text-[#686764] hover:text-[#060505] hover:bg-[#f0edea] active:scale-95 transition-all cursor-pointer self-start"
              aria-label="Close menu"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>

          {/* Nav Links */}
          <nav className="px-3.5 py-1.5 flex flex-col divide-y divide-[#e8e4df]/60">
            {NAV_ITEMS.map((item) => {
              if (item.label === 'Shop') {
                return (
                  <div key={item.label} className="py-1 flex flex-col">
                    <div className="flex items-center justify-between py-1.5 px-1 text-xs font-semibold uppercase tracking-wider text-[#1a1a1a]">
                      <Link to={item.href} onClick={onClose} className="hover:text-[#c4622d] transition-colors">
                        {item.label}
                      </Link>
                      <button
                        type="button"
                        onClick={() => setShopExpanded((prev) => !prev)}
                        className="p-1 text-[#8b7355] hover:text-[#c4622d] cursor-pointer text-xs flex items-center gap-1"
                        aria-label="Toggle shop categories"
                      >
                        <ChevronRight
                          className={`w-3.5 h-3.5 transition-transform duration-250 ease-out ${
                            shopExpanded ? 'rotate-90 text-[#c4622d]' : ''
                          }`}
                        />
                      </button>
                    </div>

                    <div
                      className={`grid transition-[grid-template-rows] duration-250 ease-out ${
                        shopExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className="pl-2.5 pb-1 flex flex-col gap-0.5 border-l-2 border-[#c4622d]/40 ml-1.5 mt-0.5">
                          {item.children?.map((subItem) => (
                            <Link
                              key={subItem.label}
                              to={subItem.href}
                              onClick={onClose}
                              className="py-1 px-1 text-[11.5px] font-medium text-[#4a4947] hover:text-[#c4622d] transition-colors flex items-center justify-between"
                            >
                              <span>{subItem.label}</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              if (item.label === 'Collections') {
                return (
                  <div key={item.label} className="py-1 flex flex-col">
                    <div className="flex items-center justify-between py-1.5 px-1 text-xs font-semibold uppercase tracking-wider text-[#1a1a1a]">
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
                          className={`w-3.5 h-3.5 transition-transform duration-250 ease-out ${
                            collectionsExpanded ? 'rotate-90 text-[#c4622d]' : ''
                          }`}
                        />
                      </button>
                    </div>

                    <div
                      className={`grid transition-[grid-template-rows] duration-250 ease-out ${
                        collectionsExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className="pl-2.5 pb-1 flex flex-col gap-0.5 border-l-2 border-[#e8e4df] ml-1.5 mt-0.5">
                          <Link
                            to="/collections"
                            onClick={onClose}
                            className="py-1 px-1 text-[11.5px] font-semibold text-[#c4622d] hover:underline"
                          >
                            View All Collections →
                          </Link>
                          {collectionsList.map((col) => (
                            <Link
                              key={col.href}
                              to={col.href}
                              onClick={onClose}
                              className="py-1 px-1 text-[11.5px] text-[#686764] hover:text-[#c4622d] transition-colors"
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
                  <div key={item.label} className="py-1 flex flex-col">
                    <div className="flex items-center justify-between py-1.5 px-1 text-xs font-semibold uppercase tracking-wider text-[#1a1a1a]">
                      <Link to={item.href} onClick={onClose} className="hover:text-[#c4622d] transition-colors">
                        {item.label}
                      </Link>
                    </div>
                    <div className="pl-2.5 pb-1 flex flex-col gap-0.5 border-l-2 border-[#e8e4df] ml-1.5 mt-0.5">
                      {item.children?.map((subItem) => (
                        <Link
                          key={subItem.label}
                          to={subItem.href}
                          onClick={onClose}
                          className="py-1 px-1 text-[11.5px] text-[#686764] hover:text-[#c4622d] transition-colors"
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
                  className="py-2.5 px-1 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-[#1a1a1a] hover:text-[#c4622d] transition-colors group"
                >
                  <span>{item.label}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-[#afaba6] group-hover:translate-x-1 transition-transform" />
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer actions */}
        <div className="px-4 py-3 border-t border-[#e8e4df] flex flex-col gap-2 bg-[#f5f0e8]/70">
          {loggedIn ? (
            <>
              <Link
                to="/account"
                onClick={onClose}
                className="flex items-center gap-2 text-xs font-medium text-[#1a1a1a] hover:text-[#c4622d] py-1 transition-colors"
              >
                <User className="w-3.5 h-3.5 text-[#8b7355]" />
                <span>My Account</span>
              </Link>
              <Link
                to="/cart"
                onClick={onClose}
                className="flex items-center gap-2 text-xs font-medium text-[#1a1a1a] hover:text-[#c4622d] py-1 transition-colors"
              >
                <ShoppingBag className="w-3.5 h-3.5 text-[#8b7355]" />
                <span>View Shopping Cart</span>
              </Link>
            </>
          ) : (
            <div className="flex flex-col gap-2 pt-0.5">
              <Link
                to="/account/login"
                onClick={onClose}
                className="flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium border border-[#c4622d] text-[#c4622d] rounded-[5px] hover:bg-[#c4622d]/10 transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Login</span>
              </Link>
              <Link
                to="/account/register"
                onClick={onClose}
                className="flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold bg-[#c4622d] text-white rounded-[5px] hover:bg-[#923f12] shadow-xs transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Sign Up</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
