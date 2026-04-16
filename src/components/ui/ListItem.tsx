import clsx from 'clsx';
import { forwardRef } from 'react';

interface ListItemProps {
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const ListItem = forwardRef<HTMLDivElement, ListItemProps>(
  ({ selected, onClick, disabled, children, className }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx('list-item', className)}
        data-selected={selected ?? false}
        onClick={disabled ? undefined : onClick}
        aria-disabled={disabled}
        style={disabled ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
      >
        {children}
      </div>
    );
  },
);

ListItem.displayName = 'ListItem';
