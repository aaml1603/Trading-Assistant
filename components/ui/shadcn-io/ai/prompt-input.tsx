'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Send, Square } from 'lucide-react';

export function PromptInput({
  onSubmit,
  className,
  children,
  ...props
}: React.FormHTMLAttributes<HTMLFormElement>) {
  return (
    <form
      onSubmit={onSubmit}
      className={cn('space-y-4', className)}
      {...props}
    >
      {children}
    </form>
  );
}

export function PromptInputTextarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const form = e.currentTarget.form;
      if (form) {
        form.requestSubmit();
      }
    }
    // Call original onKeyDown if provided
    if (props.onKeyDown) {
      props.onKeyDown(e);
    }
  };

  return (
    <textarea
      className={cn(
        'min-h-[80px] w-full resize-none rounded-lg border border-input bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
      onKeyDown={handleKeyDown}
    />
  );
}

export function PromptInputToolbar({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex items-center justify-between gap-2', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function PromptInputTools({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex items-center gap-2', className)} {...props}>
      {children}
    </div>
  );
}

export function PromptInputButton({
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn('h-8 gap-2', className)}
      {...props}
    >
      {children}
    </Button>
  );
}

export function PromptInputSubmit({
  status = 'ready',
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  status?: 'ready' | 'streaming';
}) {
  return (
    <Button
      type="submit"
      size="sm"
      className={cn('h-8 gap-2', className)}
      {...props}
    >
      {status === 'streaming' ? (
        <>
          <Square className="h-4 w-4" />
          Stop
        </>
      ) : (
        <>
          <Send className="h-4 w-4" />
          Send
        </>
      )}
    </Button>
  );
}

export function PromptInputModelSelect({
  value,
  onValueChange,
  disabled,
  children,
}: {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      {children}
    </Select>
  );
}

export function PromptInputModelSelectTrigger({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <SelectTrigger className={cn('h-8 w-[180px]', className)}>
      {children}
    </SelectTrigger>
  );
}

export function PromptInputModelSelectValue() {
  return <SelectValue />;
}

export function PromptInputModelSelectContent({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SelectContent>{children}</SelectContent>;
}

export function PromptInputModelSelectItem({
  value,
  children,
}: {
  value: string;
  children: React.ReactNode;
}) {
  return <SelectItem value={value}>{children}</SelectItem>;
}
