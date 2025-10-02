'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

export function Message({
  from,
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  from: 'user' | 'assistant';
}) {
  return (
    <div
      className={cn(
        'flex gap-4',
        from === 'user' ? 'flex-row-reverse' : 'flex-row',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function MessageAvatar({
  src,
  name,
  className,
  ...props
}: React.ImgHTMLAttributes<HTMLImageElement> & {
  name: string;
}) {
  return (
    <div className={cn('flex-shrink-0', className)}>
      <img
        src={src}
        alt={name}
        className="h-8 w-8 rounded-full"
        {...props}
      />
    </div>
  );
}

export function MessageContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const content = typeof children === 'string' ? children : children;

  return (
    <div
      className={cn(
        'flex-1 space-y-2 overflow-hidden rounded-lg bg-muted px-4 py-3 text-sm',
        className
      )}
      {...props}
    >
      {typeof content === 'string' ? (
        <ReactMarkdown
          components={{
            h1: ({ children }) => <h1 className="text-xl font-bold mt-4 mb-2 first:mt-0">{children}</h1>,
            h2: ({ children }) => <h2 className="text-lg font-bold mt-3 mb-2 first:mt-0">{children}</h2>,
            h3: ({ children }) => <h3 className="text-base font-semibold mt-2 mb-1 first:mt-0">{children}</h3>,
            p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
            ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1 ml-2">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1 ml-2">{children}</ol>,
            li: ({ children }) => <li className="leading-relaxed">{children}</li>,
            code: ({ children, className }) => {
              const isBlock = className?.includes('language-');
              if (isBlock) {
                return <code className="block bg-black/10 dark:bg-white/10 p-3 rounded my-2 overflow-x-auto font-mono text-xs">{children}</code>;
              }
              return <code className="bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded font-mono text-xs">{children}</code>;
            },
            pre: ({ children }) => <pre className="mb-2 overflow-x-auto">{children}</pre>,
            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
            em: ({ children }) => <em className="italic">{children}</em>,
            blockquote: ({ children }) => <blockquote className="border-l-4 border-muted-foreground/30 pl-4 italic my-2 text-muted-foreground">{children}</blockquote>,
            hr: () => <hr className="my-4 border-muted-foreground/20" />,
            a: ({ children, href }) => <a href={href} className="text-primary underline hover:text-primary/80" target="_blank" rel="noopener noreferrer">{children}</a>,
          }}
        >
          {content}
        </ReactMarkdown>
      ) : (
        content
      )}
    </div>
  );
}
