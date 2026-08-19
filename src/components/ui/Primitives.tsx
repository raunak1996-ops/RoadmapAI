import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

/* --------------------------------- Card --------------------------------- */

export function Card({
  children,
  className,
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-800/80 bg-slate-900/60 shadow-lg shadow-slate-950/40 backdrop-blur',
        padded && 'p-5',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  icon,
  action,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        {icon ? (
          <span className="mt-0.5 rounded-lg bg-slate-800/80 p-2 text-indigo-300">{icon}</span>
        ) : null}
        <div>
          <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
          {subtitle ? <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p> : null}
        </div>
      </div>
      {action}
    </div>
  );
}

/* -------------------------------- Button -------------------------------- */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
type ButtonSize = 'sm' | 'md';

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-indigo-500 text-white hover:bg-indigo-400 focus-visible:outline-indigo-400 disabled:bg-indigo-500/40',
  secondary:
    'bg-slate-800 text-slate-100 hover:bg-slate-700 ring-1 ring-inset ring-slate-700 focus-visible:outline-slate-500',
  ghost: 'bg-transparent text-slate-300 hover:bg-slate-800/70 focus-visible:outline-slate-600',
  danger: 'bg-rose-500/90 text-white hover:bg-rose-500 focus-visible:outline-rose-400',
  success: 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 focus-visible:outline-emerald-400',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'px-2.5 py-1.5 text-xs gap-1.5',
  md: 'px-3.5 py-2 text-sm gap-2',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  icon,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-medium transition-colors',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-60',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : icon}
      {children}
    </button>
  );
}

/* --------------------------------- Badge -------------------------------- */

export function Badge({
  children,
  className,
  dot,
}: {
  children: ReactNode;
  className?: string;
  dot?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset',
        className ?? 'bg-slate-500/10 text-slate-300 ring-slate-500/30',
      )}
    >
      {dot ? (
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: dot }} />
      ) : null}
      {children}
    </span>
  );
}

/* ------------------------------- Progress ------------------------------- */

export function ProgressBar({
  value,
  className,
  barClassName,
}: {
  value: number;
  className?: string;
  barClassName?: string;
}) {
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-slate-800', className)}>
      <div
        className={cn('h-full rounded-full transition-all duration-500', barClassName ?? 'bg-indigo-500')}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

/* ------------------------------ Empty state ----------------------------- */

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 px-6 py-12 text-center">
      <span className="rounded-xl bg-slate-800/70 p-3 text-slate-400">{icon}</span>
      <h4 className="mt-4 text-sm font-semibold text-slate-200">{title}</h4>
      <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-400">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

/* -------------------------------- Skeleton ------------------------------ */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-slate-800/70', className)} />;
}

/* --------------------------------- Stat --------------------------------- */

export function Stat({
  label,
  value,
  hint,
  icon,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
  tone?: 'default' | 'positive' | 'warning' | 'critical';
}) {
  const toneClass =
    tone === 'positive'
      ? 'text-emerald-300'
      : tone === 'warning'
        ? 'text-amber-300'
        : tone === 'critical'
          ? 'text-rose-300'
          : 'text-slate-100';

  return (
    <Card className="relative overflow-hidden">
      <div className="flex items-start justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{label}</p>
        {icon ? <span className="text-slate-500">{icon}</span> : null}
      </div>
      <p className={cn('mt-3 text-2xl font-semibold tabular-nums', toneClass)}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
    </Card>
  );
}
