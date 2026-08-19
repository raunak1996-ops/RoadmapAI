import { useState, type DragEvent } from 'react';
import { CalendarDays, GitBranch, MessageSquare, Rocket } from 'lucide-react';
import type { Ticket, TicketStatus } from '../../types';
import { Badge, ProgressBar } from '../ui/Primitives';
import { TICKET_STATUS_STYLES } from '../../lib/theme';
import { cn, formatShortDate, ticketProgress, timeAgo } from '../../lib/utils';

const COLUMNS: TicketStatus[] = ['Backlog', 'Todo', 'In Progress', 'Done'];

export function KanbanBoard({
  tickets,
  pulsedIds,
  onOpen,
  onMove,
}: {
  tickets: Ticket[];
  pulsedIds: string[];
  onOpen: (ticket: Ticket) => void;
  onMove: (id: string, status: TicketStatus) => void;
}) {
  const [dragging, setDragging] = useState<string | null>(null);
  const [hovered, setHovered] = useState<TicketStatus | null>(null);

  const onDrop = (event: DragEvent<HTMLDivElement>, status: TicketStatus) => {
    event.preventDefault();
    const id = event.dataTransfer.getData('text/plain') || dragging;
    setHovered(null);
    setDragging(null);
    if (!id) return;
    const ticket = tickets.find((t) => t.id === id);
    if (!ticket || ticket.status === status) return;
    onMove(id, status);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-4">
      {COLUMNS.map((status) => {
        const column = tickets.filter((ticket) => ticket.status === status);
        const style = TICKET_STATUS_STYLES[status];
        return (
          <div
            key={status}
            onDragOver={(event) => {
              event.preventDefault();
              setHovered(status);
            }}
            onDragLeave={() => setHovered((current) => (current === status ? null : current))}
            onDrop={(event) => onDrop(event, status)}
            className={cn(
              'flex min-h-[240px] flex-col rounded-2xl border p-3 transition-colors',
              hovered === status
                ? 'border-indigo-500/50 bg-indigo-500/5'
                : 'border-slate-800/80 bg-slate-950/40',
            )}
          >
            <div className="mb-3 flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className={cn('h-2 w-2 rounded-full', style.bar)} />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  {status}
                </h3>
              </div>
              <span className="rounded-full bg-slate-800 px-1.5 py-0.5 text-[10px] tabular-nums text-slate-400">
                {column.length}
              </span>
            </div>

            <div className="flex flex-1 flex-col gap-2.5">
              {column.map((ticket) => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  pulsing={pulsedIds.includes(ticket.id)}
                  dragging={dragging === ticket.id}
                  onOpen={onOpen}
                  onDragStart={(event) => {
                    event.dataTransfer.setData('text/plain', ticket.id);
                    event.dataTransfer.effectAllowed = 'move';
                    setDragging(ticket.id);
                  }}
                  onDragEnd={() => setDragging(null)}
                />
              ))}
              {column.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-800 px-3 py-6 text-center text-[11px] text-slate-600">
                  Drop a ticket here
                </p>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function TicketCard({
  ticket,
  pulsing,
  dragging,
  onOpen,
  onDragStart,
  onDragEnd,
}: {
  ticket: Ticket;
  pulsing: boolean;
  dragging: boolean;
  onOpen: (ticket: Ticket) => void;
  onDragStart: (event: DragEvent<HTMLElement>) => void;
  onDragEnd: () => void;
}) {
  const progress = ticketProgress(ticket);
  const style = TICKET_STATUS_STYLES[ticket.status];
  const initials = ticket.assignee
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2);

  return (
    <article
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={() => onOpen(ticket)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen(ticket);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Open ${ticket.id} ${ticket.title}`}
      className={cn(
        'cursor-grab rounded-xl border bg-slate-900/70 p-3 text-left transition-all active:cursor-grabbing',
        'hover:border-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
        dragging ? 'opacity-40' : 'opacity-100',
        pulsing
          ? 'border-cyan-400/70 ring-2 ring-cyan-400/40 shadow-[0_0_24px_-4px_rgba(34,211,238,0.5)]'
          : 'border-slate-800',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] text-slate-500">{ticket.id}</span>
        <div className="flex items-center gap-1.5">
          {ticket.riceScore !== undefined ? (
            <span className="rounded bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-indigo-300">
              {ticket.riceScore.toFixed(1)}
            </span>
          ) : null}
          <Badge className={style.chip}>{ticket.type === 'Initiative' ? 'Init' : 'Epic'}</Badge>
        </div>
      </div>

      <h4 className="mt-2 text-xs font-medium leading-snug text-slate-100">{ticket.title}</h4>

      <div className="mt-2.5 flex items-center gap-2">
        <ProgressBar value={progress} barClassName={style.bar} className="flex-1" />
        <span className="w-8 text-right text-[10px] tabular-nums text-slate-500">{progress}%</span>
      </div>

      {ticket.recentActivity ? (
        <div
          className={cn(
            'mt-2.5 flex items-start gap-1.5 rounded-lg px-2 py-1.5 transition-colors',
            pulsing ? 'bg-cyan-500/10' : 'bg-slate-950/60',
          )}
        >
          {ticket.updatedBy === 'GitHub' ? (
            <GitBranch className="mt-0.5 h-3 w-3 shrink-0 text-violet-400" />
          ) : ticket.updatedBy === 'Slack' ? (
            <MessageSquare className="mt-0.5 h-3 w-3 shrink-0 text-emerald-400" />
          ) : (
            <Rocket className="mt-0.5 h-3 w-3 shrink-0 text-slate-500" />
          )}
          <p className="line-clamp-2 text-[10px] leading-relaxed text-slate-400">
            {ticket.recentActivity}
          </p>
        </div>
      ) : null}

      <div className="mt-2.5 flex items-center justify-between border-t border-slate-800/70 pt-2.5">
        <div className="flex items-center gap-1.5">
          <span className="grid h-5 w-5 place-items-center rounded-full bg-slate-800 text-[9px] font-semibold text-slate-300">
            {initials}
          </span>
          <span className="text-[10px] text-slate-500">{timeAgo(ticket.lastUpdate)}</span>
        </div>
        <span className="flex items-center gap-1 text-[10px] text-slate-500">
          <CalendarDays className="h-3 w-3" />
          {formatShortDate(ticket.endDate)}
        </span>
      </div>
    </article>
  );
}
