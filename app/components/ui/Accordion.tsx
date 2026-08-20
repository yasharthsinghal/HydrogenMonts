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
  className?: string;
}

export const Accordion: React.FC<AccordionProps> = ({
  items,
  defaultOpenId,
  allowMultiple = false,
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
                style={{ fontFamily: "'Cormorant', serif", fontSize: '1.15rem' }}
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
