import React from 'react';
import { cn } from '@/lib/utils';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ children, className, header, footer, padding = 'md', onClick }, ref) => {
    const paddingSizes = {
      none: '',
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6',
    };

    const isClickable = Boolean(onClick);

    return (
      <div
        ref={ref}
        className={cn(
          'bg-white rounded-lg border border-gray-200 shadow-sm',
          isClickable && 'cursor-pointer transition-shadow duration-200 hover:shadow-md',
          className
        )}
        onClick={onClick}
        role={isClickable ? 'button' : undefined}
        tabIndex={isClickable ? 0 : undefined}
        onKeyDown={
          isClickable
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onClick?.();
                }
              }
            : undefined
        }
      >
        {header && (
          <div className={cn('border-b border-gray-200', paddingSizes[padding])}>
            {header}
          </div>
        )}
        <div className={cn(header || footer ? paddingSizes[padding] : paddingSizes[padding])}>
          {children}
        </div>
        {footer && (
          <div className={cn('border-t border-gray-200 bg-gray-50', paddingSizes[padding])}>
            {footer}
          </div>
        )}
      </div>
    );
  }
);

Card.displayName = 'Card';

export default Card;
