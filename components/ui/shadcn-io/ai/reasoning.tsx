'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

export function Reasoning({
  isStreaming,
  defaultOpen = false,
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  isStreaming?: boolean;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  return (
    <div className={cn('space-y-2', className)} {...props}>
      {children}
    </div>
  );
}

export function ReasoningTrigger({
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        'flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors',
        className
      )}
      {...props}
    >
      <ChevronDown className="h-3 w-3" />
      View reasoning
    </button>
  );
}

export function ReasoningContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-lg border bg-muted/50 px-3 py-2 text-xs text-muted-foreground',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
