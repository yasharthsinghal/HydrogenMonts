import React from 'react';
import { Link } from '@remix-run/react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionText?: string;
  actionHref?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionText,
  actionHref,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 md:p-12 max-w-md mx-auto">
      {icon && (
        <div className="w-14 h-14 rounded-full bg-[#f0edea] text-[#8b7355] flex items-center justify-center mb-4">
          {icon}
        </div>
      )}
      <h3
        className="text-xl font-bold text-[#060505] mb-2"
        style={{ fontFamily: "'Playfair Display', serif" }}
      >
        {title}
      </h3>
      <p
        className="text-sm text-[#686764] mb-6 leading-relaxed"
        style={{ fontFamily: "'Cormorant', serif", fontSize: '1.1rem' }}
      >
        {description}
      </p>
      {actionText && (
        actionHref ? (
          <Link to={actionHref}>
            <Button variant="primary">{actionText}</Button>
          </Link>
        ) : (
          <Button variant="primary" onClick={onAction}>
            {actionText}
          </Button>
        )
      )}
    </div>
  );
};
