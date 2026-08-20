import React, { useState } from 'react';
import { NavLink, Link } from '@remix-run/react';
import { clsx } from 'clsx';
import { ChevronDown } from 'lucide-react';

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

export const NAV_ITEMS: NavItem[] = [
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
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  return (
    <nav
      className="hidden md:flex items-center gap-8"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      {NAV_ITEMS.map((item) => {
        const hasChildren = Boolean(item.children && item.children.length > 0);

        if (hasChildren) {
          return (
            <div
              key={item.label}
              className="relative group"
              onMouseEnter={() => setActiveDropdown(item.label)}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <NavLink
                to={item.href}
                className={({ isActive }) =>
                  clsx(
                    'text-xs font-semibold uppercase tracking-[0.15em] transition-colors relative py-2 flex items-center gap-1 hover:text-[#c4622d]',
                    isActive || activeDropdown === item.label ? 'text-[#c4622d]' : 'text-[#1a1a1a]',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span>{item.label}</span>
                    <ChevronDown className="w-3.5 h-3.5 transition-transform duration-200 group-hover:rotate-180" />
                    {isActive && (
                      <span className="absolute bottom-0 inset-x-0 h-0.5 bg-[#c4622d] rounded-full" />
                    )}
                  </>
                )}
              </NavLink>

              {/* Dropdown Menu */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 w-64 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200 z-50">
                <div
                  className="p-3 bg-[#faf8f5] rounded-[6px] shadow-xl border border-[#e8e4df] flex flex-col gap-1"
                  style={{ backdropFilter: 'blur(8px)' }}
                >
                  {item.children?.map((subItem) => (
                    <Link
                      key={subItem.href + subItem.label}
                      to={subItem.href}
                      className="p-2.5 rounded-[4px] hover:bg-[#f0edea] transition-colors flex flex-col group/item"
                    >
                      <span className="text-xs font-semibold text-[#060505] group-hover/item:text-[#c4622d] transition-colors">
                        {subItem.label}
                      </span>
                      {subItem.description && (
                        <span className="text-[11px] text-[#686764] mt-0.5">
                          {subItem.description}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          );
        }

        return (
          <NavLink
            key={item.href}
            to={item.href}
            className={({ isActive }) =>
              clsx(
                'text-xs font-semibold uppercase tracking-[0.15em] transition-colors relative py-2 hover:text-[#c4622d]',
                isActive ? 'text-[#c4622d]' : 'text-[#1a1a1a]',
              )
            }
          >
            {({ isActive }) => (
              <>
                {item.label}
                {isActive && (
                  <span className="absolute bottom-0 inset-x-0 h-0.5 bg-[#c4622d] rounded-full" />
                )}
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
};

