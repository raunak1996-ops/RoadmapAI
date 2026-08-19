import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { useApp } from '../../state/AppContext';
import { cn } from '../../lib/utils';

const TONE = {
  info: { icon: Info, ring: 'ring-cyan-500/30', text: 'text-cyan-300' },
  success: { icon: CheckCircle2, ring: 'ring-emerald-500/30', text: 'text-emerald-300' },
  warning: { icon: AlertTriangle, ring: 'ring-amber-500/30', text: 'text-amber-300' },
  error: { icon: XCircle, ring: 'ring-rose-500/30', text: 'text-rose-300' },
} as const;

export function Toasts() {
  const { toasts, dismissToast } = useApp();
  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[60] flex w-80 flex-col gap-2">
      {toasts.map((toast) => {
        const tone = TONE[toast.tone];
        const Icon = tone.icon;
        return (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/95',
              'px-3.5 py-3 shadow-xl shadow-slate-950/60 ring-1 ring-inset backdrop-blur',
              tone.ring,
            )}
          >
            <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', tone.text)} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-100">{toast.title}</p>
              {toast.description ? (
                <p className="mt-0.5 line-clamp-3 text-[11px] leading-relaxed text-slate-400">
                  {toast.description}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss notification"
              className="rounded p-0.5 text-slate-500 transition-colors hover:text-slate-300"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
