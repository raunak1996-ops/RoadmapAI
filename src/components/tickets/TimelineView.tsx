import { useMemo } from 'react';
import type { Ticket } from '../../types';
import { TICKET_STATUS_STYLES } from '../../lib/theme';
import { cn, formatShortDate, ticketProgress } from '../../lib/utils';

const DAY = 86_400_000;

/**
 * Lightweight Gantt: every bar is positioned as a percentage of the full
 * project window, so the chart reflows with the container instead of needing a
 * fixed pixel scale.
 */
export function TimelineView({
  tickets,
  pulsedIds,
  onOpen,
}: {
  tickets: Ticket[];
  pulsedIds: string[];
  onOpen: (ticket: Ticket) => void;
}) {
  const model = useMemo(() => {
    if (tickets.length === 0) return null;

    const starts = tickets.map((t) => new Date(t.startDate).getTime()).filter(Number.isFinite);
    const ends = tickets.map((t) => new Date(t.endDate).getTime()).filter(Number.isFinite);
    if (starts.length === 0 || ends.length === 0) return null;

    const min = Math.min(...starts) - 5 * DAY;
    const max = Math.max(...ends) + 5 * DAY;
    const span = Math.max(max - min, DAY);

    // Month gridlines across the window.
    const months: Array<{ label: string; left: number }> = [];
    const cursor = new Date(min);
    cursor.setDate(1);
    while (cursor.getTime() <= max) {
      const time = cursor.getTime();
      if (time >= min) {
        months.push({
          label: cursor.toLocaleDateString(undefined, { month: 'short', year: '2-digit' }),
          left: ((time - min) / span) * 100,
        });
      }
      cursor.setMonth(cursor.getMonth() + 1);
    }

    const todayLeft = ((Date.now() - min) / span) * 100;

    const rows = [...tickets]
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      .map((ticket) => {
        const start = new Date(ticket.startDate).getTime();
        const end = new Date(ticket.endDate).getTime();
        return {
          ticket,
          left: ((start - min) / span) * 100,
          width: Math.max(((end - start) / span) * 100, 2),
        };
      });

    return { months, rows, todayLeft };
  }, [tickets]);

  if (!model) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-800 px-6 py-14 text-center text-xs text-slate-500">
        No tickets to place on the timeline yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-800/80 bg-slate-950/40">
      <div className="min-w-[820px] p-4">
        <div className="flex">
          <div className="w-60 shrink-0" />
          <div className="relative h-6 flex-1">
            {model.months.map((month) => (
              <span
                key={month.label + month.left}
                className="absolute -translate-x-1/2 text-[10px] uppercase tracking-wider text-slate-500"
                style={{ left: `${month.left}%` }}
              >
                {month.label}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-1 space-y-1.5">
          {model.rows.map(({ ticket, left, width }) => {
            const style = TICKET_STATUS_STYLES[ticket.status];
            const progress = ticketProgress(ticket);
            const pulsing = pulsedIds.includes(ticket.id);
            return (
              <div key={ticket.id} className="group flex items-center">
                <button
                  type="button"
                  onClick={() => onOpen(ticket)}
                  className="w-60 shrink-0 truncate pr-4 text-left"
                >
                  <span className="font-mono text-[10px] text-slate-600">{ticket.id}</span>
                  <span className="ml-2 text-xs text-slate-300 group-hover:text-slate-100">
                    {ticket.title}
                  </span>
                </button>

                <div className="relative h-9 flex-1 rounded-lg bg-slate-900/40">
                  {model.months.map((month) => (
                    <span
                      key={`grid-${ticket.id}-${month.left}`}
                      className="absolute inset-y-0 w-px bg-slate-800/60"
                      style={{ left: `${month.left}%` }}
                      aria-hidden="true"
                    />
                  ))}

                  <span
                    className="absolute inset-y-0 z-10 w-px bg-rose-400/70"
                    style={{ left: `${model.todayLeft}%` }}
                    aria-hidden="true"
                  />

                  <button
                    type="button"
                    onClick={() => onOpen(ticket)}
                    title={`${ticket.title} — ${formatShortDate(ticket.startDate)} to ${formatShortDate(ticket.endDate)}`}
                    className={cn(
                      'absolute top-1.5 flex h-6 items-center overflow-hidden rounded-md px-2 text-[10px] font-medium text-slate-950 transition-all',
                      style.bar,
                      pulsing ? 'ring-2 ring-cyan-300 ring-offset-2 ring-offset-slate-950' : '',
                    )}
                    style={{ left: `${left}%`, width: `${width}%` }}
                  >
                    <span
                      className="absolute inset-y-0 right-0 bg-slate-950/30"
                      style={{ width: `${100 - progress}%` }}
                      aria-hidden="true"
                    />
                    <span className="relative truncate">{progress}%</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-slate-800 pt-3 text-[10px] text-slate-500">
          {Object.entries(TICKET_STATUS_STYLES).map(([status, style]) => (
            <span key={status} className="flex items-center gap-1.5">
              <span className={cn('h-2 w-4 rounded-sm', style.bar)} />
              {status}
            </span>
          ))}
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-px bg-rose-400/70" />
            Today
          </span>
        </div>
      </div>
    </div>
  );
}
