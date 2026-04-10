'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface CreditsBadgeProps {
  credits: number;
  maxCredits?: number;
  showWarning?: boolean;
  warningThreshold?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const CreditsBadge: React.FC<CreditsBadgeProps> = ({
  credits,
  maxCredits,
  showWarning = true,
  warningThreshold = 20,
  size = 'md',
  className,
}) => {
  const percentage = maxCredits ? (credits / maxCredits) * 100 : 100;
  const isLow = credits <= warningThreshold;
  const isCritical = credits <= warningThreshold / 2;

  const sizes = {
    sm: {
      badge: 'px-2 py-1 text-xs',
      icon: 'w-3 h-3',
      text: 'text-xs',
    },
    md: {
      badge: 'px-3 py-1.5 text-sm',
      icon: 'w-4 h-4',
      text: 'text-sm',
    },
    lg: {
      badge: 'px-4 py-2 text-base',
      icon: 'w-5 h-5',
      text: 'text-base',
    },
  };

  const getBackgroundColor = () => {
    if (isCritical) return 'bg-red-100 border-red-300';
    if (isLow) return 'bg-yellow-100 border-yellow-300';
    return 'bg-green-100 border-green-300';
  };

  const getTextColor = () => {
    if (isCritical) return 'text-red-800';
    if (isLow) return 'text-yellow-800';
    return 'text-green-800';
  };

  const getIconColor = () => {
    if (isCritical) return 'text-red-600';
    if (isLow) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full border font-medium transition-colors duration-200',
        getBackgroundColor(),
        getTextColor(),
        sizes[size].badge,
        className
      )}
      role="status"
      aria-label={`${credits} credits remaining`}
    >
      <svg
        className={cn(sizes[size].icon, getIconColor())}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z"
          clipRule="evenodd"
        />
      </svg>
      
      <span className={cn('font-semibold', sizes[size].text)}>
        {credits.toLocaleString()}
      </span>
      
      {maxCredits && (
        <span className={cn('opacity-70', sizes[size].text)}>
          / {maxCredits.toLocaleString()}
        </span>
      )}

      {showWarning && (isLow || isCritical) && (
        <svg
          className={cn(sizes[size].icon, isCritical ? 'text-red-600' : 'text-yellow-600', 'animate-pulse')}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-label={isCritical ? 'Critical: credits very low' : 'Warning: credits running low'}
        >
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
      )}

      {maxCredits && (
        <div className="relative w-12 h-1 bg-gray-200 rounded-full overflow-hidden ml-1">
          <div
            className={cn(
              'absolute inset-y-0 left-0 rounded-full transition-all duration-300',
              isCritical ? 'bg-red-600' : isLow ? 'bg-yellow-600' : 'bg-green-600'
            )}
            style={{ width: `${Math.min(percentage, 100)}%` }}
            role="progressbar"
            aria-valuenow={credits}
            aria-valuemin={0}
            aria-valuemax={maxCredits}
          />
        </div>
      )}
    </div>
  );
};

export { CreditsBadge };
export default CreditsBadge;
