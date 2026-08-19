import { useState, type ReactNode } from 'react';
import {
  CalendarDays,
  Check,
  CircleDashed,
  GitBranch,
  Layers,
  MessageSquare,
  Plus,
  Timer,
  User,
  X,
} from 'lucide-react';
import type { ChildItem, SyncEvent, Ticket, TicketStatus } from '../../types';
import { Drawer } from '../ui/Modal';
import { Badge, Button, ProgressBar } from '../ui/Primitives';
import { TICKET_STATUS_STYLES } from '../../lib/theme';
import { cn, daysBetween, formatDate, ticketProgress, timeAgo, uid } from '../../lib/utils';

const STATUSES: TicketStatus[] = ['Backlog', 'Todo', 'In Progress', 'Done'];

const CHILD_ICON = {
  Todo: CircleDashed,
  'In Progress': Timer,
  Done: Check,
} as const;

export function TicketDrawer({
  ticket,
  events,
  onClose,
  onStatusChange,
  onCycleChild,
  onAddChild,
}: {
  ticket: Ticket | null;
  events: SyncEvent[];
  onClose: () => void;
  onStatusChange: (id: string, status: TicketStatus) => void;
  onCycleChild: (ticketId: string, childId: string) => void;
  onAddChild: (ticketId: string, child: ChildItem) => void;
}) {
  const [newChild, setNewChild] = useState('');

  if (!ticket) return null;

  const progress = ticketProgress(ticket);
  const children = ticket.childItems ?? [];
  const style = TICKET_STATUS_STYLES[ticket.status];
  const ticketEvents = events.filter((event) => event.ticketId === ticket.id);

  const addChild = () => {
    const title = newChild.trim();
    if (!title) return;
    onAddChild(ticket.id, { id: uid('child'), title, status: 'Todo', type: 'Task' });
    setNewChild('');
  };

  return (
    <Drawer open={Boolean(ticket)} onClose={onClose} label={`${ticket.id} details`}>
      <header className="flex items-start justify-between gap-4 border-b border-slate-800 px-6 py-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[11px] text-slate-500">{ticket.id}</span>
            <Badge className={style.chip}>{ticket.status}</Badge>
            <Badge className="bg-slate-800/80 text-slate-300 ring-slate-700">{ticket.type}</Badge>
            {ticket.riceScore !== undefined ? (
              <Badge className="bg-indigo-500/10 text-indigo-300 ring-indigo-500/30">
                RICE {ticket.riceScore.toFixed(1)}
              </Badge>
            ) : null}
          </div>
          <h2 className="mt-2 text-base font-semibold leading-snug text-slate-100">{ticket.title}</h2>
          {ticket.description ? (
            <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{ticket.description}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close ticket details"
          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
        <section>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Status
          </p>
          <div className="grid grid-cols-4 gap-1.5">
            {STATUSES.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => onStatusChange(ticket.id, status)}
                className={cn(
                  'rounded-lg border px-2 py-2 text-[11px] font-medium transition-colors',
                  ticket.status === status
                    ? 'border-indigo-500/60 bg-indigo-500/10 text-indigo-200'
                    : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700',
                )}
              >
                {status}
              </button>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <Meta icon={<User className="h-3.5 w-3.5" />} label="Assignee" value={ticket.assignee} />
          <Meta
            icon={<Timer className="h-3.5 w-3.5" />}
            label="Last update"
            value={`${timeAgo(ticket.lastUpdate)}${ticket.updatedBy ? ` · ${ticket.updatedBy}` : ''}`}
          />
          <Meta
            icon={<CalendarDays className="h-3.5 w-3.5" />}
            label="Window"
            value={`${formatDate(ticket.startDate)} → ${formatDate(ticket.endDate)}`}
          />
          <Meta
            icon={<Layers className="h-3.5 w-3.5" />}
            label="Duration"
            value={`${daysBetween(ticket.startDate, ticket.endDate)} days`}
          />
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Progress
            </p>
            <span className="text-xs tabular-nums text-slate-300">{progress}%</span>
          </div>
          <ProgressBar value={progress} barClassName={style.bar} className="h-2" />
          <p className="mt-1.5 text-[11px] text-slate-500">
            {children.filter((c) => c.status === 'Done').length} of {children.length} child items
            complete
          </p>
        </section>

        <section>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Sub-tasks & epics
          </p>
          <ul className="space-y-1.5">
            {children.map((child) => {
              const Icon = CHILD_ICON[child.status];
              return (
                <li key={child.id}>
                  <button
                    type="button"
                    onClick={() => onCycleChild(ticket.id, child.id)}
                    className="flex w-full items-center gap-2.5 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2.5 text-left transition-colors hover:border-slate-700"
                  >
                    <Icon
                      className={cn(
                        'h-3.5 w-3.5 shrink-0',
                        child.status === 'Done'
                          ? 'text-emerald-400'
                          : child.status === 'In Progress'
                            ? 'text-amber-400'
                            : 'text-slate-600',
                      )}
                    />
                    <span
                      className={cn(
                        'min-w-0 flex-1 truncate text-xs',
                        child.status === 'Done' ? 'text-slate-500 line-through' : 'text-slate-300',
                      )}
                    >
                      {child.title}
                    </span>
                    <Badge className="bg-slate-800/80 text-slate-400 ring-slate-700">{child.type}</Badge>
                  </button>
                </li>
              );
            })}
            {children.length === 0 ? (
              <li className="rounded-lg border border-dashed border-slate-800 px-3 py-4 text-center text-[11px] text-slate-600">
                No child items yet.
              </li>
            ) : null}
          </ul>

          <div className="mt-2.5 flex items-center gap-2">
            <input
              value={newChild}
              onChange={(event) => setNewChild(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') addChild();
              }}
              placeholder="Add a sub-task…"
              className="min-w-0 flex-1 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:border-indigo-500/50 focus:outline-none"
            />
            <Button size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={addChild}>
              Add
            </Button>
          </div>
          <p className="mt-1.5 text-[10px] text-slate-600">
            Click a child item to cycle Todo → In Progress → Done.
          </p>
        </section>

        <section>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Activity from connected tools
          </p>
          {ticketEvents.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-800 px-3 py-4 text-center text-[11px] text-slate-600">
              No synced activity on this ticket yet.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {ticketEvents.slice(0, 10).map((event) => (
                <li key={event.id} className="flex gap-2.5">
                  {event.source === 'GitHub' ? (
                    <GitBranch className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-400" />
                  ) : (
                    <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  )}
                  <div className="min-w-0">
                    <p className="text-[11px] leading-relaxed text-slate-300">{event.message}</p>
                    <p className="text-[10px] text-slate-500">
                      {event.source} · {timeAgo(event.at)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Drawer>
  );
}

function Meta({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-500">
        {icon}
        {label}
      </p>
      <p className="mt-1 truncate text-xs text-slate-200">{value}</p>
    </div>
  );
}
