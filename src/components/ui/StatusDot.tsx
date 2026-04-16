import clsx from 'clsx';

interface StatusDotProps {
  status: 'ok' | 'warn' | 'error' | 'muted';
}

export function StatusDot({ status }: StatusDotProps) {
  return <span className={clsx('status-dot', `status-dot-${status}`)} />;
}
