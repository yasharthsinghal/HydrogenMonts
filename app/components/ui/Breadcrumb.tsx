import React from 'react';
import { Link } from '@remix-run/react';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, className = '' }) => {
  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex items-center space-x-1.5 text-xs text-[#686764] ${className}`}
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      <Link to="/" className="hover:text-[#c4622d] transition-colors">
        Home
      </Link>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={index}>
            <ChevronRight className="w-3.5 h-3.5 text-[#afaba6] shrink-0" />
            {isLast || !item.href ? (
              <span className="text-[#060505] font-medium truncate" aria-current="page">
                {item.label}
              </span>
            ) : (
              <Link to={item.href} className="hover:text-[#c4622d] transition-colors truncate">
                {item.label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
