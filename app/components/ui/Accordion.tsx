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
  onOpenChange?: (openIds: string[]) => void;
}

export const Accordion: React.FC<AccordionProps> = ({
  items,
  defaultOpenId,
  allowMultiple = false,
  variant = 'stacked',
  className = '',
  onOpenChange,
}) => {
  const [openIds, setOpenIds] = useState<string[]>(defaultOpenId ? [defaultOpenId] : []);

  const toggle = (id: string) => {
    setOpenIds((prev) => {
      const next = allowMultiple
        ? prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        : prev.includes(id) ? [] : [id];
      onOpenChange?.(next);
      return next;
    });
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
                onClick={() => setOpenIds((current) => {
                  const next = current[0] === item.id ? [] : [item.id];
                  onOpenChange?.(next);
                  return next;
                })}
                className={clsx(
                  'relative shrink-0 px-3.5 py-2.5 text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer',
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
            className="px-2 py-3 text-xs sm:text-sm text-[#686764]"
            style={{ lineHeight: 1.5 }}
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
          <div key={item.id} className="py-0.5">
            <button
              onClick={() => toggle(item.id)}
              className="w-full flex items-center justify-between py-2.5 text-left font-medium text-xs sm:text-sm text-[#060505] hover:text-[#c4622d] transition-colors cursor-pointer"
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
                className="pb-3 text-xs sm:text-sm text-[#686764] leading-normal"
                style={{ fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5 }}
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
