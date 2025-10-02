'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { ExternalLink } from 'lucide-react';

export function Sources({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('space-y-2', className)} {...props}>
      {children}
    </div>
  );
}

export function SourcesTrigger({
  count,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  count: number;
}) {
  return (
    <button
      type="button"
      className={cn(
        'flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors',
        className
      )}
      {...props}
    >
      <ExternalLink className="h-3 w-3" />
      {count} {count === 1 ? 'source' : 'sources'}
    </button>
  );
}

export function SourcesContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('space-y-2', className)} {...props}>
      {children}
    </div>
  );
}

export function Source({
  href,
  title,
  className,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  title: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-xs hover:bg-muted transition-colors',
        className
      )}
      {...props}
    >
      <ExternalLink className="h-3 w-3 flex-shrink-0" />
      <span className="flex-1 truncate">{title}</span>
    </a>
  );
}
