'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export function Loader({ size = 16, className, ...props }: React.HTMLAttributes<HTMLDivElement> & { size?: number }) {
  return (
    <div className={cn('inline-flex items-center gap-1', className)} {...props}>
      <div
        className="animate-bounce rounded-full bg-current"
        style={{
          width: size,
          height: size,
          animationDelay: '0ms',
          animationDuration: '600ms',
        }}
      />
      <div
        className="animate-bounce rounded-full bg-current"
        style={{
          width: size,
          height: size,
          animationDelay: '150ms',
          animationDuration: '600ms',
        }}
      />
      <div
        className="animate-bounce rounded-full bg-current"
        style={{
          width: size,
          height: size,
          animationDelay: '300ms',
          animationDuration: '600ms',
        }}
      />
    </div>
  );
}
