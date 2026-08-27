import React from 'react';
import { Link } from 'react-router';
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
  // If the caller already included "Home" as the first item, deduplicate it so "Home > Home" never happens
  const filteredItems =
    items.length > 0 && (items[0].label.toLowerCase() === 'home' || items[0].href === '/')
      ? items.slice(1)
      : items;

  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex items-center space-x-1.5 text-xs text-[#686764] ${className}`}
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      <Link to="/" className="hover:text-[#c4622d] transition-colors">
        Home
      </Link>
      {filteredItems.map((item, index) => {
        const isLast = index === filteredItems.length - 1;
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
