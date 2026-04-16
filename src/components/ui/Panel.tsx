import clsx from 'clsx';

interface PanelProps {
  open: boolean;
  direction?: 'left' | 'right';
  width?: string;
  children: React.ReactNode;
  className?: string;
}

export function Panel({
  open,
  direction = 'right',
  width = '320px',
  children,
  className,
}: PanelProps) {
  return (
    <div
      className={clsx(
        direction === 'right' ? 'panel-slide-right' : 'panel-slide-left',
        className,
      )}
      data-open={open}
      style={{
        position: 'fixed',
        top: 0,
        bottom: 0,
        zIndex: 40,
        width,
        ...(direction === 'right' ? { right: 0 } : { left: 0 }),
      }}
    >
      {children}
    </div>
  );
}
