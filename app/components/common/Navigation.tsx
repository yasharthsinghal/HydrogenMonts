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
  { label: 'Tote Bags', href: '/collections/tote-bags', description: 'Handblocked & quilted cotton tote bags' },
  { label: 'Pouch Bags (Toiletry Sets)', href: '/collections/pouch-bags-toiletry-sets', description: 'Organized multi-pouch bag sets' },
  { label: 'Mobile Sling Bags', href: '/collections/mobile-sling-bags', description: 'Handblocked cotton quilted cross-shoulder slings' },
  { label: 'Duffle Bags', href: '/collections/duffle-bags', description: 'Artisanal travel & duffle bags' },
  { label: 'Laptop Bags & Office', href: '/collections/laptop-bags-office-essentials', description: 'Quilted laptop bags & office essentials' },
  { label: 'Multi-Utility Organizers', href: '/collections/multi-utility-organizers', description: 'Vanity & tool organizers' },
  { label: 'Sunglasses Covers', href: '/collections/sunglasses-covers', description: 'Crochet & handblock print sunglass cases' },
  { label: 'Wallets & Clutches', href: '/collections/wallets-clutches', description: 'Structured cotton quilted clutches' },
  { label: 'Accessories', href: '/collections/accessories', description: 'Handblocked hankies & artisanal items' },
  { label: 'Kids\' Soft Toys', href: '/collections/kids-soft-toys', description: 'Handcrafted cotton Giraffe & Elephant toys' },
];

export const NAV_ITEMS: NavItem[] = [
  { label: 'Home', href: '/' },
  {
    label: 'Shop',
    href: '/collections/all',
    children: [
      { label: 'All Products', href: '/collections/all', description: 'Explore complete handcrafted catalog' },
      { label: 'Tote Bags', href: '/collections/tote-bags', description: 'Quilted & handblocked canvas totes' },
      { label: 'Pouch Bags & Toiletry Sets', href: '/collections/pouch-bags-toiletry-sets', description: 'Multi-utility pouch bag sets' },
      { label: 'Mobile Sling Bags', href: '/collections/mobile-sling-bags', description: 'Cross-shoulder slings & pouches' },
      { label: 'Duffle Bags', href: '/collections/duffle-bags', description: 'Artisanal weekenders & travel duffles' },
      { label: 'Laptop Bags & Office', href: '/collections/laptop-bags-office-essentials', description: 'Quilted laptop bags & work totes' },
      { label: 'Multi-Utility Organizers', href: '/collections/multi-utility-organizers', description: 'Vanity & tool organizers' },
      { label: 'Sunglasses Covers', href: '/collections/sunglasses-covers', description: 'Structured & crochet sunglass cases' },
      { label: 'Wallets & Clutches', href: '/collections/wallets-clutches', description: 'Handblocked cotton clutches' },
      { label: 'Accessories', href: '/collections/accessories', description: 'Hankies, caps & small goods' },
      { label: 'Kids\' Soft Toys', href: '/collections/kids-soft-toys', description: 'Handcrafted cotton soft toys' },
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
  const [isShopOpen, setIsShopOpen] = useState(false);
  const collectionsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shopTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  const handleCollectionsEnter = () => {
    if (collectionsTimeoutRef.current) clearTimeout(collectionsTimeoutRef.current);
    setIsCollectionsOpen(true);
  };

  const handleCollectionsLeave = () => {
    collectionsTimeoutRef.current = setTimeout(() => {
      setIsCollectionsOpen(false);
    }, 180);
  };

  const handleShopEnter = () => {
    if (shopTimeoutRef.current) clearTimeout(shopTimeoutRef.current);
    setIsShopOpen(true);
  };

  const handleShopLeave = () => {
    shopTimeoutRef.current = setTimeout(() => {
      setIsShopOpen(false);
    }, 180);
  };

  useEffect(() => {
    return () => {
      if (collectionsTimeoutRef.current) clearTimeout(collectionsTimeoutRef.current);
      if (shopTimeoutRef.current) clearTimeout(shopTimeoutRef.current);
    };
  }, []);

  const shopItem = NAV_ITEMS.find((item) => item.label === 'Shop');

  return (
    <nav
      className="hidden md:flex items-center gap-8"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      {NAV_ITEMS.map((item) => {
        if (item.label === 'Shop') {
          return (
            <div
              key={item.href}
              className="relative py-1"
              onMouseEnter={handleShopEnter}
              onMouseLeave={handleShopLeave}
            >
              <NavLink
                to={item.href}
                end
                className={({ isActive }) =>
                  clsx(
                    'text-xs font-semibold uppercase tracking-[0.15em] transition-colors relative py-1 hover:text-[#c4622d] flex items-center gap-1',
                    isActive || isShopOpen ? 'text-[#c4622d]' : 'text-[#1a1a1a]',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span>{item.label}</span>
                    <ChevronDown
                      className={clsx(
                        'w-3.5 h-3.5 transition-transform duration-200',
                        isShopOpen ? 'rotate-180 text-[#c4622d]' : 'text-[#8b7355]',
                      )}
                    />
                    {isActive && (
                      <span className="absolute bottom-0 inset-x-0 h-0.5 bg-[#c4622d] rounded-full" />
                    )}
                  </>
                )}
              </NavLink>

              {/* Shop Hover Dropdown Mega Menu */}
              <div
                className={`absolute top-full left-1/2 -translate-x-1/2 pt-2 z-50 transition-all duration-200 ease-out ${
                  isShopOpen
                    ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
                    : 'opacity-0 translate-y-2 scale-95 pointer-events-none'
                }`}
                style={{ width: '580px' }}
              >
                <div className="absolute -top-2 inset-x-0 h-3" />

                <div className="bg-[#faf8f5] border border-[#e8e4df] rounded-[8px] shadow-2xl p-6 text-left">
                  <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-[#e8e4df]">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8b7355] block">
                        Vastra By Monty Catalog
                      </span>
                      <h3
                        className="text-base font-bold text-[#060505] mt-0.5"
                        style={{ fontFamily: "'Playfair Display', serif" }}
                      >
                        Shop By Product Category
                      </h3>
                    </div>
                    <Link
                      to="/collections/all"
                      onClick={() => setIsShopOpen(false)}
                      className="text-xs font-semibold text-[#c4622d] hover:text-[#923f12] flex items-center gap-1 transition-colors"
                    >
                      <span>Explore All ({shopItem?.children?.length || 0})</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {shopItem?.children?.map((sub) => (
                      <Link
                        key={sub.href + sub.label}
                        to={sub.href}
                        onClick={() => setIsShopOpen(false)}
                        className="group/item flex items-center justify-between p-2.5 rounded-[6px] hover:bg-[#f0edea] transition-all border border-transparent hover:border-[#e8e4df]"
                      >
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-[#1a1a1a] group-hover/item:text-[#c4622d] transition-colors">
                            {sub.label}
                          </span>
                          {sub.description && (
                            <span className="text-[11px] text-[#686764] line-clamp-1 mt-0.5 font-normal">
                              {sub.description}
                            </span>
                          )}
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-[#afaba6] group-hover/item:text-[#c4622d] group-hover/item:translate-x-0.5 transition-all opacity-60 group-hover/item:opacity-100 flex-shrink-0 ml-2" />
                      </Link>
                    ))}
                  </div>

                  <div className="mt-4 pt-3.5 border-t border-[#e8e4df] flex items-center justify-between text-xs bg-[#f5f0e8]/60 -mx-6 -mb-6 p-4 rounded-b-[7px]">
                    <div className="flex items-center gap-1.5 text-[#8b7355] text-[11px]">
                      <Sparkles className="w-3.5 h-3.5 text-[#c4622d]" />
                      <span>Artisanal Rajasthan Craftsmanship &amp; Pure Long-Staple Fabrics</span>
                    </div>
                    <Link
                      to="/collections/all"
                      onClick={() => setIsShopOpen(false)}
                      className="text-[11px] font-semibold text-[#060505] hover:text-[#c4622d] transition-colors"
                    >
                      View Full Catalog →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          );
        }

        if (item.label === 'Collections') {
          return (
            <div
              key={item.href}
              className="relative py-1"
              onMouseEnter={handleCollectionsEnter}
              onMouseLeave={handleCollectionsLeave}
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
                <div className="absolute -top-2 inset-x-0 h-3" />

                <div className="bg-[#faf8f5] border border-[#e8e4df] rounded-[8px] shadow-2xl p-6 text-left">
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

