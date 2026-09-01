import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Link, useRouteLoaderData } from 'react-router';
import { clsx } from 'clsx';
import { ChevronDown, ArrowRight, Sparkles } from 'lucide-react';
import type { CollectionCardItem } from '~/types/storefront.types';

export interface NavSubItem {
  label: string;
  href: string;
  description?: string;
}

export interface NavItem {
  label: string;
  href: string;
  children?: NavSubItem[];
}

export const DEFAULT_COLLECTIONS: NavSubItem[] = [
  { label: 'T-Shirts', href: '/collections/monts-t-shirts', description: 'Everyday, oversized & graphic luxury tees' },
  { label: 'Shirts', href: '/collections/monts-shirts', description: 'Casual & premium artisanal shirts' },
  { label: 'Hoodies', href: '/collections/monts-hoodies', description: 'Minimal & heavyweight cotton hoodies' },
  { label: 'Pants & Joggers', href: '/collections/monts-pants-and-joggers', description: 'Tailored everyday bottom wear' },
  { label: 'Jackets & Overshirts', href: '/collections/monts-jackets-and-overshirts', description: 'Layering outerwear & utility overshirts' },
  { label: 'Footwear', href: '/collections/monts-footwear', description: 'Handcrafted minimal footwear' },
  { label: 'Bags', href: '/collections/monts-bags', description: 'Canvas totes & artisanal backpacks' },
  { label: 'Accessories', href: '/collections/monts-accessories', description: 'Caps, belts, wallets & scarves' },
];

export const NAV_ITEMS: NavItem[] = [
  { label: 'Home', href: '/' },
  {
    label: 'Shop',
    href: '/collections/all',
    children: [
      { label: 'All Products', href: '/collections/all', description: 'Explore our complete handcrafted catalog' },
      { label: 'Curated Series', href: '/collections', description: 'Hand-block prints & artisanal series' },
      { label: 'Ready-to-Wear', href: '/collections/all', description: 'Limited batch luxury silhouettes' },
    ],
  },
  { label: 'Collections', href: '/collections' },
  { label: 'About Us', href: '/about' },
  { label: 'Contact', href: '/contact' },
  { label: 'Wholesale', href: '/wholesale' },
];

export const Navigation: React.FC = () => {
  const rootData = useRouteLoaderData<{ collections?: CollectionCardItem[] }>('root');
  const [isCollectionsOpen, setIsCollectionsOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Compute all available collections (Shopify dynamic list with curated defaults fallback)
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

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsCollectionsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsCollectionsOpen(false);
    }, 180);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <nav
      className="hidden md:flex items-center gap-8"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      {NAV_ITEMS.map((item) => {
        if (item.label === 'Collections') {
          return (
            <div
              key={item.href}
              className="relative py-2"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <NavLink
                to={item.href}
                end
                className={({ isActive }) =>
                  clsx(
                    'text-xs font-semibold uppercase tracking-[0.15em] transition-colors relative py-1 hover:text-[#c4622d] flex items-center gap-1',
                    isActive || isCollectionsOpen ? 'text-[#c4622d]' : 'text-[#1a1a1a]',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span>{item.label}</span>
                    <ChevronDown
                      className={clsx(
                        'w-3.5 h-3.5 transition-transform duration-200',
                        isCollectionsOpen ? 'rotate-180 text-[#c4622d]' : 'text-[#8b7355]',
                      )}
                    />
                    {isActive && (
                      <span className="absolute bottom-0 inset-x-0 h-0.5 bg-[#c4622d] rounded-full" />
                    )}
                  </>
                )}
              </NavLink>

              {/* Collections Hover Dropdown Mega Menu */}
              <div
                className={`absolute top-full left-1/2 -translate-x-1/2 pt-2 z-50 transition-all duration-200 ease-out ${
                  isCollectionsOpen
                    ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
                    : 'opacity-0 translate-y-2 scale-95 pointer-events-none'
                }`}
                style={{ width: '560px' }}
              >
                {/* Invisible hover bridge to prevent flickering when cursor moves across gap */}
                <div className="absolute -top-2 inset-x-0 h-3" />

                <div className="bg-[#faf8f5] border border-[#e8e4df] rounded-[8px] shadow-2xl p-6 text-left">
                  {/* Header */}
                  <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-[#e8e4df]">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8b7355] block">
                        Artisanal Series
                      </span>
                      <h3
                        className="text-base font-bold text-[#060505] mt-0.5"
                        style={{ fontFamily: "'Playfair Display', serif" }}
                      >
                        All Curated Collections
                      </h3>
                    </div>
                    <Link
                      to="/collections"
                      onClick={() => setIsCollectionsOpen(false)}
                      className="text-xs font-semibold text-[#c4622d] hover:text-[#923f12] flex items-center gap-1 transition-colors"
                    >
                      <span>View All Directory</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  {/* Collections Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    {collectionsList.map((col) => (
                      <Link
                        key={col.href}
                        to={col.href}
                        onClick={() => setIsCollectionsOpen(false)}
                        className="group/item flex items-center justify-between p-2.5 rounded-[6px] hover:bg-[#f0edea] transition-all border border-transparent hover:border-[#e8e4df]"
                      >
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-[#1a1a1a] group-hover/item:text-[#c4622d] transition-colors">
                            {col.label}
                          </span>
                          {col.description && (
                            <span className="text-[11px] text-[#686764] line-clamp-1 mt-0.5 font-normal">
                              {col.description}
                            </span>
                          )}
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-[#afaba6] group-hover/item:text-[#c4622d] group-hover/item:translate-x-0.5 transition-all opacity-60 group-hover/item:opacity-100 flex-shrink-0 ml-2" />
                      </Link>
                    ))}
                  </div>

                  {/* Bottom Footer Bar */}
                  <div className="mt-4 pt-3.5 border-t border-[#e8e4df] flex items-center justify-between text-xs bg-[#f5f0e8]/60 -mx-6 -mb-6 p-4 rounded-b-[7px]">
                    <div className="flex items-center gap-1.5 text-[#8b7355] text-[11px]">
                      <Sparkles className="w-3.5 h-3.5 text-[#c4622d]" />
                      <span>Handcrafted in Jaipur &amp; Pure Cotton Silhouettes</span>
                    </div>
                    <Link
                      to="/collections/all"
                      onClick={() => setIsCollectionsOpen(false)}
                      className="text-[11px] font-semibold text-[#060505] hover:text-[#c4622d] transition-colors"
                    >
                      Shop All Products →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          );
        }

        return (
          <NavLink
            key={item.href}
            to={item.href}
            end
            className={({ isActive }) =>
              clsx(
                'text-xs font-semibold uppercase tracking-[0.15em] transition-colors relative py-1 hover:text-[#c4622d] group/nav',
                isActive ? 'text-[#c4622d]' : 'text-[#1a1a1a]',
              )
            }
          >
            {({ isActive }) => (
              <>
                <span>{item.label}</span>
                <span
                  className={clsx(
                    'absolute bottom-0 inset-x-0 h-0.5 bg-[#c4622d] rounded-full transition-all duration-200',
                    isActive
                      ? 'scale-x-100 opacity-100'
                      : 'scale-x-0 opacity-0 group-hover/nav:scale-x-100 group-hover/nav:opacity-100',
                  )}
                />
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
};

