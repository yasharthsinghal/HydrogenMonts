import React from 'react';
import { NavLink } from '@remix-run/react';
import { clsx } from 'clsx';

export interface NavItem {
  label: string;
  href: string;
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Shop All', href: '/collections/all' },
  { label: 'Collections', href: '/collections' },
  { label: 'About Us', href: '/about' },
  { label: 'Contact', href: '/contact' },
  { label: 'Wholesale', href: '/wholesale' },
];

export const Navigation: React.FC = () => {
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
