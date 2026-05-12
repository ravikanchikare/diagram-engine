import * as React from 'react';
import { cn } from '@/lib/utils';

function EmptyState({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-lg border border-dashed bg-transparent p-3 text-left',
        className,
      )}
      data-slot="empty-state"
      {...props}
    />
  );
}

function EmptyStateHeader({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex flex-col gap-1.5', className)}
      data-slot="empty-state-header"
      {...props}
    />
  );
}

function EmptyStateTitle({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('text-sm font-medium text-foreground', className)}
      data-slot="empty-state-title"
      {...props}
    />
  );
}

function EmptyStateDescription({
  className,
  ...props
}: React.ComponentProps<'p'>) {
  return (
    <p
      className={cn('text-sm text-muted-foreground', className)}
      data-slot="empty-state-description"
      {...props}
    />
  );
}

function EmptyStateFooter({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex flex-col gap-2', className)}
      data-slot="empty-state-footer"
      {...props}
    />
  );
}

export {
  EmptyState,
  EmptyStateDescription,
  EmptyStateFooter,
  EmptyStateHeader,
  EmptyStateTitle,
};
