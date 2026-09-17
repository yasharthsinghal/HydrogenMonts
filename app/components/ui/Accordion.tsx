import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';

export interface AccordionItem {
  id: string;
  title: string;
  content: React.ReactNode;
}

export interface AccordionProps {
  items: AccordionItem[];
  defaultOpenId?: string;
  allowMultiple?: boolean;
  variant?: 'stacked' | 'tabs';
  className?: string;
}

export const Accordion: React.FC<AccordionProps> = ({
  items,
  defaultOpenId,
  allowMultiple = false,
  variant = 'stacked',
  className = '',
}) => {
  const [openIds, setOpenIds] = useState<string[]>(defaultOpenId ? [defaultOpenId] : []);

  const toggle = (id: string) => {
    if (allowMultiple) {
      setOpenIds((prev) =>
        prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
      );
    } else {
      setOpenIds((prev) => (prev.includes(id) ? [] : [id]));
    }
  };

  if (variant === 'tabs') {
    const activeId = openIds[0];
    const activeItem = items.find((item) => item.id === activeId);

    return (
      <div className={`border-y border-[#e8e4df] ${className}`} style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <div
          className="flex overflow-x-auto no-scrollbar border-b border-[#e8e4df]"
          role="tablist"
          aria-label="Product information"
        >
          {items.map((item) => {
            const isActive = item.id === activeId;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                id={`tab-${item.id}`}
                aria-controls={`panel-${item.id}`}
                aria-selected={isActive}
                onClick={() => setOpenIds((current) => current[0] === item.id ? [] : [item.id])}
                className={clsx(
                  'relative shrink-0 px-4 py-3 text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer',
                  isActive ? 'text-[#c4622d]' : 'text-[#686764] hover:text-[#060505]',
                )}
              >
                {item.title}
                {isActive ? <span className="absolute inset-x-3 bottom-0 h-0.5 bg-[#c4622d]" /> : null}
              </button>
            );
          })}
        </div>
        {activeItem ? (
          <div
            id={`panel-${activeItem.id}`}
            role="tabpanel"
            aria-labelledby={`tab-${activeItem.id}`}
            className="px-4 py-4 text-sm text-[#686764]"
            style={{ fontSize: '0.875rem', lineHeight: 1.65 }}
          >
            {activeItem.content}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className={`divide-y divide-[#e8e4df] border-y border-[#e8e4df] ${className}`} style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {items.map((item) => {
        const isOpen = openIds.includes(item.id);
        return (
          <div key={item.id} className="py-1">
            <button
              onClick={() => toggle(item.id)}
              className="w-full flex items-center justify-between py-4 text-left font-medium text-sm text-[#060505] hover:text-[#c4622d] transition-colors cursor-pointer"
              aria-expanded={isOpen}
            >
              <span>{item.title}</span>
              <ChevronDown
                className={clsx(
                  'w-4 h-4 text-[#686764] transition-transform duration-200',
                  isOpen && 'transform rotate-180 text-[#c4622d]',
                )}
              />
            </button>
            {isOpen && (
              <div
                className="pb-4 text-sm text-[#686764] leading-relaxed"
                style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.875rem', lineHeight: 1.65 }}
              >
                {item.content}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
