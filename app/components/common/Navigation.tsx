import React, { useState } from 'react';
import { NavLink, Link } from 'react-router';
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
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.href}
          to={item.href}
          end
          className={({ isActive }) =>
            clsx(
              'text-xs font-semibold uppercase tracking-[0.15em] transition-colors relative py-1 hover:text-[#c4622d]',
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
      ))}
    </nav>
  );
};

