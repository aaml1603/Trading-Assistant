'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { ArrowDown } from 'lucide-react';

const ConversationContext = React.createContext<{
  scrollToBottom: () => void;
}>({
  scrollToBottom: () => {},
});

export function Conversation({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const [showScrollButton, setShowScrollButton] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = React.useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  // Auto-scroll to bottom when content changes
  React.useEffect(() => {
    scrollToBottom();
  }, [children, scrollToBottom]);

  React.useEffect(() => {
    const handleScroll = () => {
      if (scrollRef.current && contentRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
        setShowScrollButton(!isNearBottom);
      }
    };

    const scrollElement = scrollRef.current;
    scrollElement?.addEventListener('scroll', handleScroll);
    return () => scrollElement?.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <ConversationContext.Provider value={{ scrollToBottom }}>
      <div className={cn('relative flex flex-col h-full min-h-0', className)} {...props}>
        <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto scroll-smooth">
          <div ref={contentRef}>{children}</div>
        </div>
        {showScrollButton && (
          <Button
            onClick={scrollToBottom}
            size="icon"
            className="absolute bottom-4 right-4 rounded-full shadow-lg"
            variant="secondary"
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
        )}
      </div>
    </ConversationContext.Provider>
  );
}

export function ConversationContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('px-4 py-6', className)} {...props}>
      {children}
    </div>
  );
}

export function ConversationScrollButton() {
  // This is now handled inside Conversation component
  return null;
}
